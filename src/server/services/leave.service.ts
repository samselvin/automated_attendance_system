import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { isActiveClassAdvisor, getActiveAdvisorClassIds } from "@/lib/class-advisor";
import { computeOdStatus, type ApproverDecision } from "@/lib/attendance/od-approval";
import { notifyUser } from "@/lib/notify";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import type {
  SubmitLeaveRequestInput,
  DecideSingleApprovalInput,
  DecideOdApprovalInput,
} from "@/lib/validation/leave";

async function getActiveEnrollment(tx: Prisma.TransactionClient, studentId: string, asOf: Date = new Date()) {
  return tx.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE", effectiveFrom: { lte: asOf }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }] },
    orderBy: { effectiveFrom: "desc" },
  });
}

async function notifyApprovers(
  tx: Prisma.TransactionClient,
  classId: string,
  departmentId: string,
  notificationType: "LEAVE_SUBMITTED" | "OD_SUBMITTED",
  title: string,
  message: string
) {
  const advisors = await tx.classAdvisorPosting.findMany({
    where: { classId, status: "ACTIVE" },
    include: { teacher: true },
  });
  const admins = await tx.userRole.findMany({
    where: { role: "ADMIN", status: "ACTIVE", OR: [{ departmentId }, { departmentId: null }] },
  });
  const recipientUserIds = new Set([...advisors.map((a) => a.teacher.userId), ...admins.map((a) => a.userId)]);
  for (const userId of recipientUserIds) {
    await notifyUser(userId, notificationType, title, message, undefined, tx);
  }
}

/** Applies an approval to any already-taken ABSENT records in range (Section
 * 30: applies even after the window has closed, with an audit trail). */
async function applyApprovalToExistingAttendance(
  tx: Prisma.TransactionClient,
  leaveRequestId: string,
  studentId: string,
  fromDate: Date,
  toDate: Date,
  isFullDay: boolean,
  periods: number[],
  newStatus: "APPROVED_LEAVE" | "ON_DUTY",
  decidedById: string
) {
  const records = await tx.attendanceRecord.findMany({
    where: {
      studentId,
      status: "ABSENT",
      session: { date: { gte: fromDate, lte: toDate } },
    },
    include: { session: true },
  });

  for (const record of records) {
    if (!isFullDay && !periods.includes(record.session.periodNumber)) continue;

    await tx.attendanceRecord.update({
      where: { id: record.id },
      data: { status: newStatus, leaveRequestId, method: "LEAVE_SYNC" },
    });
    await tx.attendanceCorrection.create({
      data: {
        attendanceRecordId: record.id,
        oldStatus: "ABSENT",
        newStatus,
        reason: `Approved ${newStatus === "ON_DUTY" ? "On Duty" : "Leave"} request ${leaveRequestId}`,
        correctedById: decidedById,
      },
    });
  }
}

export async function submitLeaveRequest(
  session: Session,
  input: SubmitLeaveRequestInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  let studentId = input.studentId;
  let source: "STUDENT_REQUEST" | "CLASS_ADVISOR_SUBMITTED" = "STUDENT_REQUEST";

  if (!studentId) {
    if (!session.user.studentId) throw new UnauthorizedError("Only a student may submit their own request");
    studentId = session.user.studentId;
  } else if (session.user.studentId !== studentId) {
    if (!session.user.teacherId) throw new ForbiddenError("Not authorized to submit on behalf of this student");
    source = "CLASS_ADVISOR_SUBMITTED";
  }

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId! } });
    if (!student) throw new BadRequestError("Student not found");

    const enrollment = await getActiveEnrollment(tx, studentId!);
    if (!enrollment) throw new BadRequestError("Student has no active enrollment");

    if (source === "CLASS_ADVISOR_SUBMITTED") {
      const isAdvisor = await isActiveClassAdvisor(session.user.teacherId!, enrollment.classId);
      if (!isAdvisor) throw new ForbiddenError("Not the active Class Advisor for this student's class");
    }

    const request = await tx.leaveRequest.create({
      data: {
        studentId: studentId!,
        type: input.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        isFullDay: input.isFullDay,
        periods: input.periods,
        reason: input.reason,
        documentFileId: input.documentFileId,
        source,
        submittedById: session.user.id,
      },
    });

    await notifyApprovers(
      tx,
      enrollment.classId,
      student.departmentId,
      input.type === "ON_DUTY" ? "OD_SUBMITTED" : "LEAVE_SUBMITTED",
      `${input.type} request submitted`,
      `${student.fullName} (${student.rollNumber}) requested ${input.type} from ${input.fromDate.toDateString()} to ${input.toDate.toDateString()}.`
    );

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "LEAVE_REQUEST_SUBMITTED",
        entityType: "LeaveRequest",
        entityId: request.id,
        newValue: toAuditJson(request),
        ...ctx,
      },
      tx
    );

    return request;
  });
}

