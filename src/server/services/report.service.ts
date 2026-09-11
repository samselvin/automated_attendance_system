import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { canAccessDepartment, isAdmin, ForbiddenError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import {
  calculateAttendancePercentageFromCounts,
  attendanceLevel,
  type RecordStatus,
} from "@/lib/attendance/percentage";
import { BadRequestError } from "@/lib/api-utils";

/** Section 39: class-wise attendance report for a date range. */
export async function getClassAttendanceReport(
  session: Session,
  classId: string,
  filters: { from?: Date; to?: Date } = {}
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new BadRequestError("Class not found");
  if (!canAccessDepartment(session, cls.departmentId)) throw new ForbiddenError("Outside your department scope");

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: { student: true },
    orderBy: { student: { rollNumber: "asc" } },
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

  const studentIds = enrollments.map((enr) => enr.studentId);
  const grouped = studentIds.length
    ? await prisma.attendanceRecord.groupBy({
        by: ["studentId", "status"],
        where: {
          studentId: { in: studentIds },
          session: {
            status: "HELD",
            ...(filters.from || filters.to
              ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
              : {}),
          },
        },
        _count: { _all: true },
      })
    : [];

  const countsByStudent = new Map<string, Partial<Record<RecordStatus, number>>>();
  for (const row of grouped) {
    const bucket = countsByStudent.get(row.studentId) ?? {};
    bucket[row.status as RecordStatus] = row._count._all;
    countsByStudent.set(row.studentId, bucket);
  }

  const rows = enrollments.map((enr) => {
    const result = calculateAttendancePercentageFromCounts(countsByStudent.get(enr.studentId) ?? {}, settings);
    const percentage = Math.round(result.percentage * 100) / 100;
    return {
      rollNumber: enr.student.rollNumber,
      fullName: enr.student.fullName,
      applicableHours: result.applicableHours,
      attendedHours: result.attendedHours,
      percentage,
      level: attendanceLevel(result.percentage, safeThreshold, warningThreshold),
    };
  });

  return { className: `${cls.yearOfStudy}-${cls.section}`, rows };
}

/**
 * Section 32/39: students below the warning threshold, college/department-wide.
 *
 * Computed from one grouped aggregate query rather than one query per
 * student — the earlier per-student loop meant a college-wide report issued
 * thousands of sequential round trips to the database (Section 49 requires
 * "efficient aggregate queries for percentages" at exactly this scale).
 */
export async function getLowAttendanceReport(session: Session, departmentId?: string) {
  if (departmentId && !canAccessDepartment(session, departmentId)) throw new ForbiddenError("Outside your department scope");
  if (!isAdmin(session)) throw new ForbiddenError("Only Admin can view this report");

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", ...(departmentId ? { departmentId } : {}) },
    select: { id: true, rollNumber: true, fullName: true },
  });
  if (students.length === 0) return [];
  const studentIds = students.map((s) => s.id);

  const [approvedLeaveCounts, onDutyCounts, safeThreshold, warningThreshold, grouped] = await Promise.all([
    getSetting<string>("APPROVED_LEAVE_COUNTS_AS"),
    getSetting<string>("ON_DUTY_COUNTS_AS"),
    getSetting<number>("ATTENDANCE_THRESHOLD_SAFE"),
    getSetting<number>("ATTENDANCE_THRESHOLD_WARNING"),
    prisma.attendanceRecord.groupBy({
      by: ["studentId", "status"],
      where: { studentId: { in: studentIds }, session: { status: "HELD" } },
      _count: { _all: true },
    }),
  ]);
  const settings = {
    approvedLeaveCounts: approvedLeaveCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
    onDutyCounts: onDutyCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
  };

  const countsByStudent = new Map<string, Partial<Record<RecordStatus, number>>>();
  for (const row of grouped) {
    const bucket = countsByStudent.get(row.studentId) ?? {};
    bucket[row.status as RecordStatus] = row._count._all;
    countsByStudent.set(row.studentId, bucket);
  }

  const rows = [];
  for (const student of students) {
    const counts = countsByStudent.get(student.id);
    if (!counts) continue; // no HELD sessions yet — nothing to report
    const result = calculateAttendancePercentageFromCounts(counts, settings);
    const level = attendanceLevel(result.percentage, safeThreshold, warningThreshold);
    if (level === "SAFE") continue;
    rows.push({
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      percentage: Math.round(result.percentage * 100) / 100,
      level,
    });
  }

  return rows;
}
