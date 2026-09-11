import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { canAccessDepartment, isAdmin, ForbiddenError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { calculateAttendancePercentage, attendanceLevel, type RecordStatus } from "@/lib/attendance/percentage";
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

  const rows = await Promise.all(
    enrollments.map(async (enr) => {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentId: enr.studentId,
          session: {
            status: "HELD",
            ...(filters.from || filters.to
              ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
              : {}),
          },
        },
        select: { status: true },
      });
      const result = calculateAttendancePercentage(records.map((r) => r.status) as RecordStatus[], settings);
      const percentage = Math.round(result.percentage * 100) / 100;
      return {
        rollNumber: enr.student.rollNumber,
        fullName: enr.student.fullName,
        applicableHours: result.applicableHours,
        attendedHours: result.attendedHours,
        percentage,
        level: attendanceLevel(result.percentage, safeThreshold, warningThreshold),
      };
    })
  );

  return { className: `${cls.yearOfStudy}-${cls.section}`, rows };
}

/** Section 32/39: students below the warning threshold, college/department-wide. */
export async function getLowAttendanceReport(session: Session, departmentId?: string) {
  if (departmentId && !canAccessDepartment(session, departmentId)) throw new ForbiddenError("Outside your department scope");
  if (!isAdmin(session)) throw new ForbiddenError("Only Admin can view this report");

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE", ...(departmentId ? { departmentId } : {}) },
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

  const rows = [];
  for (const student of students) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id, session: { status: "HELD" } },
      select: { status: true },
    });
    if (records.length === 0) continue;
    const result = calculateAttendancePercentage(records.map((r) => r.status) as RecordStatus[], settings);
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
