import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { calculateAttendancePercentageFromCounts, attendanceLevel, type RecordStatus } from "@/lib/attendance/percentage";
import { notifyUser } from "@/lib/notify";
import { computeMissingAttendance } from "@/server/services/attendance-report.service";
import { collegeDateString } from "@/lib/time";

/**
 * Section 32: "Optionally send low-attendance alerts to the student and
 * Class Advisor on a configurable schedule" — the schedule itself is the
 * Vercel Cron entry that calls this route; this just does one pass.
 *
 * Every per-student read below is a single batched query rather than one
 * round trip per student — a college-wide daily cron over a per-student
 * loop of sequential queries would risk the serverless function's time
 * limit long before it reached a few thousand students.
 */
export async function runLowAttendanceAlerts(): Promise<{ checked: number; notified: number }> {
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

  const students = await prisma.student.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, fullName: true, rollNumber: true },
  });
  if (students.length === 0) return { checked: 0, notified: 0 };
  const studentIds = students.map((s) => s.id);

  const grouped = await prisma.attendanceRecord.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds }, session: { status: "HELD" } },
    _count: { _all: true },
  });
  const countsByStudent = new Map<string, Partial<Record<RecordStatus, number>>>();
  for (const row of grouped) {
    const bucket = countsByStudent.get(row.studentId) ?? {};
    bucket[row.status as RecordStatus] = row._count._all;
    countsByStudent.set(row.studentId, bucket);
  }

  const flagged = students.flatMap((student) => {
    const counts = countsByStudent.get(student.id);
    if (!counts) return [];
    const result = calculateAttendancePercentageFromCounts(counts, settings);
    const level = attendanceLevel(result.percentage, safeThreshold, warningThreshold);
    if (level === "SAFE") return [];
    return [{ student, percentage: Math.round(result.percentage * 100) / 100, level }];
  });

  if (flagged.length === 0) return { checked: students.length, notified: 0 };

  // Latest ACTIVE enrollment per flagged student, in one query: rows come
  // back sorted newest-first, so the first occurrence per studentId wins.
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: { in: flagged.map((f) => f.student.id) }, status: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
    select: { studentId: true, classId: true },
  });
  const classByStudent = new Map<string, string>();
  for (const enr of enrollments) {
    if (!classByStudent.has(enr.studentId)) classByStudent.set(enr.studentId, enr.classId);
  }

  const classIds = [...new Set(classByStudent.values())];
  const advisorPostings = classIds.length
    ? await prisma.classAdvisorPosting.findMany({
        where: { classId: { in: classIds }, status: "ACTIVE" },
        include: { teacher: true },
      })
    : [];
  const advisorsByClass = new Map<string, typeof advisorPostings>();
  for (const posting of advisorPostings) {
    const list = advisorsByClass.get(posting.classId) ?? [];
    list.push(posting);
    advisorsByClass.set(posting.classId, list);
  }

  for (const { student, percentage, level } of flagged) {
    await notifyUser(
      student.userId,
      "LOW_ATTENDANCE",
      `Attendance ${level === "CRITICAL" ? "critical" : "warning"}: ${percentage}%`,
      `Your overall attendance is ${percentage}%, which is ${level === "CRITICAL" ? "below the critical threshold" : "in the warning range"}.`
    );

    const classId = classByStudent.get(student.id);
    const advisors = classId ? (advisorsByClass.get(classId) ?? []) : [];
    for (const advisor of advisors) {
      await notifyUser(
        advisor.teacher.userId,
        "LOW_ATTENDANCE",
        `${student.fullName} (${student.rollNumber}) — ${level.toLowerCase()} attendance`,
        `${percentage}% overall attendance.`
      );
    }
  }

  return { checked: students.length, notified: flagged.length };
}

/** Section 37: "attendance missing (teachers)" — notifies each missing
 * session's scheduled teacher(s) once the daily cutoff has passed. */
export async function runAttendanceMissingAlerts(dateStr: string = collegeDateString()): Promise<{ notified: number }> {
  const missing = await computeMissingAttendance(dateStr, null);
  const teacherIds = [...new Set(missing.flatMap((m) => m.scheduledTeacherIds))];
  if (teacherIds.length === 0) return { notified: 0 };

  const teachers = await prisma.teacher.findMany({ where: { id: { in: teacherIds } } });

  let notified = 0;
  for (const teacher of teachers) {
    const mine = missing.filter((m) => m.scheduledTeacherIds.includes(teacher.id));
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
