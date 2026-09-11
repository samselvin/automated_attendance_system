import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { ConflictError } from "@/lib/api-utils";
import type { DeclareCalendarDayInput } from "@/lib/validation/calendar";

function requireScope(session: Session, departmentId: string | null | undefined) {
  if (!departmentId) {
    if (adminDepartmentScope(session) !== "ALL") {
      throw new ForbiddenError("Requires a college-wide Admin role for a college-wide calendar day");
    }
    return;
  }
  if (!canAccessDepartment(session, departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
}

export async function listCalendarDays(
  session: Session,
  filters: { departmentId?: string; from?: Date; to?: Date } = {}
) {
  const scope = adminDepartmentScope(session);
  const departmentFilter =
    filters.departmentId != null
      ? { OR: [{ departmentId: filters.departmentId }, { departmentId: null }] }
      : scope === "ALL"
        ? {}
        : { OR: [{ departmentId: { in: scope } }, { departmentId: null }] };

  return prisma.academicCalendarDay.findMany({
    where: {
      ...departmentFilter,
      ...(filters.from || filters.to
        ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    orderBy: { date: "asc" },
  });
}

/**
 * Declares (or re-declares) a calendar day. Section 20: "When a holiday is
 * declared, no sessions are created for that day. Sessions already created
 * are marked CANCELLED." Cancelling already-generated sessions is wired up
 * in Phase 4 once attendance-session generation exists — there is nothing
 * to cancel yet in this phase.
 */
export async function declareCalendarDay(
  session: Session,
  input: DeclareCalendarDayInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireScope(session, input.departmentId);

  // @@unique([date, departmentId]) doesn't dedupe NULL departmentId in
  // Postgres (see the UserRole comment in prisma/seed.ts for why) — find
  // manually instead of relying on upsert's ON CONFLICT.
  const existing = await prisma.academicCalendarDay.findFirst({
    where: { date: input.date, departmentId: input.departmentId ?? null },
  });
  if (existing) {
    throw new ConflictError("A calendar entry already exists for this date and scope — update it instead");
  }

  return prisma.$transaction(async (tx) => {
    const day = await tx.academicCalendarDay.create({
      data: { ...input, departmentId: input.departmentId ?? null },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CALENDAR_DAY_DECLARED",
        entityType: "AcademicCalendarDay",
        entityId: day.id,
        newValue: toAuditJson(day),
        ...ctx,
      },
      tx
    );
    return day;
  });
}

export async function removeCalendarDay(
  session: Session,
  id: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const day = await prisma.academicCalendarDay.findUnique({ where: { id } });
  if (!day) return;
  requireScope(session, day.departmentId);

  return prisma.$transaction(async (tx) => {
    await tx.academicCalendarDay.delete({ where: { id } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CALENDAR_DAY_REMOVED",
        entityType: "AcademicCalendarDay",
        entityId: id,
        oldValue: toAuditJson(day),
        ...ctx,
      },
      tx
    );
  });
}
