import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, isTeacher, adminDepartmentScope, ForbiddenError } from "@/lib/rbac";
import { hasTeacherPermission } from "@/lib/permissions";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import { notifyUser } from "@/lib/notify";
import { collegeWallClockToUtc } from "@/lib/time";
import { eventAppliesToStudent } from "@/lib/events/audience";
import type { CreateEventInput } from "@/lib/validation/event";

/** The department an event's audience actually belongs to, even when the
 * caller only gave a classId/studentGroupId — always resolved and stored
 * so department-scoped Admin visibility (listEvents) never needs a
 * separate join per audience type. `null` only for a genuine COLLEGE event. */
async function resolveEventDepartmentId(input: {
  audienceType: CreateEventInput["audienceType"];
  departmentId?: string;
  classId?: string;
  studentGroupId?: string;
}): Promise<string | null> {
  if (input.departmentId) return input.departmentId;
  if (input.classId) {
    const cls = await prisma.class.findUnique({ where: { id: input.classId } });
    if (!cls) throw new BadRequestError("Class not found");
    return cls.departmentId;
  }
  if (input.studentGroupId) {
    const group = await prisma.studentGroup.findUnique({ where: { id: input.studentGroupId }, include: { class: true } });
    if (!group) throw new BadRequestError("Student group not found");
    return group.class.departmentId;
  }
  return null;
}

async function requireEventManageAccess(
  session: Session,
  scope: { departmentId: string | null; classId?: string }
): Promise<void> {
  if (isAdmin(session)) {
    if (scope.departmentId) {
      if (!canAccessDepartment(session, scope.departmentId)) {
        throw new ForbiddenError("Outside your department scope");
      }
      return;
    }
    // No department at all means a genuine COLLEGE-wide event.
    if (adminDepartmentScope(session) !== "ALL") {
      throw new ForbiddenError("Only a college-wide Admin can manage a college-wide event");
    }
    return;
  }

  if (isTeacher(session) && session.user.teacherId) {
    const permitted = await hasTeacherPermission(session.user.teacherId, "MANAGE_EVENTS", {
      departmentId: scope.departmentId ?? undefined,
      classId: scope.classId,
    });
    if (!permitted) throw new ForbiddenError("You are not authorized to manage events for this audience");
    return;
  }

  throw new ForbiddenError("Not authorized");
}

export async function createEvent(
  session: Session,
  input: CreateEventInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const departmentId = await resolveEventDepartmentId(input);
  await requireEventManageAccess(session, { departmentId, classId: input.classId });

  const startAt = collegeWallClockToUtc(dateKey(input.startDate), input.startTime);
  const endAt = collegeWallClockToUtc(dateKey(input.endDate), input.endTime);
  if (endAt < startAt) throw new BadRequestError("End must be at or after start");

  const event = await prisma.event.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      audienceType: input.audienceType,
      departmentId,
      yearOfStudy: input.audienceType === "YEAR" ? input.yearOfStudy : null,
      classId: input.audienceType === "CLASS" ? input.classId : null,
      studentGroupId: input.audienceType === "GROUP" ? input.studentGroupId : null,
      startAt,
      endAt,
      venue: input.venue,
      affectsCalendar: input.affectsCalendar,
      createdById: session.user.id,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: isAdmin(session) ? "ADMIN" : "TEACHER",
    action: "EVENT_CREATED",
    entityType: "Event",
    entityId: event.id,
    newValue: toAuditJson(event),
    ...ctx,
  });

  return event;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function resolveAudienceStudentUserIds(event: {
  audienceType: string;
  departmentId: string | null;
  yearOfStudy: number | null;
  classId: string | null;
  studentGroupId: string | null;
}): Promise<string[]> {
  const active = { status: "ACTIVE" as const };
  switch (event.audienceType) {
    case "COLLEGE": {
      const students = await prisma.student.findMany({ where: active, select: { userId: true } });
      return students.map((s) => s.userId);
    }
    case "DEPARTMENT": {
      const students = await prisma.student.findMany({
        where: { ...active, departmentId: event.departmentId! },
        select: { userId: true },
      });
      return students.map((s) => s.userId);
    }
    case "YEAR": {
      const students = await prisma.student.findMany({
        where: {
          ...active,
          departmentId: event.departmentId!,
          enrollments: { some: { status: "ACTIVE", class: { yearOfStudy: event.yearOfStudy! } } },
        },
        select: { userId: true },
      });
      return students.map((s) => s.userId);
    }
    case "CLASS": {
      const students = await prisma.student.findMany({
        where: { ...active, enrollments: { some: { status: "ACTIVE", classId: event.classId! } } },
        select: { userId: true },
      });
      return students.map((s) => s.userId);
    }
    case "GROUP": {
      const students = await prisma.student.findMany({
        where: { ...active, groupMemberships: { some: { studentGroupId: event.studentGroupId! } } },
        select: { userId: true },
      });
      return students.map((s) => s.userId);
    }
    default:
      return [];
  }
}

