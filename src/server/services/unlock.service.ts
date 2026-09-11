import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { isActiveClassAdvisor } from "@/lib/class-advisor";
import { hasTeacherPermission } from "@/lib/permissions";
import { notifyUser } from "@/lib/notify";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import {
  loadEntryOrThrow,
  verifyDateMatchesEntry,
  authorizeForEntry,
  getOrCreateSessionsForEntry,
} from "@/server/services/attendance.service";
import type { RequestUnlockInput, DecideUnlockInput } from "@/lib/validation/attendance";

export async function requestUnlock(
  session: Session,
  input: RequestUnlockInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!session.user.teacherId) throw new UnauthorizedError("Only a teacher may request a late-attendance unlock");

  return prisma.$transaction(async (tx) => {
    const entry = await loadEntryOrThrow(tx, input.timetableEntryId);
    await authorizeForEntry(session, tx, entry, input.date);
    await verifyDateMatchesEntry(tx, entry, input.date);

    const sessions = await getOrCreateSessionsForEntry(tx, entry, input.date);
    const alreadyHeld = sessions.filter((s) => s.status === "HELD");
    if (alreadyHeld.length === sessions.length) {
      throw new ConflictError("Attendance for this session has already been submitted");
    }

    const created = [];
    for (const s of sessions) {
      const existing = await tx.attendanceUnlockRequest.findFirst({
        where: { sessionId: s.id, status: "PENDING" },
      });
      if (existing) {
        created.push(existing);
        continue;
      }
      const request = await tx.attendanceUnlockRequest.create({
        data: { sessionId: s.id, requestedById: session.user.id, reason: input.reason },
      });
      created.push(request);
    }

    const cls = await tx.class.findUniqueOrThrow({ where: { id: entry.timetableVersion.classId } });
    const advisors = await tx.classAdvisorPosting.findMany({
      where: { classId: cls.id, status: "ACTIVE" },
      include: { teacher: true },
    });
    const admins = await tx.userRole.findMany({
      where: { role: "ADMIN", status: "ACTIVE", OR: [{ departmentId: cls.departmentId }, { departmentId: null }] },
    });
    const recipients = new Set([...advisors.map((a) => a.teacher.userId), ...admins.map((a) => a.userId)]);
    for (const userId of recipients) {
      await notifyUser(
        userId,
        "UNLOCK_REQUESTED",
        "Late-attendance unlock requested",
        `A teacher requested a late-attendance unlock: ${input.reason}`,
        undefined,
        tx
      );
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "ATTENDANCE_UNLOCK_REQUESTED",
        entityType: "AttendanceUnlockRequest",
        entityId: created[0]?.id,
        newValue: toAuditJson({ sessionIds: sessions.map((s) => s.id), reason: input.reason }),
        ...ctx,
      },
      tx
    );

    return created;
  });
}

export async function listUnlockRequests(filters: { status?: "PENDING" | "APPROVED" | "REJECTED" } = {}) {
  return prisma.attendanceUnlockRequest.findMany({
    where: filters,
    include: { session: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function decideUnlock(
  session: Session,
  id: string,
  input: DecideUnlockInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const request = await prisma.attendanceUnlockRequest.findUnique({
    where: { id },
    include: { session: { include: { timetableVersion: { include: { class: true } } } } },
  });
  if (!request) throw new NotFoundError("Unlock request not found");
  if (request.status !== "PENDING") throw new ConflictError(`Request is already ${request.status}`);

  const cls = request.session.timetableVersion?.class;
  if (!cls) throw new BadRequestError("Session has no associated class");

  const authorized =
    (isAdmin(session) && canAccessDepartment(session, cls.departmentId)) ||
    (session.user.teacherId &&
      (await isActiveClassAdvisor(session.user.teacherId, cls.id)) &&
      (await hasTeacherPermission(session.user.teacherId, "APPROVE_LATE_UNLOCK", { classId: cls.id })));
  if (!authorized) throw new ForbiddenError("Not authorized to decide this request");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceUnlockRequest.update({
      where: { id },
      data: {
        status: input.decision,
        decidedById: session.user.id,
        decisionNote: input.decisionNote,
        decidedAt: new Date(),
      },
    });

    await notifyUser(
      request.requestedById,
      "UNLOCK_DECIDED",
      `Late-attendance unlock ${input.decision.toLowerCase()}`,
      input.decisionNote ?? `Your unlock request was ${input.decision.toLowerCase()}.`,
      undefined,
      tx
    );

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "ATTENDANCE_UNLOCK_DECIDED",
        entityType: "AttendanceUnlockRequest",
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
