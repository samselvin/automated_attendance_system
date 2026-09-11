import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { isAdmin, isTeacher, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { calculateInternalMarks, roundMark, type RoundingRule } from "@/lib/marks/internal-marks";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import { requireOfferingManageAccess } from "@/server/services/assessment.service";
import type { BulkEnterMarksInput } from "@/lib/validation/marks";

export async function listMarksForComponent(session: Session, assessmentComponentId: string) {
  const component = await prisma.assessmentComponent.findUnique({ where: { id: assessmentComponentId } });
  if (!component) throw new NotFoundError("Assessment component not found");
  await requireOfferingManageAccess(session, component.subjectOfferingId);

  return prisma.mark.findMany({
    where: { assessmentComponentId },
    include: { student: { select: { id: true, rollNumber: true, fullName: true } } },
    orderBy: { student: { rollNumber: "asc" } },
  });
}

export async function bulkEnterMarks(
  session: Session,
  input: BulkEnterMarksInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const component = await prisma.assessmentComponent.findUnique({ where: { id: input.assessmentComponentId } });
  if (!component) throw new BadRequestError("Assessment component not found");

  const offering = await requireOfferingManageAccess(session, component.subjectOfferingId);
  if (offering.marksLocked && !isAdmin(session)) {
    throw new ConflictError("Marks are locked for this subject offering — only Admin can change them now");
  }

  for (const entry of input.entries) {
    if (entry.marksObtained !== null && entry.marksObtained > Number(component.maxMarks)) {
      throw new BadRequestError(`Marks for ${entry.studentId} exceed the component's max (${component.maxMarks})`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of input.entries) {
      const existing = await tx.mark.findUnique({
        where: { studentId_assessmentComponentId: { studentId: entry.studentId, assessmentComponentId: input.assessmentComponentId } },
      });
      if (existing?.isLocked && !isAdmin(session)) {
        throw new ConflictError(`Mark for ${entry.studentId} is individually locked`);
      }

      const mark = await tx.mark.upsert({
        where: {
          studentId_assessmentComponentId: { studentId: entry.studentId, assessmentComponentId: input.assessmentComponentId },
        },
        create: {
          studentId: entry.studentId,
          subjectOfferingId: component.subjectOfferingId,
          assessmentComponentId: input.assessmentComponentId,
          marksObtained: entry.marksObtained,
          entryStatus: entry.entryStatus,
          enteredById: session.user.id,
        },
        update: {
          marksObtained: entry.marksObtained,
          entryStatus: entry.entryStatus,
          enteredById: session.user.id,
        },
      });

      await writeAuditLog(
        {
          actorUserId: session.user.id,
          action: existing ? "MARK_UPDATED" : "MARK_ENTERED",
          entityType: "Mark",
          entityId: mark.id,
          oldValue: existing ? toAuditJson(existing) : undefined,
          newValue: toAuditJson(mark),
          ...ctx,
        },
        tx
      );
      results.push(mark);
    }
    return results;
  });
}

/**
 * Computes each enrolled student's internal mark from every
 * AssessmentComponent + Mark recorded for the offering, using the
 * regulation's configured formula (Section 34) — then stores it onto the
 * corresponding attempt-1 SemesterResult row (created if it doesn't exist
 * yet; the official grade/gradePoint are entered separately by Admin once
 * the university result is out).
 */
export async function computeAndStoreInternalMarks(
  session: Session,
  subjectOfferingId: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const offering = await requireOfferingManageAccess(session, subjectOfferingId);

  const [components, rules, roundingSetting] = await Promise.all([
    prisma.assessmentComponent.findMany({ where: { subjectOfferingId }, include: { marks: true } }),
    prisma.assessmentComponentRule.findMany({
      where: {
        regulationId: offering.subject.regulationId,
        OR: [{ subjectId: offering.subjectId }, { subjectId: null }],
      },
    }),
    getSetting<RoundingRule>("INTERNAL_MARKS_ROUNDING").catch(() => "NEAREST_INTEGER" as RoundingRule),
  ]);
  if (rules.length === 0) {
    throw new BadRequestError("No assessment component rules configured for this regulation/subject");
  }

  const studentIds = new Set<string>();
  for (const c of components) for (const m of c.marks) studentIds.add(m.studentId);

  const ruleInputs = rules.map((r) => ({ groupKey: r.groupKey, weightage: Number(r.weightage) }));

  return prisma.$transaction(async (tx) => {
    const stored = [];
    for (const studentId of studentIds) {
      const studentComponents = components.map((c) => {
        const mark = c.marks.find((m) => m.studentId === studentId);
        return {
          id: c.id,
          groupKey: c.groupKey,
          maxMarks: Number(c.maxMarks),
          marksObtained: mark?.entryStatus === "ABSENT" ? null : mark?.marksObtained != null ? Number(mark.marksObtained) : null,
          isRetestFor: c.isRetestFor,
        };
      });

      const { totalRaw } = calculateInternalMarks(studentComponents, ruleInputs);
      const rounded = roundMark(totalRaw, roundingSetting);

      const subject = await tx.subject.findUniqueOrThrow({ where: { id: offering.subjectId } });
      const existing = await tx.semesterResult.findUnique({
        where: {
          studentId_semesterId_subjectId_attemptNumber: {
            studentId,
            semesterId: offering.semesterId,
            subjectId: offering.subjectId,
            attemptNumber: 1,
          },
        },
      });

      const result = existing
        ? await tx.semesterResult.update({
            where: { id: existing.id },
            data: { internalMark: rounded, internalMarkRaw: totalRaw },
          })
        : await tx.semesterResult.create({
            data: {
              studentId,
              semesterId: offering.semesterId,
              subjectId: offering.subjectId,
              internalMark: rounded,
              internalMarkRaw: totalRaw,
              credits: subject.credits,
              attemptNumber: 1,
              isPass: false,
            },
          });
      stored.push(result);
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "INTERNAL_MARKS_COMPUTED",
        entityType: "SubjectOffering",
        entityId: subjectOfferingId,
        newValue: toAuditJson({ studentCount: stored.length }),
        ...ctx,
      },
      tx
    );

    return stored;
  });
}

