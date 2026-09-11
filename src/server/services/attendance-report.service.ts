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

/** Section 35's subject-wise attendance breakdown on the student app. */
export async function getStudentSubjectWiseAttendance(session: Session, studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const isSelf = session.user.studentId === studentId;
  const authorized = isSelf || isTeacher(session) || (isAdmin(session) && canAccessDepartment(session, student.departmentId));
  if (!authorized) throw new ForbiddenError("Not authorized to view this student's attendance");

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId, session: { status: "HELD" } },
    select: { status: true, session: { select: { subjectOfferingId: true } } },
  });

  const [approvedLeaveCounts, onDutyCounts, safeThreshold, warningThreshold] = await Promise.all([
    getSetting<string>("APPROVED_LEAVE_COUNTS_AS"),
    getSetting<string>("ON_DUTY_COUNTS_AS"),
    getSetting<number>("ATTENDANCE_THRESHOLD_SAFE"),
    getSetting<number>("ATTENDANCE_THRESHOLD_WARNING"),
  ]);
  const settings = {
    approvedLeaveCounts: approvedLeaveCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
    onDutyCounts: onDutyCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
  };

  const byOffering = new Map<string, RecordStatus[]>();
  for (const r of records) {
    const list = byOffering.get(r.session.subjectOfferingId) ?? [];
    list.push(r.status as RecordStatus);
    byOffering.set(r.session.subjectOfferingId, list);
  }

  const offerings = await prisma.subjectOffering.findMany({
    where: { id: { in: [...byOffering.keys()] } },
    include: { subject: true },
  });

  return offerings.map((offering) => {
    const statuses = byOffering.get(offering.id) ?? [];
    const result = calculateAttendancePercentage(statuses, settings);
    return {
      subjectOfferingId: offering.id,
      subjectName: offering.subject.name,
      subjectCode: offering.subject.code,
      percentageRounded: Math.round(result.percentage * 100) / 100,
      level: attendanceLevel(result.percentage, safeThreshold, warningThreshold),
      applicableHours: result.applicableHours,
      attendedHours: result.attendedHours,
    };
  });
}

/**
 * Section 24: a session flagged "Attendance Missing" is one the timetable
 * expected but that hasn't been HELD by the daily cutoff. Since sessions
 * are created lazily (Section 25), a period nobody has opened yet has no
 * AttendanceSession row at all — so this diffs the timetable's expected
 * periods for the date against whichever sessions actually exist.
 */
export async function listMissingAttendance(session: Session, dateStr: string, filters: { departmentId?: string } = {}) {
  if (filters.departmentId && !canAccessDepartment(session, filters.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  if (!isAdmin(session)) throw new UnauthorizedError("Only Admin can view the missing-attendance report");

  const scope = filters.departmentId ? [filters.departmentId] : null;
  return computeMissingAttendance(dateStr, scope);
}

/** Core query, with no session/RBAC dependency, so the daily cron job can
 * call it directly (it authenticates via CRON_SECRET, not a user session). */
export async function computeMissingAttendance(dateStr: string, departmentIds: string[] | null) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const todayStr = collegeDateString();
  const isToday = dateStr === todayStr;
  const isFuture = dateStr > todayStr;
  if (isFuture) return [];

  const cutoff = await getSetting<string>("ATTENDANCE_DAILY_CUTOFF");
  if (isToday && !isPastDailyCutoff(collegeTimeString(), cutoff)) return [];

  const scope = departmentIds;
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

  // One batch fetch of the day's sessions instead of a findFirst per
  // (entry, slot) — a college-wide scan can be hundreds of entries, and
  // this used to issue one sequential query per period (Section 49 requires
  // efficient aggregate queries at this scale, not O(n) round trips).
  const classIds = [...new Set(versions.map((v) => v.classId))];
  const studentGroupIds = [...new Set(versions.flatMap((v) => v.entries.map((e) => e.studentGroupId).filter((id): id is string => !!id)))];
  const existingSessions =
    classIds.length || studentGroupIds.length
      ? await prisma.attendanceSession.findMany({
          where: {
            date,
            OR: [{ classId: { in: classIds } }, { studentGroupId: { in: studentGroupIds } }],
          },
          select: { classId: true, studentGroupId: true, periodNumber: true, status: true },
        })
      : [];
  const sessionKey = (classId: string | null, studentGroupId: string | null, periodNumber: number) =>
    `${classId ?? ""}|${studentGroupId ?? ""}|${periodNumber}`;
  const sessionByKey = new Map(existingSessions.map((s) => [sessionKey(s.classId, s.studentGroupId, s.periodNumber), s]));

  const missing = [];
  for (const version of versions) {
    if (collegeWideHoliday || holidayDepartments.has(version.class.departmentId)) continue;

    for (const entry of version.entries) {
      for (const slot of entry.slots) {
        const periodNumber = slot.bellScheduleSlot.periodNumber;
        if (periodNumber == null) continue;

        const key = sessionKey(entry.studentGroupId ? null : version.classId, entry.studentGroupId, periodNumber);
        const existing = sessionByKey.get(key);
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
