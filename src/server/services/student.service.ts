import type { Session } from "next-auth";
import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError, BadRequestError } from "@/lib/api-utils";
import { dayBeforeUtc } from "@/lib/time";
import type {
  CreateStudentInput,
  UpdateStudentInput,
  ChangeEnrollmentInput,
} from "@/lib/validation/student";

const STUDENT_INCLUDE = {
  parentContacts: true,
  department: true,
  regulation: true,
  enrollments: {
    where: { status: "ACTIVE" as const },
    include: { class: true, semester: true },
  },
} as const;

export async function listStudents(session: Session, filters: { departmentId?: string; classId?: string } = {}) {
  const scope = adminDepartmentScope(session);
  if (filters.departmentId && !canAccessDepartment(session, filters.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  const departmentFilter =
    filters.departmentId != null
      ? { departmentId: filters.departmentId }
      : scope === "ALL"
        ? {}
        : { departmentId: { in: scope } };

  return prisma.student.findMany({
    where: {
      ...departmentFilter,
      ...(filters.classId ? { enrollments: { some: { classId: filters.classId, status: "ACTIVE" } } } : {}),
    },
    include: STUDENT_INCLUDE,
    orderBy: { rollNumber: "asc" },
  });
}

export async function getStudent(session: Session, id: string) {
  const student = await prisma.student.findUnique({ where: { id }, include: STUDENT_INCLUDE });
  if (!student) throw new NotFoundError("Student not found");
  if (!canAccessDepartment(session, student.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  return student;
}

export async function createStudent(
  session: Session,
  input: CreateStudentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!canAccessDepartment(session, input.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const cls = await prisma.class.findUnique({ where: { id: input.enrollment.classId } });
  if (!cls) throw new BadRequestError("Enrollment class not found");
  if (cls.departmentId !== input.departmentId) {
    throw new BadRequestError("Enrollment class does not belong to the student's department");
  }
  const semester = await prisma.semester.findUnique({ where: { id: input.enrollment.semesterId } });
  if (!semester) throw new BadRequestError("Enrollment semester not found");

  const [dupRoll, dupReg, existingUser] = await Promise.all([
    prisma.student.findUnique({ where: { rollNumber: input.rollNumber } }),
    input.registerNumber
      ? prisma.student.findUnique({ where: { registerNumber: input.registerNumber } })
      : null,
    prisma.user.findUnique({ where: { email: input.email } }),
  ]);
  if (dupRoll) throw new ConflictError(`Roll number ${input.rollNumber} already exists`);
  if (dupReg) throw new ConflictError(`Register number ${input.registerNumber} already exists`);
  if (existingUser?.status === "INACTIVE") {
    throw new ConflictError("A deactivated account already exists for this email");
  }
  if (existingUser) {
    const existingStudent = await prisma.student.findUnique({ where: { userId: existingUser.id } });
    if (existingStudent) throw new ConflictError("This email is already registered as a student");
  }

  return prisma.$transaction(async (tx) => {
    const user = existingUser ?? (await tx.user.create({ data: { email: input.email, status: "ACTIVE" } }));

    const student = await tx.student.create({
      data: {
        userId: user.id,
        rollNumber: input.rollNumber,
        registerNumber: input.registerNumber,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        address: input.address,
        mobileNumber: input.mobileNumber,
        departmentId: input.departmentId,
        regulationId: input.regulationId,
        batchLabel: input.batchLabel,
        admissionType: input.admissionType,
      },
    });

    await tx.parentContact.createMany({
      data: input.parentContacts.map((p) => ({ ...p, studentId: student.id })),
    });

    await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        classId: input.enrollment.classId,
        semesterId: input.enrollment.semesterId,
        effectiveFrom: input.enrollment.effectiveFrom,
        status: "ACTIVE",
      },
    });

    const existingRole = await tx.userRole.findFirst({
      where: { userId: user.id, role: RoleName.STUDENT, departmentId: input.departmentId },
    });
    if (!existingRole) {
      await tx.userRole.create({
        data: { userId: user.id, role: RoleName.STUDENT, departmentId: input.departmentId },
      });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "STUDENT_CREATED",
        entityType: "Student",
        entityId: student.id,
        newValue: toAuditJson(student),
        ...ctx,
      },
      tx
    );

    return tx.student.findUniqueOrThrow({ where: { id: student.id }, include: STUDENT_INCLUDE });
  });
}

export async function updateStudent(
  session: Session,
  id: string,
  input: UpdateStudentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Student not found");
  if (!canAccessDepartment(session, existing.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({ where: { id }, data: input });

    if (input.status && input.status !== existing.status) {
      const userStatus = input.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
      await tx.user.update({ where: { id: existing.userId }, data: { status: userStatus } });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "STUDENT_UPDATED",
        entityType: "Student",
        entityId: id,
        oldValue: toAuditJson(existing),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

/** Promotion/transfer never overwrites history (Section 14): close the
 * active enrollment(s) as of the day before the new one starts, then open a
 * fresh enrollment row for the new class/semester. */
export async function changeEnrollment(
  session: Session,
  studentId: string,
  input: ChangeEnrollmentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");
  if (!canAccessDepartment(session, student.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new BadRequestError("Class not found");
  const semester = await prisma.semester.findUnique({ where: { id: input.semesterId } });
  if (!semester) throw new BadRequestError("Semester not found");

  const dayBefore = dayBeforeUtc(input.effectiveFrom);

  return prisma.$transaction(async (tx) => {
    const active = await tx.studentEnrollment.findMany({
      where: { studentId, status: "ACTIVE" },
    });
    for (const enr of active) {
      await tx.studentEnrollment.update({
        where: { id: enr.id },
        data: { status: "CLOSED", effectiveTo: dayBefore },
      });
    }

    const newEnrollment = await tx.studentEnrollment.create({
      data: {
        studentId,
        classId: input.classId,
        semesterId: input.semesterId,
        effectiveFrom: input.effectiveFrom,
        status: "ACTIVE",
      },
    });

    // Transferring departments/classes updates the student's home department
    // only if the new class is in a different department (Section 13).
    if (cls.departmentId !== student.departmentId) {
      await tx.student.update({ where: { id: studentId }, data: { departmentId: cls.departmentId } });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "STUDENT_ENROLLMENT_CHANGED",
        entityType: "Student",
        entityId: studentId,
        oldValue: toAuditJson(active),
        newValue: toAuditJson(newEnrollment),
        ...ctx,
      },
      tx
    );

    return newEnrollment;
  });
}