export async function publishEvent(session: Session, eventId: string, ctx: { ipAddress?: string; userAgent?: string }) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  await requireEventManageAccess(session, { departmentId: event.departmentId, classId: event.classId ?? undefined });

  if (event.isPublished) return event;

  const updated = await prisma.event.update({ where: { id: eventId }, data: { isPublished: true } });

  const recipientUserIds = await resolveAudienceStudentUserIds(event);
  const dateLabel = event.startAt.toISOString().slice(0, 10);
  for (const userId of recipientUserIds) {
    await notifyUser(
      userId,
      "EVENT_PUBLISHED",
      event.title,
      `${event.type} on ${dateLabel}${event.venue ? ` at ${event.venue}` : ""}.${event.description ? ` ${event.description}` : ""}`
    );
  }

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: isAdmin(session) ? "ADMIN" : "TEACHER",
    action: "EVENT_PUBLISHED",
    entityType: "Event",
    entityId: event.id,
    context: { notifiedCount: recipientUserIds.length },
    ...ctx,
  });

  return updated;
}

export async function deleteEvent(session: Session, eventId: string, ctx: { ipAddress?: string; userAgent?: string }) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError("Event not found");
  await requireEventManageAccess(session, { departmentId: event.departmentId, classId: event.classId ?? undefined });

  if (event.isPublished) {
    throw new BadRequestError("A published event can't be deleted — its audience has already been notified");
  }

  await prisma.event.delete({ where: { id: eventId } });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: isAdmin(session) ? "ADMIN" : "TEACHER",
    action: "EVENT_DELETED",
    entityType: "Event",
    entityId: eventId,
    oldValue: toAuditJson(event),
    ...ctx,
  });
}

/** Admin management list — everything within scope; a teacher only sees
 * what they created (Section 36 doesn't ask for teachers to browse every
 * event, only to be able to create ones they're permitted to). */
export async function listEvents(session: Session) {
  if (isAdmin(session)) {
    const scope = adminDepartmentScope(session);
    const where = scope === "ALL" ? {} : { OR: [{ audienceType: "COLLEGE" as const }, { departmentId: { in: scope } }] };
    return prisma.event.findMany({
      where,
      include: { department: true, class: true, studentGroup: true },
      orderBy: { startAt: "desc" },
    });
  }

  if (isTeacher(session) && session.user.teacherId) {
    const user = session.user.id;
    return prisma.event.findMany({
      where: { createdById: user },
      include: { department: true, class: true, studentGroup: true },
      orderBy: { startAt: "desc" },
    });
  }

  throw new ForbiddenError("Not authorized");
}

/**
 * Section 36: events relevant to the signed-in student — published only.
 * Fetches every published event (a college has, at most, a few hundred
 * ever — nowhere near the scale that calls for a per-audience-type SQL
 * query) and filters with the same tested predicate used in
 * audience.test.ts, so the API's actual behavior can never drift from
 * what that test suite verifies.
 */
export async function listEventsForStudent(session: Session) {
  if (!session.user.studentId) throw new ForbiddenError("Not a student");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: session.user.studentId } });
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id, status: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
    include: { class: true },
  });
  const groupMemberships = await prisma.studentGroupMember.findMany({
    where: { studentId: student.id },
    select: { studentGroupId: true },
  });

  const context = {
    departmentId: student.departmentId,
    yearOfStudy: enrollment?.class.yearOfStudy ?? null,
    classId: enrollment?.classId ?? null,
    groupIds: groupMemberships.map((g) => g.studentGroupId),
  };

  const events = await prisma.event.findMany({ where: { isPublished: true }, orderBy: { startAt: "asc" } });
  return events.filter((e) => eventAppliesToStudent(e, context));
}
