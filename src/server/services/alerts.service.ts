import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { calculateAttendancePercentage, attendanceLevel, type RecordStatus } from "@/lib/attendance/percentage";
import { notifyUser } from "@/lib/notify";
import { computeMissingAttendance } from "@/server/services/attendance-report.service";
import { collegeDateString } from "@/lib/time";

/** Section 32: "Optionally send low-attendance alerts to the student and
 * Class Advisor on a configurable schedule" — the schedule itself is the
 * Vercel Cron entry that calls this route; this just does one pass. */
export async function runLowAttendanceAlerts(): Promise<{ checked: number; notified: number }> {
  const [approvedLeaveCounts, onDutyCounts, safeThreshold, warningThreshold] = await Promise.all([
    getSetting<string>("APPROVED_LEAVE_COUNTS_AS"),
    getSetting<string>("ON_DUTY_COUNTS_AS"),
    getSetting<number>("ATTENDANCE_THRESHOLD_SAFE"),
    getSetting<number>("ATTENDANCE_THRESHOLD_WARNING"),
  ]);

  const students = await prisma.student.findMany({ where: { status: "ACTIVE" } });
  let notified = 0;

  for (const student of students) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: student.id, session: { status: "HELD" } },
      select: { status: true },
    });
    if (records.length === 0) continue;

    const result = calculateAttendancePercentage(records.map((r) => r.status) as RecordStatus[], {
      approvedLeaveCounts: approvedLeaveCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
      onDutyCounts: onDutyCounts as "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL",
    });
    const level = attendanceLevel(result.percentage, safeThreshold, warningThreshold);
    if (level === "SAFE") continue;

    const rounded = Math.round(result.percentage * 100) / 100;
    await notifyUser(
      student.userId,
      "LOW_ATTENDANCE",
      `Attendance ${level === "CRITICAL" ? "critical" : "warning"}: ${rounded}%`,
      `Your overall attendance is ${rounded}%, which is ${level === "CRITICAL" ? "below the critical threshold" : "in the warning range"}.`
    );

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: student.id, status: "ACTIVE" },
      orderBy: { effectiveFrom: "desc" },
    });
    if (enrollment) {
      const advisors = await prisma.classAdvisorPosting.findMany({
        where: { classId: enrollment.classId, status: "ACTIVE" },
        include: { teacher: true },
      });
      for (const advisor of advisors) {
        await notifyUser(
          advisor.teacher.userId,
          "LOW_ATTENDANCE",
          `${student.fullName} (${student.rollNumber}) — ${level.toLowerCase()} attendance`,
          `${rounded}% overall attendance.`
        );
      }
    }
    notified++;
  }

  return { checked: students.length, notified };
}

/** Section 37: "attendance missing (teachers)" — notifies each missing
 * session's scheduled teacher(s) once the daily cutoff has passed. */
export async function runAttendanceMissingAlerts(dateStr: string = collegeDateString()): Promise<{ notified: number }> {
  const missing = await computeMissingAttendance(dateStr, null);
  const teacherIds = new Set(missing.flatMap((m) => m.scheduledTeacherIds));

  let notified = 0;
  for (const teacherId of teacherIds) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) continue;
    const mine = missing.filter((m) => m.scheduledTeacherIds.includes(teacherId));
    await notifyUser(
      teacher.userId,
      "ATTENDANCE_MISSING",
      `${mine.length} session(s) missing attendance`,
      mine.map((m) => `${m.className} · ${m.subjectName} · Period ${m.periodNumber}`).join("; ")
    );
    notified++;
  }
  return { notified };
}
