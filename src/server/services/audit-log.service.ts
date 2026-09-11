import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { adminDepartmentScope, ForbiddenError, UnauthorizedError } from "@/lib/rbac";

export interface AuditLogFilters {
  entityType?: string;
  action?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

/**
 * Section 44: "Admin can search and filter audit logs." Audit entries carry
 * no direct departmentId column (their `context` JSON shape varies action
 * to action, so it can't be filtered reliably), so this is deliberately
 * restricted to a college-wide Admin rather than attempting a half-correct
 * department filter that could leak or hide entries across departments.
 */
export async function listAuditLogs(session: Session, filters: AuditLogFilters = {}) {
  if (!session.user.isActive) throw new UnauthorizedError();
  if (adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Audit logs are visible to a college-wide Admin only");
  }

  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 200);
  const page = Math.max(filters.page ?? 1, 1);

  const where = {
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
    ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" as const } } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

/** Distinct action/entityType values for the filter dropdowns — cheap enough to run on every page load at this table's cardinality (a fixed, small set of action names). */
export async function listAuditLogFacets() {
  const [actions, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);
  return {
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType),
  };
}
