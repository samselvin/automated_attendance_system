import type { Session } from "next-auth";
import type { Prisma, Weekday } from "@prisma/client";
import { prisma, LONG_TRANSACTION_OPTIONS } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, ForbiddenError as ApiForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import { collegeDateString, collegeTimeString } from "@/lib/time";
import { isWindowOpenForSubmission } from "@/lib/attendance/window";
import { isFirstNonCancelledPeriod } from "@/lib/attendance/first-hour";
import { runAfterResponse } from "@/lib/jobs/after";
import { queueFirstHourAbsenceSms, processQueuedSms } from "@/server/services/sms.service";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import type { SubmitAttendanceInput, CorrectAttendanceInput } from "@/lib/validation/attendance";

const WEEKDAYS: Weekday[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function resolveWeekday(date: Date): Weekday {
  return WEEKDAYS[date.getUTCDay()];
}

function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function resolveEnrolledStudentIds(
  tx: Prisma.TransactionClient,
  classId: string,
  studentGroupId: string | null,
  date: Date
): Promise<string[]> {
  const enrollments = await tx.studentEnrollment.findMany({
    where: {
      classId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    select: { studentId: true },
  });
  const enrolledIds = new Set(enrollments.map((e) => e.studentId));

  if (!studentGroupId) return [...enrolledIds];

  const members = await tx.studentGroupMember.findMany({
    where: { studentGroupId },
    select: { studentId: true },
  });
  return members.map((m) => m.studentId).filter((id) => enrolledIds.has(id));
}

export async function findHolidayForDate(
  tx: Prisma.TransactionClient,
  departmentId: string,
  date: Date
): Promise<{ id: string; dayType: string } | null> {
  const day = await tx.academicCalendarDay.findFirst({
    where: {
      date,
      OR: [{ departmentId }, { departmentId: null }],
      dayType: { in: ["HOLIDAY_GOVT", "HOLIDAY_COLLEGE", "HOLIDAY_EMERGENCY"] },
    },
  });
  return day;
}

export interface LoadedEntry {
  id: string;
  weekday: Weekday | null;
  dayOrder: number | null;
  studentGroupId: string | null;
  subjectOfferingId: string;
  timetableVersionId: string;
  slots: { bellScheduleSlot: { periodNumber: number | null; startTime: string; endTime: string } }[];
  teachers: { teacherId: string }[];
  timetableVersion: { classId: string; semesterId: string; timetableType: string };
}

export async function loadEntryOrThrow(tx: Prisma.TransactionClient, timetableEntryId: string): Promise<LoadedEntry> {
  const entry = await tx.timetableEntry.findUnique({
    where: { id: timetableEntryId },
    include: {
      slots: { include: { bellScheduleSlot: true }, orderBy: { bellScheduleSlot: { sortOrder: "asc" } } },
      teachers: { select: { teacherId: true } },
      timetableVersion: { select: { classId: true, semesterId: true, timetableType: true } },
    },
  });
  if (!entry) throw new NotFoundError("Timetable entry not found");
  return entry;
}

export async function verifyDateMatchesEntry(
  tx: Prisma.TransactionClient,
  entry: LoadedEntry,
  date: Date
): Promise<void> {
  if (entry.timetableVersion.timetableType === "WEEKDAY") {
    if (resolveWeekday(date) !== entry.weekday) {
      throw new BadRequestError("The given date's weekday does not match this timetable entry");
    }
    return;
  }
  // DAY_ORDER: only resolvable when Admin has declared an explicit override
  // for this date — full rotation computation is a Phase 5 addition (it
  // needs to walk calendar history) and this college uses WEEKDAY only.
  const override = await tx.academicCalendarDay.findFirst({ where: { date } });
  if (!override?.dayOrderOverride || override.dayOrderOverride !== entry.dayOrder) {
    throw new BadRequestError(
      "This date's day order has not been resolved — declare a calendar override for it before taking attendance"
    );
  }
}

export async function authorizeForEntry(
  session: Session,
  tx: Prisma.TransactionClient,
  entry: LoadedEntry,
  date: Date
): Promise<{ actingTeacherId: string | null }> {
  if (isAdmin(session)) {
    const cls = await tx.class.findUniqueOrThrow({ where: { id: entry.timetableVersion.classId } });
    if (!canAccessDepartment(session, cls.departmentId)) throw new ApiForbiddenError("Outside your department scope");
    return { actingTeacherId: session.user.teacherId };
  }

  const teacherId = session.user.teacherId;
  if (!teacherId) throw new UnauthorizedError();

  if (entry.teachers.some((t) => t.teacherId === teacherId)) {
    return { actingTeacherId: teacherId };
  }

  const substitution = await tx.substitution.findFirst({
    where: {
      date,
      substituteTeacherId: teacherId,
      OR: [
        { timetableEntryId: entry.id },
        { classId: entry.timetableVersion.classId, originalTeacherId: { in: entry.teachers.map((t) => t.teacherId) } },
      ],
    },
  });
  if (substitution) return { actingTeacherId: teacherId };

  throw new ApiForbiddenError("This period is assigned to another teacher");
}

/** One AttendanceSession per period in the entry (Section 19: a multi-slot
 * lab entry creates one session per hour, each individually correctable),
 * created lazily and idempotently. */
export async function getOrCreateSessionsForEntry(tx: Prisma.TransactionClient, entry: LoadedEntry, date: Date) {
  const version = await tx.timetableVersion.findUniqueOrThrow({
    where: { id: entry.timetableVersionId },
    include: { semester: { select: { academicYearId: true } } },
  });
  const cls = await tx.class.findUniqueOrThrow({ where: { id: version.classId } });
  const primaryTeacher = entry.teachers[0]?.teacherId ?? null;

  const sessions = [];
  for (const slot of entry.slots) {
    const periodNumber = slot.bellScheduleSlot.periodNumber;
    if (periodNumber == null) throw new BadRequestError("Slot has no periodNumber");

    const existing = await tx.attendanceSession.findFirst({
      where: {
        classId: entry.studentGroupId ? null : version.classId,
        studentGroupId: entry.studentGroupId,
        date,
        periodNumber,
      },
    });
    if (existing) {
      sessions.push(existing);
      continue;
    }

    const created = await tx.attendanceSession.create({
      data: {
        classId: entry.studentGroupId ? null : version.classId,
        studentGroupId: entry.studentGroupId,
        departmentId: cls.departmentId,
        academicYearId: version.semester.academicYearId,
        semesterId: version.semesterId,
        subjectOfferingId: entry.subjectOfferingId,
        timetableVersionId: version.id,
        timetableEntryId: entry.id,
        date,
        periodNumber,
        scheduledStart: slot.bellScheduleSlot.startTime,
        scheduledEnd: slot.bellScheduleSlot.endTime,
        scheduledTeacherId: primaryTeacher,
        status: "SCHEDULED",
      },
    });
    sessions.push(created);
  }
  return sessions;
}

export async function getRoster(session: Session, timetableEntryId: string, dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  return prisma.$transaction(async (tx) => {
    const entry = await loadEntryOrThrow(tx, timetableEntryId);
    await authorizeForEntry(session, tx, entry, date);
    await verifyDateMatchesEntry(tx, entry, date);

    const cls = await tx.class.findUniqueOrThrow({ where: { id: entry.timetableVersion.classId } });
    const holiday = await findHolidayForDate(tx, cls.departmentId, date);
    if (holiday) throw new BadRequestError("This date is a declared holiday — no attendance can be taken");

    const studentIds = await resolveEnrolledStudentIds(tx, entry.timetableVersion.classId, entry.studentGroupId, date);
    const students = await tx.student.findMany({
      where: { id: { in: studentIds } },
      orderBy: { rollNumber: "asc" },
    });

    const firstPeriodNumber = entry.slots[0]?.bellScheduleSlot.periodNumber ?? null;
    const approvedLeaves = await tx.leaveRequest.findMany({
      where: {
        studentId: { in: studentIds },
        status: "APPROVED",
        fromDate: { lte: date },
        toDate: { gte: date },
      },
    });
    const leaveByStudent = new Map(
      approvedLeaves
        .filter((l) => l.isFullDay || (firstPeriodNumber != null && l.periods.includes(firstPeriodNumber)))
        .map((l) => [l.studentId, l])
    );

    const existingSessions = await tx.attendanceSession.findMany({
      where: {
        classId: entry.studentGroupId ? null : entry.timetableVersion.classId,
        studentGroupId: entry.studentGroupId,
        date,
        periodNumber: firstPeriodNumber ?? undefined,
      },
      include: { records: true },
    });
    const recordByStudent = new Map(existingSessions[0]?.records.map((r) => [r.studentId, r]) ?? []);

    return {
      alreadySubmitted: existingSessions.some((s) => s.status === "HELD"),
      students: students.map((s) => {
        const existingRecord = recordByStudent.get(s.id);
        const leave = leaveByStudent.get(s.id);
        return {
          studentId: s.id,
          rollNumber: s.rollNumber,
          fullName: s.fullName,
          suggestedStatus: existingRecord?.status ?? (leave ? (leave.type === "ON_DUTY" ? "ON_DUTY" : "APPROVED_LEAVE") : "PRESENT"),
          isPreFilledFromLeave: !existingRecord && !!leave,
        };
      }),
    };
  });
}

export async function submitAttendance(
  session: Session,
  input: SubmitAttendanceInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const date = input.date;
  let capturedEntry: LoadedEntry | null = null;
  const absentStudentIds: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const entry = await loadEntryOrThrow(tx, input.timetableEntryId);
    capturedEntry = entry;
    const { actingTeacherId } = await authorizeForEntry(session, tx, entry, date);
    await verifyDateMatchesEntry(tx, entry, date);

    const cls = await tx.class.findUniqueOrThrow({ where: { id: entry.timetableVersion.classId } });
    const holiday = await findHolidayForDate(tx, cls.departmentId, date);
    if (holiday) throw new BadRequestError("This date is a declared holiday — no attendance can be taken");

    const studentIds = await resolveEnrolledStudentIds(tx, entry.timetableVersion.classId, entry.studentGroupId, date);
    const submittedIds = input.records.map((r) => r.studentId);
    const missing = studentIds.filter((id) => !submittedIds.includes(id));
    const extra = submittedIds.filter((id) => !studentIds.includes(id));
    if (missing.length > 0) throw new BadRequestError(`Missing records for: ${missing.join(", ")}`);
    if (extra.length > 0) throw new BadRequestError(`Records for students not in this roster: ${extra.join(", ")}`);

    const sessions = await getOrCreateSessionsForEntry(tx, entry, date);
    if (sessions.some((s) => s.status === "HELD")) {
      throw new ConflictError("Attendance for this session has already been submitted — use the correction endpoint");
    }

    const todayStr = collegeDateString();
    const isToday = dateOnlyString(date) === todayStr;
    const cutoff = await getSetting<string>("ATTENDANCE_DAILY_CUTOFF");
    const earliestStart = sessions.reduce((min, s) => (s.scheduledStart < min ? s.scheduledStart : min), sessions[0].scheduledStart);
    const windowOpen = isToday && isWindowOpenForSubmission(earliestStart, collegeTimeString(), cutoff);

    let isLateSubmission = false;
    if (!windowOpen) {
      const unlocks = await tx.attendanceUnlockRequest.findMany({
        where: { sessionId: { in: sessions.map((s) => s.id) }, status: "APPROVED" },
      });
      const unlockedSessionIds = new Set(unlocks.map((u) => u.sessionId));
      if (!sessions.every((s) => unlockedSessionIds.has(s.id))) {
        throw new ApiForbiddenError(
          "Attendance window is closed for this session. Request a late-attendance unlock first."
        );
      }
      isLateSubmission = true;
    }

    const enrollments = await tx.studentEnrollment.findMany({
      where: { studentId: { in: studentIds }, classId: entry.timetableVersion.classId },
    });
    const enrollmentByStudent = new Map(enrollments.map((e) => [e.studentId, e]));

    const firstPeriodNumber = sessions[0].periodNumber;
    const approvedLeaves = await tx.leaveRequest.findMany({
      where: {
        studentId: { in: studentIds },
        status: "APPROVED",
        fromDate: { lte: date },
        toDate: { gte: date },
      },
    });
    const approvedLeaveByStudent = new Map(
      approvedLeaves
        .filter((l) => l.isFullDay || l.periods.includes(firstPeriodNumber))
        .map((l) => [l.studentId, l])
    );

    const markedById = session.user.id;

    for (const record of input.records) {
      const enrollment = enrollmentByStudent.get(record.studentId);
      if (!enrollment) throw new BadRequestError(`Student ${record.studentId} is not enrolled in this class`);

      if (record.status === "ABSENT") absentStudentIds.push(record.studentId);

      let leaveRequestId: string | null = null;

      if (record.status === "APPROVED_LEAVE" || record.status === "ON_DUTY") {
        const existingApproved = approvedLeaveByStudent.get(record.studentId);
        if (existingApproved) {
          leaveRequestId = existingApproved.id;
        } else if (actingTeacherId) {
          const grant = await tx.teacherPermissionGrant.findFirst({
            where: {
              teacherId: actingTeacherId,
              status: "ACTIVE",
              permission: { key: "MARK_LEAVE_OD_DIRECT" },
              OR: [
                { classId: null, departmentId: null },
                { classId: null, departmentId: cls.departmentId },
                { classId: entry.timetableVersion.classId },
              ],
            },
          });
          if (!grant) {
            throw new ApiForbiddenError(
              `Not authorized to mark ${record.status} directly for ${record.studentId} — the student must have an approved request, or you need the MARK_LEAVE_OD_DIRECT permission`
            );
          }
          const created = await tx.leaveRequest.create({
            data: {
              studentId: record.studentId,
              type: record.status === "ON_DUTY" ? "ON_DUTY" : "LEAVE",
              fromDate: date,
              toDate: date,
              isFullDay: false,
              periods: [firstPeriodNumber],
              reason: "Marked directly by teacher while taking attendance",
              source: "TEACHER_MARKED",
              submittedById: markedById,
              status: "APPROVED",
              decidedAt: new Date(),
              markedByTeacherId: actingTeacherId,
              authorizedByHodId: grant.grantedById,
            },
          });
          leaveRequestId = created.id;
        } else {
          throw new ApiForbiddenError(`Not authorized to mark ${record.status} directly for ${record.studentId}`);
        }
      }

      for (const attSession of sessions) {
        await tx.attendanceRecord.create({
          data: {
            sessionId: attSession.id,
            studentId: record.studentId,
            enrollmentId: enrollment.id,
            status: record.status,
            method: leaveRequestId ? "LEAVE_SYNC" : "MANUAL",
            leaveRequestId,
            markedById,
          },
        });
      }
    }

    for (const attSession of sessions) {
      await tx.attendanceSession.update({
        where: { id: attSession.id },
        data: {
          status: "HELD",
          actualTeacherId: actingTeacherId ?? attSession.scheduledTeacherId,
          submittedAt: new Date(),
          isLateSubmission,
        },
      });
    }

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "ATTENDANCE_SUBMITTED",
        entityType: "AttendanceSession",
        entityId: sessions[0].id,
        newValue: toAuditJson({ sessionIds: sessions.map((s) => s.id), records: input.records, isLateSubmission }),
        ...ctx,
      },
      tx
    );

    return { sessionIds: sessions.map((s) => s.id), isLateSubmission, sessions };
  }, LONG_TRANSACTION_OPTIONS);

  // Section 33: fires immediately in the same flow but must never block or
  // break the response — deferred to run after the response is sent.
  if (capturedEntry && absentStudentIds.length > 0) {
    const entryForSms = capturedEntry;
    const submittedPeriodNumbers = result.sessions.map((s) => s.periodNumber);
    runAfterResponse(() => triggerFirstHourSmsForAbsentees(entryForSms, date, absentStudentIds, submittedPeriodNumbers));
  }

  return { sessionIds: result.sessionIds, isLateSubmission: result.isLateSubmission };
}