export async function listLeaveRequests(
  session: Session,
  filters: { studentId?: string; status?: string; type?: string } = {}
) {
  const where: Record<string, unknown> = { ...filters };

  if (isAdmin(session)) {
    // Admin sees everything within filters as given (department scoping on
    // leave data isn't enforced further here — Admin already has broad
    // visibility per Section 5).
  } else if (session.user.teacherId) {
    // A teacher only sees leave/OD for students in classes they actively
    // advise (Section 12) — not every student college-wide.
    const classIds = await getActiveAdvisorClassIds(session.user.teacherId);
    if (classIds.length === 0) return [];
    where.student = { enrollments: { some: { classId: { in: classIds }, status: "ACTIVE" } } };
  } else if (session.user.studentId) {
    where.studentId = session.user.studentId;
  } else {
    return [];
  }

  return prisma.leaveRequest.findMany({
    where,
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Single-approver flow for LEAVE / MEDICAL — either the Class Advisor or
 * the HOD (a department-scoped Admin) deciding is sufficient. */
export async function decideLeaveOrMedical(
  session: Session,
  id: string,
  input: DecideSingleApprovalInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { student: true } });
  if (!request) throw new NotFoundError("Leave request not found");
  if (request.type === "ON_DUTY") throw new BadRequestError("On Duty requests use the dual-approval endpoint");
  if (request.status !== "PENDING") throw new ConflictError(`Request is already ${request.status}`);

  return prisma.$transaction(async (tx) => {
    const enrollment = await getActiveEnrollment(tx, request.studentId);
    if (!enrollment) throw new BadRequestError("Student has no active enrollment");

    const authorized =
      (isAdmin(session) && canAccessDepartment(session, request.student.departmentId)) ||
      (session.user.teacherId && (await isActiveClassAdvisor(session.user.teacherId, enrollment.classId)));
    if (!authorized) throw new ForbiddenError("Not authorized to decide this request");

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: input.decision,
        decidedById: session.user.id,
        decisionNote: input.decisionNote,
        decidedAt: new Date(),
      },
    });

    if (input.decision === "APPROVED") {
      await applyApprovalToExistingAttendance(
        tx,
        id,
        request.studentId,
        request.fromDate,
        request.toDate,
        request.isFullDay,
        request.periods,
        "APPROVED_LEAVE",
        session.user.id
      );
    }

    await notifyUser(
      request.student.userId,
      "LEAVE_DECIDED",
      `${request.type} request ${input.decision.toLowerCase()}`,
      input.decisionNote ?? `Your ${request.type} request was ${input.decision.toLowerCase()}.`,
      undefined,
      tx
    );

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "LEAVE_REQUEST_DECIDED",
        entityType: "LeaveRequest",
        entityId: id,
        oldValue: toAuditJson(request),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );

    return updated;
  });
}

/** Dual-approval flow for ON_DUTY — both the Class Advisor and the HOD must
 * approve; either rejecting rejects the whole request immediately. */
export async function decideOdApproval(
  session: Session,
  id: string,
  input: DecideOdApprovalInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { student: true } });
  if (!request) throw new NotFoundError("On Duty request not found");
  if (request.type !== "ON_DUTY") throw new BadRequestError("Only On Duty requests use dual approval");
  if (request.status !== "PENDING") throw new ConflictError(`Request is already ${request.status}`);

  return prisma.$transaction(async (tx) => {
    const enrollment = await getActiveEnrollment(tx, request.studentId);
    if (!enrollment) throw new BadRequestError("Student has no active enrollment");

    // An Admin session always acts as the HOD approver (Class Advisor is a
    // teacher posting, not an Admin capability); otherwise the caller must
    // be the class's active Class Advisor.
    const actingAsAdmin = isAdmin(session) && canAccessDepartment(session, request.student.departmentId);
    const actingAsAdvisor =
      !actingAsAdmin && session.user.teacherId && (await isActiveClassAdvisor(session.user.teacherId, enrollment.classId));

    if (!actingAsAdmin && !actingAsAdvisor) throw new ForbiddenError("Not authorized to decide this request");

    if (actingAsAdmin && request.hodDecision !== null) {
      throw new ConflictError("The HOD has already decided this request");
    }
    if (actingAsAdvisor && request.classAdvisorDecision !== null) {
      throw new ConflictError("The Class Advisor has already decided this request");
    }

    const data: Record<string, unknown> = actingAsAdmin
      ? { hodDecision: input.decision, hodById: session.user.id, hodDecidedAt: new Date() }
      : { classAdvisorDecision: input.decision, classAdvisorById: session.user.id, classAdvisorDecidedAt: new Date() };

    const afterThisDecision = await tx.leaveRequest.update({ where: { id }, data });

    const overall = computeOdStatus(
      afterThisDecision.classAdvisorDecision as ApproverDecision,
      afterThisDecision.hodDecision as ApproverDecision
    );

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: overall,
        ...(overall !== "PENDING" ? { decidedById: session.user.id, decidedAt: new Date(), decisionNote: input.decisionNote } : {}),
      },
    });

    if (overall === "APPROVED") {
      await applyApprovalToExistingAttendance(
        tx,
        id,
        request.studentId,
        request.fromDate,
        request.toDate,
        request.isFullDay,
        request.periods,
        "ON_DUTY",
        session.user.id
      );
    }

    const notifTitle =
      overall === "PENDING"
        ? "On Duty request: one approval recorded"
        : `On Duty request ${overall.toLowerCase()}`;
    const notifMessage =
      overall === "PENDING"
        ? "One of the two required approvals has been recorded. Awaiting the other."
        : input.decisionNote ?? `Your On Duty request was ${overall.toLowerCase()}.`;
    await notifyUser(request.student.userId, "OD_DECIDED", notifTitle, notifMessage, undefined, tx);

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "OD_REQUEST_DECIDED",
        entityType: "LeaveRequest",
        entityId: id,
        oldValue: toAuditJson(request),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );

    return updated;
  });
}
