import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { dayBeforeUtc } from "@/lib/time";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import type { AssignAdvisorInput, EndPostingInput } from "@/lib/validation/class-advisor";

async function requireClassAccess(session: Session, classId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new BadRequestError("Class not found");
  if (!canAccessDepartment(session, cls.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  return cls;
}

export async function listPostings(session: Session, classId: string) {
  await requireClassAccess(session, classId);
  return prisma.classAdvisorPosting.findMany({
    where: { classId },
    include: { teacher: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

/** Adds a new posting without touching existing ones — used when the class
 * allows more than one simultaneous advisor (Section 11: configurable max). */
export async function assignAdvisor(
  session: Session,
  input: AssignAdvisorInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  await requireClassAccess(session, input.classId);

  const maxActive = await getSetting<number>("CLASS_ADVISOR_MAX_ACTIVE");
  const activeCount = await prisma.classAdvisorPosting.count({
    where: {
      classId: input.classId,
      status: "ACTIVE",
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
    },
  });
  if (activeCount >= maxActive) {
    throw new ConflictError(
      `This class already has ${activeCount} active advisor(s) (max ${maxActive}). Use "change advisor" to replace one.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const posting = await tx.classAdvisorPosting.create({
      data: {
        classId: input.classId,
        teacherId: input.teacherId,
        semesterId: input.semesterId,
        effectiveFrom: input.effectiveFrom,
        notes: input.notes,
        assignedById: session.user.id,
        status: "ACTIVE",
      },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASS_ADVISOR_ASSIGNED",
        entityType: "ClassAdvisorPosting",
        entityId: posting.id,
        newValue: toAuditJson(posting),
        ...ctx,
      },
      tx
    );
    return posting;
  });
}

/** Ends every currently-active posting for the class and creates a new one,
 * in a single transaction (Section 11): never overwrite or delete history. */
export async function changeAdvisor(
  session: Session,
  input: AssignAdvisorInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  await requireClassAccess(session, input.classId);

  return prisma.$transaction(async (tx) => {
    const active = await tx.classAdvisorPosting.findMany({
      where: {
        classId: input.classId,
        status: "ACTIVE",
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.effectiveFrom } }],
      },
    });

    for (const posting of active) {
      await tx.classAdvisorPosting.update({
        where: { id: posting.id },
        data: { status: "INACTIVE", effectiveTo: dayBeforeUtc(input.effectiveFrom) },
      });
    }

    const created = await tx.classAdvisorPosting.create({
      data: {
        classId: input.classId,
        teacherId: input.teacherId,
        semesterId: input.semesterId,
        effectiveFrom: input.effectiveFrom,
        notes: input.notes,
        assignedById: session.user.id,
        status: "ACTIVE",
      },
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASS_ADVISOR_CHANGED",
        entityType: "ClassAdvisorPosting",
        entityId: created.id,
        oldValue: toAuditJson(active),
        newValue: toAuditJson(created),
        ...ctx,
      },
      tx
    );

    return created;
  });
}

export async function endPosting(
  session: Session,
  postingId: string,
  input: EndPostingInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const posting = await prisma.classAdvisorPosting.findUnique({ where: { id: postingId } });
  if (!posting) throw new NotFoundError("Posting not found");
  await requireClassAccess(session, posting.classId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.classAdvisorPosting.update({
      where: { id: postingId },
      data: { status: "INACTIVE", effectiveTo: input.effectiveTo },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASS_ADVISOR_ENDED",
        entityType: "ClassAdvisorPosting",
        entityId: postingId,
        oldValue: toAuditJson(posting),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}