/** Runs off the request path (via `after()`). Resolves, per department
 * simplification noted below, whether the period just submitted is each
 * absent student's first scheduled period of the day, and if so queues and
 * sends the SMS. Independent DB calls, not the original transaction — a
 * failure here never touches the attendance data already committed. */
async function triggerFirstHourSmsForAbsentees(
  entry: LoadedEntry,
  date: Date,
  absentStudentIds: string[],
  submittedPeriodNumbers: number[]
): Promise<void> {
  try {
    const classId = entry.timetableVersion.classId;
    if (entry.timetableVersion.timetableType !== "WEEKDAY" || !entry.weekday) return;

    // Simplification: "first hour" is resolved from the class's own
    // (non-group) timetable entries. A student whose actual first period
    // is an elective/lab-batch-only session is not covered by this pass —
    // documented as a follow-up refinement, not silently wrong for the
    // common case this college uses.
    const classEntries = await prisma.timetableEntry.findMany({
      where: {
        weekday: entry.weekday,
        studentGroupId: null,
        timetableVersion: { classId, effectiveFrom: { lte: date }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
      },
      include: { slots: { include: { bellScheduleSlot: true } } },
    });
    const allPeriods = classEntries.flatMap((e) =>
      e.slots.map((s) => s.bellScheduleSlot.periodNumber).filter((p): p is number => p != null)
    );
    if (allPeriods.length === 0) return;

    const cancelledSessions = await prisma.attendanceSession.findMany({
      where: { classId, date, status: "CANCELLED", periodNumber: { in: allPeriods } },
    });
    const cancelledPeriods = new Set(cancelledSessions.map((s) => s.periodNumber));

    const isFirstHour = submittedPeriodNumbers.some((p) => isFirstNonCancelledPeriod(p, allPeriods, cancelledPeriods));
    if (!isFirstHour) return;

    for (const studentId of absentStudentIds) {
      const smsId = await prisma.$transaction((tx) => queueFirstHourAbsenceSms(tx, studentId, date));
      if (smsId) await processQueuedSms(smsId);
    }
  } catch (err) {
    console.error("triggerFirstHourSmsForAbsentees failed:", err);
  }
}

export async function correctAttendance(
  session: Session,
  recordId: string,
  input: CorrectAttendanceInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: { session: { include: { timetableVersion: { include: { class: true } } } } },
  });
  if (!record) throw new NotFoundError("Attendance record not found");

  const cls = record.session.timetableVersion?.class;
  if (!cls) throw new BadRequestError("Session has no associated class");
  if (!canAccessDepartment(session, cls.departmentId) && !session.user.teacherId) {
    throw new ApiForbiddenError("Outside your department scope");
  }

  if (!isAdmin(session)) {
    const windowDays = await getSetting<number>("ATTENDANCE_CORRECTION_WINDOW_DAYS_TEACHER");
    const ageMs = Date.now() - record.session.date.getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    if (ageDays > windowDays) {
      throw new ApiForbiddenError(`Correction window has passed (${windowDays} days)`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceRecord.update({
      where: { id: recordId },
      data: { status: input.newStatus },
    });
    await tx.attendanceCorrection.create({
      data: {
        attendanceRecordId: recordId,
        oldStatus: record.status,
        newStatus: input.newStatus,
        reason: input.reason,
        correctedById: session.user.id,
      },
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "ATTENDANCE_CORRECTED",
        entityType: "AttendanceRecord",
        entityId: recordId,
        oldValue: toAuditJson({ status: record.status }),
        newValue: toAuditJson({ status: input.newStatus, reason: input.reason }),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}
