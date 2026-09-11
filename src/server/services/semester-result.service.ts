import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, isTeacher, ForbiddenError } from "@/lib/rbac";
import { calculateSgpa, calculateCgpa, type SubjectResult } from "@/lib/marks/gpa";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import type { EnterSemesterResultInput } from "@/lib/validation/semester-result";

export async function enterSemesterResult(
  session: Session,
  input: EnterSemesterResultInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!isAdmin(session)) throw new ForbiddenError("Only Admin enters official semester results");

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new BadRequestError("Student not found");
  if (!canAccessDepartment(session, student.departmentId)) throw new ForbiddenError("Outside your department scope");

  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) throw new BadRequestError("Subject not found");

  const gradingScale = await prisma.gradingScale.findUnique({
    where: { regulationId_grade: { regulationId: subject.regulationId, grade: input.grade } },
  });
  if (!gradingScale) throw new BadRequestError(`Grade "${input.grade}" is not defined in this subject's regulation`);

  const existing = await prisma.semesterResult.findUnique({
    where: {
      studentId_semesterId_subjectId_attemptNumber: {
        studentId: input.studentId,
        semesterId: input.semesterId,
        subjectId: input.subjectId,
        attemptNumber: input.attemptNumber,
      },
    },
  });

  return prisma.$transaction(async (tx) => {
    const data = {
      grade: input.grade,
      gradePoint: gradingScale.gradePoint,
      credits: subject.credits,
      isPass: gradingScale.isPassing,
    };
    const result = existing
      ? await tx.semesterResult.update({ where: { id: existing.id }, data })
      : await tx.semesterResult.create({
          data: {
            studentId: input.studentId,
            semesterId: input.semesterId,
            subjectId: input.subjectId,
            attemptNumber: input.attemptNumber,
            ...data,
          },
        });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: existing ? "SEMESTER_RESULT_UPDATED" : "SEMESTER_RESULT_ENTERED",
        entityType: "SemesterResult",
        entityId: result.id,
        oldValue: existing ? toAuditJson(existing) : undefined,
        newValue: toAuditJson(result),
        ...ctx,
      },
      tx
    );

    return result;
  });
}

export async function publishSemesterResults(
  session: Session,
  filters: { studentId?: string; semesterId?: string },
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!isAdmin(session)) throw new ForbiddenError("Only Admin publishes semester results");
  if (!filters.studentId && !filters.semesterId) {
    throw new BadRequestError("At least one of studentId or semesterId is required");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.semesterResult.updateMany({ where: filters, data: { isPublished: true } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SEMESTER_RESULTS_PUBLISHED",
        entityType: "SemesterResult",
        newValue: toAuditJson({ filters, count: updated.count }),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

async function requireViewAccess(session: Session, studentId: string): Promise<{ selfView: boolean }> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const selfView = session.user.studentId === studentId;
  const authorized = selfView || isTeacher(session) || (isAdmin(session) && canAccessDepartment(session, student.departmentId));
  if (!authorized) throw new ForbiddenError("Not authorized to view this student's results");
  return { selfView };
}

export async function listStudentSemesterResults(session: Session, studentId: string, semesterId?: string) {
  const { selfView } = await requireViewAccess(session, studentId);
  return prisma.semesterResult.findMany({
    where: { studentId, ...(semesterId ? { semesterId } : {}), ...(selfView ? { isPublished: true } : {}) },
    include: { student: { select: { rollNumber: true, fullName: true } } },
    orderBy: [{ semesterId: "asc" }, { attemptNumber: "asc" }],
  });
}

// Only graded rows count — a subject with internal marks computed but no
// official grade yet must not drag the average down as a phantom zero.
function toGradedSubjectResults(
  results: Array<{ subjectId: string; attemptNumber: number; credits: unknown; gradePoint: unknown | null; isPass: boolean }>
): SubjectResult[] {
  return results
    .filter((r) => r.gradePoint !== null)
    .map((r) => ({
      subjectId: r.subjectId,
      attemptNumber: r.attemptNumber,
      credits: Number(r.credits),
      gradePoint: Number(r.gradePoint),
      isPass: r.isPass,
    }));
}

export async function getStudentSgpa(session: Session, studentId: string, semesterId: string) {
  const { selfView } = await requireViewAccess(session, studentId);
  const results = await prisma.semesterResult.findMany({
    where: { studentId, semesterId, ...(selfView ? { isPublished: true } : {}) },
  });
  const subjectResults = toGradedSubjectResults(results);
  return { sgpa: calculateSgpa(subjectResults), subjectCount: subjectResults.filter((r) => r.attemptNumber === 1).length };
}

export async function getStudentCgpa(session: Session, studentId: string) {
  const { selfView } = await requireViewAccess(session, studentId);
  const results = await prisma.semesterResult.findMany({
    where: { studentId, ...(selfView ? { isPublished: true } : {}) },
  });
  return { cgpa: calculateCgpa(toGradedSubjectResults(results)) };
}
