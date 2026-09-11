import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/api-utils";
import type { CreateRegulationInput, SetGradingScaleInput } from "@/lib/validation/regulation";

function requireScopeFor(session: Session, departmentId: string | null | undefined) {
  if (!departmentId) {
    if (adminDepartmentScope(session) !== "ALL") {
      throw new ForbiddenError("Requires a college-wide Admin role for a college-wide regulation");
    }
    return;
  }
  if (!canAccessDepartment(session, departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
}

export async function listRegulations(session: Session) {
  const scope = adminDepartmentScope(session);
  const where = scope === "ALL" ? {} : { OR: [{ departmentId: { in: scope } }, { departmentId: null }] };
  return prisma.regulation.findMany({
    where,
    include: { gradingScales: { orderBy: { gradePoint: "desc" } } },
    orderBy: { code: "asc" },
  });
}

export async function createRegulation(
  session: Session,
  input: CreateRegulationInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireScopeFor(session, input.departmentId);

  const existing = await prisma.regulation.findUnique({ where: { code: input.code } });
  if (existing) throw new ConflictError(`Regulation code ${input.code} already exists`);

  return prisma.$transaction(async (tx) => {
    const regulation = await tx.regulation.create({
      data: { code: input.code, name: input.name, departmentId: input.departmentId ?? null },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "REGULATION_CREATED",
        entityType: "Regulation",
        entityId: regulation.id,
        newValue: toAuditJson(regulation),
        ...ctx,
      },
      tx
    );
    return regulation;
  });
}

/** Replaces the whole grading scale for a regulation in one transaction —
 * simpler and safer than diffing individual grade rows, and the scale is
 * small (typically under 10 rows). */
export async function setGradingScale(
  session: Session,
  regulationId: string,
  input: SetGradingScaleInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const regulation = await prisma.regulation.findUnique({
    where: { id: regulationId },
    include: { gradingScales: true },
  });
  if (!regulation) throw new NotFoundError("Regulation not found");
  requireScopeFor(session, regulation.departmentId);

  return prisma.$transaction(async (tx) => {
    await tx.gradingScale.deleteMany({ where: { regulationId } });
    const created = await Promise.all(
      input.entries.map((e) =>
        tx.gradingScale.create({
          data: {
            regulationId,
            grade: e.grade,
            gradePoint: e.gradePoint,
            minMark: e.minMark,
            maxMark: e.maxMark,
            isPassing: e.isPassing,
          },
        })
      )
    );
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "GRADING_SCALE_REPLACED",
        entityType: "Regulation",
        entityId: regulationId,
        oldValue: toAuditJson(regulation.gradingScales),
        newValue: toAuditJson(created),
        ...ctx,
      },
      tx
    );
    return created;
  });
}
