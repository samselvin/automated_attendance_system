import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { canAccessDepartment, isTeacher, ForbiddenError } from "@/lib/rbac";
import { isActiveClassAdvisor } from "@/lib/class-advisor";
import { getSetting } from "@/lib/settings";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import {
  calculateAttendancePercentageFromCounts,
  type RecordStatus,
  type PercentageSettings,
} from "@/lib/attendance/percentage";
import { mondayOf, weekdaysFrom, percentageBand, PERCENTAGE_BAND_LABELS, type PercentageBand } from "@/lib/attendance/weekly-report";

type CountsByStatus = Partial<Record<RecordStatus, number>>;

function rawTotal(counts: CountsByStatus): number {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}

function roundPct(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Section 39's weekly attendance ledger, matching the college's existing
 * paper form: a Monday–Friday daily breakdown, a weekly total, and a
 * running cumulative total since the current semester began. Reachable
 * by Admin (within their department scope) and by the class's own active
 * Class Advisor — matching the paper's "Class Advisor" signature line.
 *
 * "Total Hrs" is the raw count of HELD periods (what a person would get
 * counting the timetable), not the settings-adjusted "applicable hours"
 * used elsewhere for the official percentage — a period never disappears
 * from this ledger just because a college has set Leave or OD to
 * EXCLUDE_FROM_TOTAL for the *official* percentage. "Attended" still
 * respects the college's configured Leave/OD counting rules, the same
 * way every other report in the app does (via
 * calculateAttendancePercentageFromCounts) — it's only the denominator
 * that's kept literal.
 */
export async function getWeeklyAttendanceReport(session: Session, classId: string, weekStartInput: Date) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { department: true, academicYear: true },
  });
  if (!cls) throw new NotFoundError("Class not found");

  const isAdvisor = isTeacher(session) && session.user.teacherId
    ? await isActiveClassAdvisor(session.user.teacherId, classId)
    : false;
  if (!isAdvisor && !canAccessDepartment(session, cls.departmentId)) {
    throw new ForbiddenError("Not authorized for this class");
  }

  const monday = mondayOf(weekStartInput);
  const weekdays = weekdaysFrom(monday);
  const friday = weekdays[4]!;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: { student: true, semester: true },
    orderBy: { student: { rollNumber: "asc" } },
  });
  if (enrollments.length === 0) {
    throw new BadRequestError("This class has no active students to report on");
  }

  // One class, one semester in the overwhelming common case — the first
  // active enrollment's semester anchors the cumulative window's start.
  const semester = enrollments[0]!.semester;
  const semesterStart = semester.startDate;

  const studentIds = enrollments.map((e) => e.studentId);

  const [approvedLeaveCounts, onDutyCounts] = await Promise.all([
    getSetting<string>("APPROVED_LEAVE_COUNTS_AS"),
    getSetting<string>("ON_DUTY_COUNTS_AS"),
  ]);
  const settings: PercentageSettings = {
    approvedLeaveCounts: approvedLeaveCounts as PercentageSettings["approvedLeaveCounts"],
    onDutyCounts: onDutyCounts as PercentageSettings["onDutyCounts"],
  };

  // The week itself: fetched record-by-record (small — one class, one
  // week) so each day can be broken out individually.
  const weekRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId: { in: studentIds },
      session: { status: "HELD", date: { gte: monday, lte: friday } },
    },
    select: { studentId: true, status: true, session: { select: { date: true } } },
  });

  const dailyCountsByStudent = new Map<string, Map<string, CountsByStatus>>();
  for (const r of weekRecords) {
    const dateKey = r.session.date.toISOString().slice(0, 10);
    const byDate = dailyCountsByStudent.get(r.studentId) ?? new Map<string, CountsByStatus>();
    const dayCounts = byDate.get(dateKey) ?? {};
    dayCounts[r.status as RecordStatus] = (dayCounts[r.status as RecordStatus] ?? 0) + 1;
    byDate.set(dateKey, dayCounts);
    dailyCountsByStudent.set(r.studentId, byDate);
  }

  // Cumulative since the semester began, through this week's Friday — one
  // aggregate query rather than one round trip per student (Section 49).
  const cumulativeGrouped = await prisma.attendanceRecord.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds }, session: { status: "HELD", date: { gte: semesterStart, lte: friday } } },
    _count: { _all: true },
  });
  const cumulativeCountsByStudent = new Map<string, CountsByStatus>();
  for (const row of cumulativeGrouped) {
    const bucket = cumulativeCountsByStudent.get(row.studentId) ?? {};
    bucket[row.status as RecordStatus] = row._count._all;
    cumulativeCountsByStudent.set(row.studentId, bucket);
  }

  const weekdayKeys = weekdays.map((d) => d.toISOString().slice(0, 10));

  const rows = enrollments.map((enr) => {
    const byDate = dailyCountsByStudent.get(enr.studentId) ?? new Map<string, CountsByStatus>();
    const daily = weekdayKeys.map((key) => calculateAttendancePercentageFromCounts(byDate.get(key) ?? {}, settings).attendedHours);

    const weekTotalHrs = weekdayKeys.reduce((sum, key) => sum + rawTotal(byDate.get(key) ?? {}), 0);
    const weekAttendedHrs = daily.reduce((sum, n) => sum + n, 0);
    const weekAbsentHrs = weekTotalHrs - weekAttendedHrs;
    const weekPercentage = weekTotalHrs === 0 ? 0 : roundPct((weekAttendedHrs / weekTotalHrs) * 100);

    const cumulativeCounts = cumulativeCountsByStudent.get(enr.studentId) ?? {};
    const cumulativeTotalHrs = rawTotal(cumulativeCounts);
    const cumulativeAttendedHrs = calculateAttendancePercentageFromCounts(cumulativeCounts, settings).attendedHours;
    const cumulativeAbsentHrs = cumulativeTotalHrs - cumulativeAttendedHrs;
    const cumulativePercentage = cumulativeTotalHrs === 0 ? 0 : roundPct((cumulativeAttendedHrs / cumulativeTotalHrs) * 100);

    const previousAttendedHrs = cumulativeAttendedHrs - weekAttendedHrs;

    return {
      rollNumber: enr.student.rollNumber,
      fullName: enr.student.fullName,
      daily,
      weekTotalHrs,
      weekAbsentHrs,
      weekAttendedHrs,
      weekPercentage,
      previousAttendedHrs,
      cumulativeTotalHrs,
      cumulativeAbsentHrs,
      cumulativeAttendedHrs,
      cumulativePercentage,
      band: percentageBand(cumulativePercentage),
    };
  });

  const bandCounts: Record<PercentageBand, number> = { GT_80: 0, P75_TO_80: 0, P70_TO_75: 0, P65_TO_70: 0, LT_65: 0 };
  for (const row of rows) bandCounts[row.band]++;

  return {
    classLabel: `${cls.department.code} ${cls.yearOfStudy}-${cls.section}`,
    departmentName: cls.department.name,
    yearOfStudy: cls.yearOfStudy,
    academicYearLabel: cls.academicYear.label,
    semesterNumber: semester.number,
    semesterType: semester.type,
    batchLabel: enrollments[0]!.student.batchLabel,
    weekStart: weekdayKeys[0]!,
    weekEnd: weekdayKeys[4]!,
    weekdayDates: weekdayKeys,
    rows,
    summary: {
      totalStudents: rows.length,
      bandCounts,
      bandLabels: PERCENTAGE_BAND_LABELS,
    },
  };
}
