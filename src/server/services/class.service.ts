import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/api-utils";
import type { CreateClassInput, UpdateClassInput } from "@/lib/validation/class";

export async function listClasses(
  session: Session,
  filters: { departmentId?: string; academicYearId?: string } = {}
) {
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

  return prisma.class.findMany({
    where: {
      ...departmentFilter,
      ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
    },
    include: { department: true, academicYear: true },
    orderBy: [{ academicYear: { startDate: "desc" } }, { yearOfStudy: "asc" }, { section: "asc" }],
  });
}

export async function createClass(
  session: Session,
  input: CreateClassInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!canAccessDepartment(session, input.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const existing = await prisma.class.findUnique({
    where: {
      departmentId_academicYearId_yearOfStudy_section: {
        departmentId: input.departmentId,
        academicYearId: input.academicYearId,
        yearOfStudy: input.yearOfStudy,
        section: input.section,
      },
    },
  });
  if (existing) throw new ConflictError("This class/section already exists for that academic year");

  return prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASS_CREATED",
        entityType: "Class",
        entityId: cls.id,
        newValue: toAuditJson(cls),
        ...ctx,
      },
      tx
    );
    return cls;
  });
}

export async function updateClass(
  session: Session,
  id: string,
  input: UpdateClassInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const existing = await prisma.class.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Class not found");
  if (!canAccessDepartment(session, existing.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.class.update({ where: { id }, data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASS_UPDATED",
        entityType: "Class",
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
