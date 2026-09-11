import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { NotFoundError, BadRequestError } from "@/lib/api-utils";
import { notifyUser } from "@/lib/notify";
import type {
  SubmitChangeRequestInput,
  DecideChangeRequestInput,
} from "@/lib/validation/timetable-change-request";

export async function submitChangeRequest(
  session: Session,
  input: SubmitChangeRequestInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (!session.user.teacherId) throw new UnauthorizedError("Only a teacher may submit a change request");

  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new BadRequestError("Class not found");

  return prisma.$transaction(async (tx) => {
    const request = await tx.timetableChangeRequest.create({
      data: { teacherId: session.user.teacherId!, ...input },
    });

    const admins = await tx.userRole.findMany({
      where: { role: "ADMIN", status: "ACTIVE", OR: [{ departmentId: cls.departmentId }, { departmentId: null }] },
      select: { userId: true },
    });
    for (const admin of admins) {
      await notifyUser(
        admin.userId,
        "TIMETABLE_CHANGED",
        "Timetable change requested",
        `A teacher requested a timetable change: ${input.description}`,
        `/admin/timetable-requests/${request.id}`,
        tx
      );
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "TEACHER",
        action: "TIMETABLE_CHANGE_REQUESTED",
        entityType: "TimetableChangeRequest",
        entityId: request.id,
        newValue: toAuditJson(request),
        ...ctx,
      },
      tx
    );

    return request;
  });
}

export async function listChangeRequests(
  session: Session,
  filters: { classId?: string; status?: string } = {}
) {
  const where: Record<string, unknown> = { ...filters };
  if (!session.user.roles.some((r) => r.role === "ADMIN")) {
    if (!session.user.teacherId) return [];
    where.teacherId = session.user.teacherId;
  }
  return prisma.timetableChangeRequest.findMany({
    where,
    include: { teacher: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function decideChangeRequest(
  session: Session,
  id: string,
  input: DecideChangeRequestInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const request = await prisma.timetableChangeRequest.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!request) throw new NotFoundError("Change request not found");
  if (request.status !== "PENDING") throw new BadRequestError(`Request is already ${request.status}`);

  const cls = await prisma.class.findUniqueOrThrow({ where: { id: request.classId } });
  if (!canAccessDepartment(session, cls.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.timetableChangeRequest.update({
      where: { id },
      data: {
        status: input.decision,
        decidedById: session.user.id,
        decisionNote: input.decisionNote,
        decidedAt: new Date(),
      },
    });

    await notifyUser(
      request.teacher.userId,
      "TIMETABLE_CHANGED",
      `Timetable change request ${input.decision.toLowerCase()}`,
      input.decisionNote ?? `Your timetable change request was ${input.decision.toLowerCase()}.`,
      undefined,
      tx
    );

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "TIMETABLE_CHANGE_DECIDED",
        entityType: "TimetableChangeRequest",
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
