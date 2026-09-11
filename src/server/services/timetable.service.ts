import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, isTeacher, ForbiddenError } from "@/lib/rbac";
import { hasTeacherPermission } from "@/lib/permissions";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import {
  validateTimetableEntry,
  isSchedulableSlotType,
  areSlotsConsecutive,
  type ExistingEntry,
} from "@/lib/timetable/validate";
import type { CreateTimetableVersionInput, CreateTimetableEntryInput } from "@/lib/validation/timetable";

async function requireVersionEditAccess(
  session: Session,
  classId: string,
  isLocked: boolean
): Promise<void> {
  if (isAdmin(session)) {
    const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
    if (!canAccessDepartment(session, cls.departmentId)) {
      throw new ForbiddenError("Outside your department scope");
    }
    return;
  }

  if (isTeacher(session) && session.user.teacherId) {
    if (isLocked) {
      throw new ForbiddenError("Timetable is locked — submit a change request instead");
    }
    const permitted = await hasTeacherPermission(session.user.teacherId, "MANAGE_TIMETABLE_ENTRIES", { classId });
    if (!permitted) throw new ForbiddenError("You are not authorized to edit this class's timetable");
    return;
  }

  throw new ForbiddenError("Not authorized");
}

export async function listTimetableVersions(filters: { classId?: string; semesterId?: string } = {}) {
  return prisma.timetableVersion.findMany({
    where: filters,
    include: { bellSchedule: true, class: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createTimetableVersion(
  session: Session,
  input: CreateTimetableVersionInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new BadRequestError("Class not found");
  if (!canAccessDepartment(session, cls.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const semester = await prisma.semester.findUnique({ where: { id: input.semesterId } });
  if (!semester) throw new BadRequestError("Semester not found");

  const bellSchedule = await prisma.bellSchedule.findUnique({ where: { id: input.bellScheduleId } });
  if (!bellSchedule) throw new BadRequestError("Bell schedule not found");

  return prisma.$transaction(async (tx) => {
    const version = await tx.timetableVersion.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "TIMETABLE_VERSION_CREATED",
        entityType: "TimetableVersion",
        entityId: version.id,
        newValue: toAuditJson(version),
        ...ctx,
      },
      tx
    );
    return version;
  });
}

export async function setTimetableVersionLock(
  session: Session,
  id: string,
  locked: boolean,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const version = await prisma.timetableVersion.findUnique({ where: { id }, include: { class: true } });
  if (!version) throw new NotFoundError("Timetable version not found");
  if (!canAccessDepartment(session, version.class.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.timetableVersion.update({ where: { id }, data: { isLocked: locked } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: locked ? "TIMETABLE_LOCKED" : "TIMETABLE_UNLOCKED",
        entityType: "TimetableVersion",
        entityId: id,
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

export async function listTimetableEntries(timetableVersionId: string) {
  return prisma.timetableEntry.findMany({
    where: { timetableVersionId },
    include: {
      subjectOffering: { include: { subject: true } },
      slots: { include: { bellScheduleSlot: true } },
      teachers: { include: { teacher: true } },
      room: true,
      studentGroup: true,
    },
    orderBy: [{ weekday: "asc" }, { dayOrder: "asc" }],
  });
}

/** Loads every entry that could plausibly conflict with a candidate: the
 * version being edited (self-consistency) plus every other timetable
 * version that hasn't been superseded yet (Section 21: teacher/room
 * conflicts are checked across all departments). Known limitation: an
 * entry on a WEEKDAY-type timetable is never compared against one on a
 * DAY_ORDER-type timetable, since which weekday a given day order falls on
 * requires resolving the academic calendar (Section 23, Phase 4) — not a
 * gap for this college, which uses WEEKDAY exclusively (Section 0).
 */
async function loadComparableEntries(
  tx: Prisma.TransactionClient,
  timetableVersionId: string
): Promise<ExistingEntry[]> {
  const versions = await tx.timetableVersion.findMany({
    where: { OR: [{ effectiveTo: null }, { id: timetableVersionId }] },
    select: { id: true, classId: true },
  });
  const versionIds = versions.map((v) => v.id);

  const entries = await tx.timetableEntry.findMany({
    where: { timetableVersionId: { in: versionIds } },
    include: {
      slots: { include: { bellScheduleSlot: true } },
      teachers: { select: { teacherId: true } },
    },
  });

  const classByVersion = new Map(versions.map((v) => [v.id, v.classId]));

  return entries.map((e) => ({
    id: e.id,
    weekday: e.weekday,
    dayOrder: e.dayOrder,
    timeRanges: e.slots.map((s) => ({ startTime: s.bellScheduleSlot.startTime, endTime: s.bellScheduleSlot.endTime })),
    teacherIds: e.teachers.map((t) => t.teacherId),
    classId: classByVersion.get(e.timetableVersionId) ?? null,
    studentGroupId: e.studentGroupId,
    roomId: e.roomId,
  }));
}

export async function createTimetableEntry(
  session: Session,
  timetableVersionId: string,
  input: CreateTimetableEntryInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const version = await prisma.timetableVersion.findUnique({ where: { id: timetableVersionId } });
  if (!version) throw new NotFoundError("Timetable version not found");

  await requireVersionEditAccess(session, version.classId, version.isLocked);

  if (version.timetableType === "WEEKDAY" && !input.weekday) {
    throw new BadRequestError("This timetable is WEEKDAY-type — weekday is required");
  }
  if (version.timetableType === "DAY_ORDER" && !input.dayOrder) {
    throw new BadRequestError("This timetable is DAY_ORDER-type — dayOrder is required");
  }

  const offering = await prisma.subjectOffering.findUnique({
    where: { id: input.subjectOfferingId },
    include: { studentGroup: true },
  });
  if (!offering) throw new BadRequestError("Subject offering not found");
  if (offering.semesterId !== version.semesterId) {
    throw new BadRequestError("Subject offering does not belong to this timetable's semester");
  }
  const offeringClassId = offering.classId ?? offering.studentGroup?.classId ?? null;
  if (offeringClassId !== version.classId) {
    throw new BadRequestError("Subject offering does not belong to this timetable's class");
  }

  if (input.studentGroupId) {
    const group = await prisma.studentGroup.findUnique({ where: { id: input.studentGroupId } });
    if (!group) throw new BadRequestError("Student group not found");
    if (group.classId !== version.classId) throw new BadRequestError("Student group does not belong to this class");
  }

  const slots = await prisma.bellScheduleSlot.findMany({ where: { id: { in: input.slotIds } } });
  if (slots.length !== input.slotIds.length) throw new BadRequestError("One or more slots not found");
  if (slots.some((s) => s.bellScheduleId !== version.bellScheduleId)) {
    throw new BadRequestError("All slots must belong to this timetable's bell schedule");
  }
  if (slots.some((s) => !isSchedulableSlotType(s.slotType))) {
    throw new BadRequestError("Attendance-bearing entries can only target PERIOD slots, not breaks/lunch/free/event");
  }
  if (!areSlotsConsecutive(slots.map((s) => s.sortOrder))) {
    throw new BadRequestError("A multi-slot entry must use consecutive periods");
  }

  const teachers = await prisma.teacher.findMany({ where: { id: { in: input.teacherIds } } });
  if (teachers.length !== input.teacherIds.length) throw new BadRequestError("One or more teachers not found");

  if (input.roomId) {
    const room = await prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) throw new BadRequestError("Room not found");
  }

  return prisma.$transaction(async (tx) => {
    const comparable = await loadComparableEntries(tx, timetableVersionId);
    const conflicts = validateTimetableEntry(
      {
        weekday: input.weekday ?? null,
        dayOrder: input.dayOrder ?? null,
        timeRanges: slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        teacherIds: input.teacherIds,
        classId: version.classId,
        studentGroupId: input.studentGroupId ?? null,
        roomId: input.roomId ?? null,
      },
      comparable
    );
    if (conflicts.length > 0) throw new ConflictError(conflicts.join("; "));

    const entry = await tx.timetableEntry.create({
      data: {
        timetableVersionId,
        subjectOfferingId: input.subjectOfferingId,
        studentGroupId: input.studentGroupId,
        roomId: input.roomId,
        weekday: input.weekday,
        dayOrder: input.dayOrder,
        isSpecialClass: input.isSpecialClass,
      },
    });

    await tx.timetableEntrySlot.createMany({
      data: input.slotIds.map((bellScheduleSlotId) => ({ timetableEntryId: entry.id, bellScheduleSlotId })),
    });
    await tx.timetableEntryTeacher.createMany({
      data: input.teacherIds.map((teacherId, i) => ({
        timetableEntryId: entry.id,
        teacherId,
        isPrimary: i === 0,
      })),
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "TIMETABLE_ENTRY_CREATED",
        entityType: "TimetableEntry",
        entityId: entry.id,
        newValue: toAuditJson({ ...entry, slotIds: input.slotIds, teacherIds: input.teacherIds }),
        ...ctx,
      },
      tx
    );

    return tx.timetableEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { slots: { include: { bellScheduleSlot: true } }, teachers: { include: { teacher: true } } },
    });
  });
}

export async function deleteTimetableEntry(
  session: Session,
  entryId: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const entry = await prisma.timetableEntry.findUnique({
    where: { id: entryId },
    include: { timetableVersion: true },
  });
  if (!entry) throw new NotFoundError("Timetable entry not found");

  await requireVersionEditAccess(session, entry.timetableVersion.classId, entry.timetableVersion.isLocked);

  return prisma.$transaction(async (tx) => {
    await tx.timetableEntry.delete({ where: { id: entryId } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "TIMETABLE_ENTRY_DELETED",
        entityType: "TimetableEntry",
        entityId: entryId,
        oldValue: toAuditJson(entry),
        ...ctx,
      },
      tx
    );
  });
}
