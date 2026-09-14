import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { adminDepartmentScope, requireRole, ForbiddenError } from "@/lib/rbac";
import { BadRequestError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export const SYSTEM_RESET_CONFIRMATION_PHRASE = "RESET EVERYTHING";

/**
 * Every table that holds day-to-day college data, truncated together so
 * Postgres resolves foreign-key order for us. `departments` is deliberately
 * excluded: `user_roles.department_id` points at it, and TRUNCATE ... CASCADE
 * would be forced to also wipe `user_roles` whole (including every Admin's
 * own ADMIN role) to keep that reference valid. Also excluded: `users`,
 * `user_roles`, `audit_logs`, `system_settings`, `permissions` — accounts,
 * roles, the audit trail and college-wide config aren't "data" in the sense
 * this button means, and audit_logs is never deleted by anything (Section 44).
 */
const TABLES_TO_WIPE = [
  "teacher_permission_grants",
  "regulations",
  "grading_scales",
  "academic_years",
  "semesters",
  "classes",
  "student_groups",
  "student_group_members",
  "rooms",
  "students",
  "parent_contacts",
  "student_enrollments",
  "teachers",
  "class_advisor_postings",
  "subjects",
  "subject_offerings",
  "subject_offering_teachers",
  "bell_schedules",
  "bell_schedule_slots",
  "timetable_versions",
  "timetable_entries",
  "timetable_entry_slots",
  "timetable_entry_teachers",
  "timetable_change_requests",
  "academic_calendar_days",
  "substitute_assignments",
  "attendance_sessions",
  "attendance_records",
  "attendance_corrections",
  "attendance_unlock_requests",
  "leave_requests",
  "assessment_component_rules",
  "assessment_components",
  "marks",
  "semester_results",
  "events",
  "notifications",
  "sms_messages",
  "files",
  "import_jobs",
  "import_rows",
];

function requireCollegeWideAdmin(session: Session) {
  requireRole(session, "ADMIN");
  if (adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Restarting the system is available to a college-wide Admin only");
  }
}

/**
 * Wipes every class/student/teacher/subject/attendance/etc. record back to
 * empty, ready for a fresh first-time setup (docs/guide-admin.md). Admin
 * accounts and their roles are kept so no one is locked out; anyone who was
 * ONLY a Teacher or Student is deactivated (not hard-deleted, since some may
 * be referenced by audit_logs, which is never deleted) rather than left with
 * a dangling role and no profile.
 */
export async function resetSystem(
  session: Session,
  confirmationPhrase: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  if (confirmationPhrase !== SYSTEM_RESET_CONFIRMATION_PHRASE) {
    throw new BadRequestError(`Type "${SYSTEM_RESET_CONFIRMATION_PHRASE}" exactly to confirm`);
  }

  const [studentCount, teacherCount, subjectCount, attendanceRecordCount] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.subject.count(),
    prisma.attendanceRecord.count(),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES_TO_WIPE.join(", ")} RESTART IDENTITY CASCADE;`);

    await tx.userRole.deleteMany({ where: { role: { not: "ADMIN" } } });

    const remaining = await tx.userRole.findMany({ select: { userId: true } });
    const usersWithARole = new Set(remaining.map((r) => r.userId));
    await tx.user.updateMany({
      where: { id: { notIn: [...usersWithARole] }, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SYSTEM_RESET",
        entityType: "System",
        oldValue: { studentCount, teacherCount, subjectCount, attendanceRecordCount },
        reason: "Admin-triggered full system reset",
        ...ctx,
      },
      tx
    );
  });

  return { reset: true };
}
