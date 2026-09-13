import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, isAdmin, isTeacher, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import type {
  CreateSubjectInput,
  UpdateSubjectInput,
  CreateSubjectOfferingInput,
} from "@/lib/validation/subject";

export async function listSubjects(session: Session, filters: { departmentId?: string; regulationId?: string } = {}) {
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

  return prisma.subject.findMany({
    where: { ...departmentFilter, ...(filters.regulationId ? { regulationId: filters.regulationId } : {}) },
    orderBy: [{ semesterNumber: "asc" }, { code: "asc" }],
  });
}

export async function createSubject(
  session: Session,
  input: CreateSubjectInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!canAccessDepartment(session, input.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const existing = await prisma.subject.findUnique({
    where: { regulationId_code: { regulationId: input.regulationId, code: input.code } },
  });
  if (existing) throw new ConflictError(`Subject code ${input.code} already exists for this regulation`);

  return prisma.$transaction(async (tx) => {
    const subject = await tx.subject.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SUBJECT_CREATED",
        entityType: "Subject",
        entityId: subject.id,
        newValue: toAuditJson(subject),
        ...ctx,
      },
      tx
    );
    return subject;
  });
}

export async function updateSubject(
  session: Session,
  id: string,
  input: UpdateSubjectInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Subject not found");
  if (!canAccessDepartment(session, existing.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subject.update({ where: { id }, data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SUBJECT_UPDATED",
        entityType: "Subject",
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

/**
 * Section 17/42: a teacher may only ever see their own offerings — the
 * `teacherId` filter below is not a convenience default, it's an
 * override. A teacher calling this with a different (or no) teacherId
 * still only gets their own, since the API route reads this straight
 * from the query string and a teacher hitting it directly is exactly
 * the case "hiding buttons is not security" is about (Section 42).
 */
export async function listSubjectOfferings(
  session: Session,
  filters: { classId?: string; studentGroupId?: string; semesterId?: string; teacherId?: string } = {}
) {
  const { teacherId, ...rest } = filters;

  if (isTeacher(session)) {
    if (!session.user.teacherId) throw new ForbiddenError("Not authorized");
    return prisma.subjectOffering.findMany({
      where: { ...rest, teachers: { some: { teacherId: session.user.teacherId } } },
      include: { subject: true, teachers: { include: { teacher: true } }, class: true },
      orderBy: { createdAt: "desc" },
    });
  }

  if (isAdmin(session)) {
    const scope = adminDepartmentScope(session);
    const departmentFilter = scope === "ALL" ? {} : { subject: { departmentId: { in: scope } } };
    return prisma.subjectOffering.findMany({
      where: { ...rest, ...departmentFilter, ...(teacherId ? { teachers: { some: { teacherId } } } : {}) },
      include: { subject: true, teachers: { include: { teacher: true } }, class: true },
      orderBy: { createdAt: "desc" },
    });
  }

  throw new ForbiddenError("Not authorized");
}

export async function createSubjectOffering(
  session: Session,
  input: CreateSubjectOfferingInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) throw new BadRequestError("Subject not found");
  if (!canAccessDepartment(session, subject.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const semester = await prisma.semester.findUnique({ where: { id: input.semesterId } });
  if (!semester) throw new BadRequestError("Semester not found");
  if (semester.academicYearId !== input.academicYearId) {
    throw new BadRequestError("Semester does not belong to the given academic year");
  }
  if (semester.number !== subject.semesterNumber) {
    throw new BadRequestError(
      `Subject ${subject.code} is a semester ${subject.semesterNumber} subject, not semester ${semester.number}`
    );
  }

  if (input.classId) {
    const cls = await prisma.class.findUnique({ where: { id: input.classId } });
    if (!cls) throw new BadRequestError("Class not found");
  }
  if (input.studentGroupId) {
    const group = await prisma.studentGroup.findUnique({ where: { id: input.studentGroupId } });
    if (!group) throw new BadRequestError("Student group not found");
  }

  const teachers = await prisma.teacher.findMany({ where: { id: { in: input.teacherIds } } });
  if (teachers.length !== input.teacherIds.length) throw new BadRequestError("One or more teachers not found");

  return prisma.$transaction(async (tx) => {
    const offering = await tx.subjectOffering.create({
      data: {
        subjectId: input.subjectId,
        classId: input.classId,
        studentGroupId: input.studentGroupId,
        academicYearId: input.academicYearId,
        semesterId: input.semesterId,
      },
    });

    await tx.subjectOfferingTeacher.createMany({
      data: input.teacherIds.map((teacherId) => ({
        subjectOfferingId: offering.id,
        teacherId,
        isPrimary: teacherId === (input.primaryTeacherId ?? input.teacherIds[0]),
      })),
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SUBJECT_OFFERING_CREATED",
        entityType: "SubjectOffering",
        entityId: offering.id,
        newValue: toAuditJson({ ...offering, teacherIds: input.teacherIds }),
        ...ctx,
      },
      tx
    );

    return tx.subjectOffering.findUniqueOrThrow({
      where: { id: offering.id },
      include: { teachers: { include: { teacher: true } }, subject: true },
    });
  });
}
