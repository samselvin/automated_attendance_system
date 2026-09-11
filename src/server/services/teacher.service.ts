import type { Session } from "next-auth";
import { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/api-utils";
import type { CreateTeacherInput, UpdateTeacherInput } from "@/lib/validation/teacher";

export async function listTeachers(session: Session, filters: { departmentId?: string } = {}) {
  const scope = adminDepartmentScope(session);
  if (filters.departmentId && !canAccessDepartment(session, filters.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  const where =
    filters.departmentId != null
      ? { departmentId: filters.departmentId }
      : scope === "ALL"
        ? {}
        : { departmentId: { in: scope } };

  return prisma.teacher.findMany({
    where,
    include: { user: { select: { email: true, status: true, lastLoginAt: true } }, department: true },
    orderBy: { fullName: "asc" },
  });
}

export async function createTeacher(
  session: Session,
  input: CreateTeacherInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!canAccessDepartment(session, input.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const existingByEmployeeId = await prisma.teacher.findUnique({
    where: { employeeId: input.employeeId },
  });
  if (existingByEmployeeId) throw new ConflictError(`Employee id ${input.employeeId} already in use`);

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser?.status === "INACTIVE") {
    throw new ConflictError("A deactivated account already exists for this email");
  }
  const existingTeacherForUser = existingUser
    ? await prisma.teacher.findUnique({ where: { userId: existingUser.id } })
    : null;
  if (existingTeacherForUser) throw new ConflictError("This email is already registered as a teacher");

  return prisma.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({ data: { email: input.email, status: "ACTIVE" } }));

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        employeeId: input.employeeId,
        fullName: input.fullName,
        designation: input.designation,
        departmentId: input.departmentId,
        mobileNumber: input.mobileNumber,
      },
    });

    const existingRole = await tx.userRole.findFirst({
      where: { userId: user.id, role: RoleName.TEACHER, departmentId: input.departmentId },
    });
    if (!existingRole) {
      await tx.userRole.create({
        data: { userId: user.id, role: RoleName.TEACHER, departmentId: input.departmentId },
      });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "TEACHER_CREATED",
        entityType: "Teacher",
        entityId: teacher.id,
        newValue: toAuditJson(teacher),
        ...ctx,
      },
      tx
    );

    return teacher;
  });
}

export async function updateTeacher(
  session: Session,
  id: string,
  input: UpdateTeacherInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const existing = await prisma.teacher.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Teacher not found");
  if (!canAccessDepartment(session, existing.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.teacher.update({ where: { id }, data: input });

    // Deactivating/reactivating a Teacher also flips login access for the
    // underlying User (Section 6: "immediate loss of access when deactivated").
    if (input.status && input.status !== existing.status) {
      await tx.user.update({ where: { id: existing.userId }, data: { status: input.status } });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "TEACHER_UPDATED",
        entityType: "Teacher",
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
