import type { Session } from "next-auth";
import type { Weekday } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAccessDepartment, isAdmin, isTeacher, ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { collegeDateString, collegeTimeString } from "@/lib/time";
import { isPastDailyCutoff } from "@/lib/attendance/window";
import { calculateAttendancePercentage, attendanceLevel, type RecordStatus } from "@/lib/attendance/percentage";
import { NotFoundError } from "@/lib/api-utils";

const WEEKDAYS: Weekday[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export async function getStudentAttendancePercentage(
  session: Session,
  studentId: string,
  filters: { from?: Date; to?: Date; subjectOfferingId?: string } = {}
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const isSelf = session.user.studentId === studentId;
  const authorized = isSelf || isTeacher(session) || (isAdmin(session) && canAccessDepartment(session, student.departmentId));
  if (!authorized) throw new ForbiddenError("Not authorized to view this student's attendance");

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: {
        status: "HELD",
        ...(filters.from || filters.to
          ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
          : {}),
        ...(filters.subjectOfferingId ? { subjectOfferingId: filters.subjectOfferingId } : {}),
      },
    },
    select: { status: true },
  });

  const [approvedLeaveCounts, onDutyCounts, safeThreshold, warningThreshold] = await Promise.all([
    getSetting<string>("APPROVED_LEAVE_COUNTS_AS"),
    getSetting<string>("ON_DUTY_COUNTS_AS"),
    getSetting<number>("ATTENDANCE_THRESHOLD_SAFE"),
    getSetting<number>("ATTENDANCE_THRESHOLD_WARNING"),
  ]);

  const result = calculateAttendancePercentage(records.map((r) => r.status) as RecordStatus[], {
    approvedLeaveCounts: approvedLeaveCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
    onDutyCounts: onDutyCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
  });

  return {
    ...result,
    percentageRounded: Math.round(result.percentage * 100) / 100,
    level: attendanceLevel(result.percentage, safeThreshold, warningThreshold),
  };
}

/**
 * Section 24: a session flagged "Attendance Missing" is one the timetable
 * expected but that hasn't been HELD by the daily cutoff. Since sessions
 * are created lazily (Section 25), a period nobody has opened yet has no
 * AttendanceSession row at all — so this diffs the timetable's expected
 * periods for the date against whichever sessions actually exist.
 */
export async function listMissingAttendance(session: Session, dateStr: string, filters: { departmentId?: string } = {}) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const todayStr = collegeDateString();
  const isToday = dateStr === todayStr;
  const isFuture = dateStr > todayStr;
  if (isFuture) return [];

  const cutoff = await getSetting<string>("ATTENDANCE_DAILY_CUTOFF");
  if (isToday && !isPastDailyCutoff(collegeTimeString(), cutoff)) return [];

  if (filters.departmentId && !canAccessDepartment(session, filters.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  const scope = filters.departmentId
    ? [filters.departmentId]
    : isAdmin(session)
      ? null // null = college-wide, resolved below
      : [];
  if (!isAdmin(session)) throw new UnauthorizedError("Only Admin can view the missing-attendance report");

  const weekday = WEEKDAYS[date.getUTCDay()];

  const versions = await prisma.timetableVersion.findMany({
    where: {
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      class: scope ? { departmentId: { in: scope } } : {},
    },
    include: {
      class: true,
      entries: {
        where: { weekday },
        include: { slots: { include: { bellScheduleSlot: true } }, teachers: true, subjectOffering: { include: { subject: true } } },
      },
    },
  });

  const holidays = await prisma.academicCalendarDay.findMany({
    where: { date, dayType: { in: ["HOLIDAY_GOVT", "HOLIDAY_COLLEGE", "HOLIDAY_EMERGENCY"] } },
  });
  const collegeWideHoliday = holidays.some((h) => h.departmentId === null);
  const holidayDepartments = new Set(holidays.map((h) => h.departmentId).filter((d): d is string => !!d));

  const missing = [];
  for (const version of versions) {
    if (collegeWideHoliday || holidayDepartments.has(version.class.departmentId)) continue;

    for (const entry of version.entries) {
      for (const slot of entry.slots) {
        const periodNumber = slot.bellScheduleSlot.periodNumber;
        if (periodNumber == null) continue;

        const existing = await prisma.attendanceSession.findFirst({
          where: {
            classId: entry.studentGroupId ? null : version.classId,
            studentGroupId: entry.studentGroupId,
            date,
            periodNumber,
          },
        });
        if (existing?.status === "HELD") continue;

        missing.push({
          classId: version.classId,
          className: `${version.class.yearOfStudy}-${version.class.section}`,
          studentGroupId: entry.studentGroupId,
          timetableEntryId: entry.id,
          subjectName: entry.subjectOffering.subject.name,
          periodNumber,
          scheduledStart: slot.bellScheduleSlot.startTime,
          scheduledTeacherIds: entry.teachers.map((t) => t.teacherId),
        });
      }
    }
  }

  return missing;
}
