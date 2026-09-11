import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import type { CreateAssessmentRuleInput, CreateAssessmentComponentInput } from "@/lib/validation/assessment";

function requireCollegeWideAdmin(session: Session) {
  if (!isAdmin(session)) throw new ForbiddenError("Requires an Admin role");
}

export async function listAssessmentRules(regulationId: string) {
  return prisma.assessmentComponentRule.findMany({
    where: { regulationId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createAssessmentRule(
  session: Session,
  input: CreateAssessmentRuleInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const regulation = await prisma.regulation.findUnique({ where: { id: input.regulationId } });
  if (!regulation) throw new BadRequestError("Regulation not found");

  return prisma.$transaction(async (tx) => {
    const rule = await tx.assessmentComponentRule.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "ASSESSMENT_RULE_CREATED",
        entityType: "AssessmentComponentRule",
        entityId: rule.id,
        newValue: toAuditJson(rule),
        ...ctx,
      },
      tx
    );
    return rule;
  });
}

export async function listAssessmentComponents(subjectOfferingId: string) {
  return prisma.assessmentComponent.findMany({
    where: { subjectOfferingId },
    orderBy: { conductedOn: "asc" },
  });
}

async function requireOfferingManageAccess(session: Session, subjectOfferingId: string) {
  const offering = await prisma.subjectOffering.findUnique({
    where: { id: subjectOfferingId },
    include: { subject: true, teachers: true },
  });
  if (!offering) throw new BadRequestError("Subject offering not found");

  if (isAdmin(session)) {
    if (!canAccessDepartment(session, offering.subject.departmentId)) {
      throw new ForbiddenError("Outside your department scope");
    }
    return offering;
  }
  if (session.user.teacherId && offering.teachers.some((t) => t.teacherId === session.user.teacherId)) {
    return offering;
  }
  throw new ForbiddenError("Not authorized for this subject offering");
}

export async function createAssessmentComponent(
  session: Session,
  subjectOfferingId: string,
  input: CreateAssessmentComponentInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const offering = await requireOfferingManageAccess(session, subjectOfferingId);
  if (offering.marksLocked) throw new ConflictError("Marks are locked for this subject offering");

  if (input.isRetestFor) {
    const original = await prisma.assessmentComponent.findUnique({ where: { id: input.isRetestFor } });
    if (!original || original.subjectOfferingId !== subjectOfferingId) {
      throw new BadRequestError("isRetestFor must reference a component of the same subject offering");
    }
    if (original.groupKey !== input.groupKey) {
      throw new BadRequestError("A retest must use the same groupKey as the component it retests");
    }
  }

  return prisma.$transaction(async (tx) => {
    const component = await tx.assessmentComponent.create({
      data: { ...input, subjectOfferingId },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "ASSESSMENT_COMPONENT_CREATED",
        entityType: "AssessmentComponent",
        entityId: component.id,
        newValue: toAuditJson(component),
        ...ctx,
      },
      tx
    );
    return component;
  });
}

export async function lockSubjectOfferingMarks(
  session: Session,
  subjectOfferingId: string,
  locked: boolean,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const offering = await prisma.subjectOffering.findUnique({ where: { id: subjectOfferingId }, include: { subject: true } });
  if (!offering) throw new NotFoundError("Subject offering not found");
  if (!isAdmin(session) || !canAccessDepartment(session, offering.subject.departmentId)) {
    throw new ForbiddenError("Only Admin can lock/unlock marks");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subjectOffering.update({ where: { id: subjectOfferingId }, data: { marksLocked: locked } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: locked ? "MARKS_LOCKED" : "MARKS_UNLOCKED",
        entityType: "SubjectOffering",
        entityId: subjectOfferingId,
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

export async function publishSubjectOfferingMarks(
  session: Session,
  subjectOfferingId: string,
  published: boolean,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const offering = await prisma.subjectOffering.findUnique({ where: { id: subjectOfferingId }, include: { subject: true } });
  if (!offering) throw new NotFoundError("Subject offering not found");
  if (!isAdmin(session) || !canAccessDepartment(session, offering.subject.departmentId)) {
    throw new ForbiddenError("Only Admin can publish marks");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subjectOffering.update({
      where: { id: subjectOfferingId },
      data: { marksPublished: published },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: published ? "MARKS_PUBLISHED" : "MARKS_UNPUBLISHED",
        entityType: "SubjectOffering",
        entityId: subjectOfferingId,
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

export { requireOfferingManageAccess };
