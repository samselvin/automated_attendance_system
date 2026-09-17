import type { Session } from "next-auth";
import type { Weekday } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/rbac";

const WEEKDAYS: Weekday[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * Section 23: today's schedule for a teacher — every entry they're
 * scheduled for or substituting, on the given date, with each entry's
 * attendance status so the dashboard can show "take attendance" vs
 * "already submitted". DAY_ORDER entries are included only when the
 * calendar has an explicit override for that date (see the note in
 * attendance.service.ts's verifyDateMatchesEntry).
 */
export async function getTeacherScheduleForDate(session: Session, dateStr: string) {
  if (!session.user.teacherId) throw new UnauthorizedError("Only a teacher has a personal schedule");
  const teacherId = session.user.teacherId;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const weekday = WEEKDAYS[date.getUTCDay()];

  const dayOverride = await prisma.academicCalendarDay.findFirst({ where: { date } });

  const substitutions = await prisma.substitution.findMany({
    where: { date, substituteTeacherId: teacherId },
  });
  const substituteEntryIds = substitutions.filter((s) => s.timetableEntryId).map((s) => s.timetableEntryId!);
  const substituteClassIds = substitutions.filter((s) => s.classId).map((s) => s.classId!);

  const entries = await prisma.timetableEntry.findMany({
    where: {
      OR: [
        { teachers: { some: { teacherId } } },
        { id: { in: substituteEntryIds } },
        { timetableVersion: { classId: { in: substituteClassIds } } },
      ],
      timetableVersion: {
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
    },
    include: {
      timetableVersion: { include: { class: { include: { department: true } } } },
      subjectOffering: { include: { subject: true } },
      slots: { include: { bellScheduleSlot: true }, orderBy: { bellScheduleSlot: { sortOrder: "asc" } } },
      teachers: true,
      room: true,
      studentGroup: true,
    },
  });

  const relevant = entries.filter((e) => {
    if (e.timetableVersion.timetableType === "WEEKDAY") return e.weekday === weekday;
    return dayOverride?.dayOrderOverride === e.dayOrder;
  });

  const holidays = await prisma.academicCalendarDay.findMany({
    where: { date, dayType: { in: ["HOLIDAY_GOVT", "HOLIDAY_COLLEGE", "HOLIDAY_EMERGENCY"] } },
  });
  const collegeWideHoliday = holidays.some((h) => h.departmentId === null);
  const holidayDepartments = new Set(holidays.map((h) => h.departmentId).filter((d): d is string => !!d));

  const notCancelled = relevant.filter(
    (e) => !collegeWideHoliday && !holidayDepartments.has(e.timetableVersion.class.departmentId)
  );

  const result = [];
  for (const entry of notCancelled) {
    const firstPeriodNumber = entry.slots[0]?.bellScheduleSlot.periodNumber ?? null;
    const existingSession =
      firstPeriodNumber != null
        ? await prisma.attendanceSession.findFirst({
            where: {
              classId: entry.studentGroupId ? null : entry.timetableVersion.classId,
              studentGroupId: entry.studentGroupId,
              date,
              periodNumber: firstPeriodNumber,
            },
          })
        : null;

    const isSubstituting =
      substituteEntryIds.includes(entry.id) ||
      (substituteClassIds.includes(entry.timetableVersion.classId) && !entry.teachers.some((t) => t.teacherId === teacherId));

    result.push({
      timetableEntryId: entry.id,
      // Section 5: a teacher can hold subjects in more than one department,
      // where "2-A" alone is ambiguous — always qualify it with the code.
      className: `${entry.timetableVersion.class.department.code} ${entry.timetableVersion.class.yearOfStudy}-${entry.timetableVersion.class.section}`,
      yearOfStudy: entry.timetableVersion.class.yearOfStudy,
      departmentCode: entry.timetableVersion.class.department.code,
      groupName: entry.studentGroup?.name ?? null,
      subjectName: entry.subjectOffering.subject.name,
      roomName: entry.room?.name ?? null,
      scheduledStart: entry.slots[0]?.bellScheduleSlot.startTime ?? null,
      scheduledEnd: entry.slots[entry.slots.length - 1]?.bellScheduleSlot.endTime ?? null,
      isSubstituting,
      attendanceStatus: existingSession?.status ?? "NOT_STARTED",
    });
  }

  result.sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));
  return result;
}

/** Section 35: "Today's Classes" on the student Home screen, each showing
 * the student's own attendance status once it's been submitted. */
export async function getStudentScheduleForDate(session: Session, dateStr: string) {
  if (!session.user.studentId) throw new UnauthorizedError("Only a student has a personal schedule");
  const studentId = session.user.studentId;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const weekday = WEEKDAYS[date.getUTCDay()];

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, status: "ACTIVE", effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!enrollment) return [];

  const groupIds = (
    await prisma.studentGroupMember.findMany({ where: { studentId }, select: { studentGroupId: true } })
  ).map((g) => g.studentGroupId);

  const dayOverride = await prisma.academicCalendarDay.findFirst({ where: { date } });

  const entries = await prisma.timetableEntry.findMany({
    where: {
      OR: [{ studentGroupId: null }, { studentGroupId: { in: groupIds } }],
      timetableVersion: {
        classId: enrollment.classId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
    },
    include: {
      timetableVersion: { include: { class: true } },
      subjectOffering: { include: { subject: true } },
      slots: { include: { bellScheduleSlot: true }, orderBy: { bellScheduleSlot: { sortOrder: "asc" } } },
      teachers: { include: { teacher: true } },
      room: true,
    },
  });

  const relevant = entries.filter((e) =>
    e.timetableVersion.timetableType === "WEEKDAY" ? e.weekday === weekday : dayOverride?.dayOrderOverride === e.dayOrder
  );

  const holidays = await prisma.academicCalendarDay.findMany({
    where: { date, dayType: { in: ["HOLIDAY_GOVT", "HOLIDAY_COLLEGE", "HOLIDAY_EMERGENCY"] } },
  });
  const collegeWideHoliday = holidays.some((h) => h.departmentId === null);
  const holidayDepartments = new Set(holidays.map((h) => h.departmentId).filter((d): d is string => !!d));
  const notCancelled = relevant.filter(
    (e) => !collegeWideHoliday && !holidayDepartments.has(e.timetableVersion.class.departmentId)
  );

  const result = [];
  for (const entry of notCancelled) {
    const firstPeriodNumber = entry.slots[0]?.bellScheduleSlot.periodNumber ?? null;
    let myStatus: string | null = null;
    if (firstPeriodNumber != null) {
      const attSession = await prisma.attendanceSession.findFirst({
        where: {
          classId: entry.studentGroupId ? null : enrollment.classId,
          studentGroupId: entry.studentGroupId,
          date,
          periodNumber: firstPeriodNumber,
        },
        include: { records: { where: { studentId } } },
      });
      myStatus = attSession?.records[0]?.status ?? null;
    }

    result.push({
      timetableEntryId: entry.id,
      subjectName: entry.subjectOffering.subject.name,
      teacherName: entry.teachers[0]?.teacher.fullName ?? null,
      roomName: entry.room?.name ?? null,
      scheduledStart: entry.slots[0]?.bellScheduleSlot.startTime ?? null,
      scheduledEnd: entry.slots[entry.slots.length - 1]?.bellScheduleSlot.endTime ?? null,
      myStatus,
    });
  }

  result.sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));
  return result;
}