/**
 * Section 35's Academics screen: CAT/Class Test/Assignment/MCQ marks,
 * internal marks and semester result — only for subject offerings whose
 * marks have been published (Section 34: "students see marks only after
 * they are published"). Teachers/Admin viewing a student bypass that gate.
 */
export async function getMyMarksOverview(session: Session, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const isSelf = session.user.studentId === studentId;
  const authorized = isSelf || isTeacher(session) || (isAdmin(session) && canAccessDepartment(session, student.departmentId));
  if (!authorized) throw new ForbiddenError("Not authorized to view this student's marks");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!enrollment) return [];

  const offerings = await prisma.subjectOffering.findMany({
    where: {
      classId: enrollment.classId,
      semesterId: enrollment.semesterId,
      ...(isSelf ? { marksPublished: true } : {}),
    },
    include: {
      subject: true,
      assessmentComponents: {
        include: { marks: { where: { studentId } } },
        orderBy: { conductedOn: "asc" },
      },
    },
  });

  const results = await prisma.semesterResult.findMany({
    where: { studentId, semesterId: enrollment.semesterId, attemptNumber: 1, ...(isSelf ? { isPublished: true } : {}) },
  });
  const resultBySubject = new Map(results.map((r) => [r.subjectId, r]));

  return offerings.map((offering) => ({
    subjectOfferingId: offering.id,
    subjectName: offering.subject.name,
    subjectCode: offering.subject.code,
    components: offering.assessmentComponents.map((c) => ({
      id: c.id,
      groupKey: c.groupKey,
      label: c.label,
      maxMarks: Number(c.maxMarks),
      marksObtained: c.marks[0]?.marksObtained != null ? Number(c.marks[0].marksObtained) : null,
      entryStatus: c.marks[0]?.entryStatus ?? null,
    })),
    internalMark: resultBySubject.get(offering.subjectId)?.internalMark ?? null,
    grade: resultBySubject.get(offering.subjectId)?.grade ?? null,
    gradePoint: resultBySubject.get(offering.subjectId)?.gradePoint ?? null,
  }));
}
