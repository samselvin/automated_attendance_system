import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/api-utils";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@/lib/validation/department";

/** Only a college-wide Admin (departmentId: null on their ADMIN role) may
 * create or deactivate departments — a department-scoped Admin can view. */
function requireCollegeWideAdmin(session: Session) {
  if (adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Requires a college-wide Admin role");
  }
}

export async function listDepartments(session: Session) {
  const scope = adminDepartmentScope(session);
  if (scope === "ALL") {
    return prisma.department.findMany({ orderBy: { code: "asc" } });
  }
  return prisma.department.findMany({
    where: { id: { in: scope } },
    orderBy: { code: "asc" },
  });
}

export async function createDepartment(
  session: Session,
  input: CreateDepartmentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const existing = await prisma.department.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError(`Department code ${input.code} already exists`);

  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "DEPARTMENT_CREATED",
        entityType: "Department",
        entityId: dept.id,
        newValue: toAuditJson(dept),
        ...ctx,
      },
      tx
    );
    return dept;
  });
}

export async function updateDepartment(
  session: Session,
  id: string,
  input: UpdateDepartmentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Department not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({ where: { id }, data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "DEPARTMENT_UPDATED",
        entityType: "Department",
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
