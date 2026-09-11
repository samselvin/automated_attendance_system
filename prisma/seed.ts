import "dotenv/config";
import { PrismaClient, RoleName } from "@prisma/client";
import { generateTempPassword, hashPassword } from "../src/lib/password";
import { DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE } from "../src/lib/sms/template";

const prisma = new PrismaClient();

function csv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function main() {
  console.log("Seeding development data...");

  // ── Permission catalog (Section 12, 17, 27, 30) ─────────────────────────
  const permissionDefs = [
    {
      key: "MARK_LEAVE_OD_DIRECT",
      description:
        "Teacher may set a student straight to Approved Leave / On Duty while taking attendance, without a prior approved request.",
    },
    {
      key: "MANAGE_TIMETABLE_ENTRIES",
      description:
        "Teacher may add or edit timetable entries for permitted classes while the timetable is unlocked.",
    },
    {
      key: "APPROVE_LATE_UNLOCK",
      description: "Class Advisor may approve/reject late-attendance unlock requests for their class.",
    },
    {
      key: "CREATE_SPECIAL_CLASS",
      description: "Class Advisor may create a one-off session outside the timetable for their class.",
    },
    {
      key: "ASSIGN_SUBSTITUTE",
      description: "Class Advisor may assign a substitute teacher for their class.",
    },
    {
      key: "APPROVE_LEAVE_OD",
      description: "Class Advisor may approve/reject Leave, Medical and On-Duty requests for their class.",
    },
  ];
  for (const p of permissionDefs) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: p,
    });
  }

  // ── Department ───────────────────────────────────────────────────────
  const aids = await prisma.department.upsert({
    where: { code: "AIDS" },
    update: {},
    create: { code: "AIDS", name: "Artificial Intelligence and Data Science" },
  });

  // ── Regulation & grading scale (R2022) ──────────────────────────────
  const r2022 = await prisma.regulation.upsert({
    where: { code: "R2022" },
    update: {},
    create: { code: "R2022", name: "Regulation 2022" },
  });

  // Grade points are confirmed by the college; mark ranges below are a
  // placeholder default — adjust in Admin -> Settings -> Grading Scale.
  const grades: Array<{ grade: string; gradePoint: number; min: number; max: number; pass: boolean }> = [
    { grade: "O", gradePoint: 10, min: 91, max: 100, pass: true },
    { grade: "A+", gradePoint: 9, min: 81, max: 90, pass: true },
    { grade: "A", gradePoint: 8, min: 71, max: 80, pass: true },
    { grade: "B+", gradePoint: 7, min: 61, max: 70, pass: true },
    { grade: "B", gradePoint: 6, min: 56, max: 60, pass: true },
    { grade: "C", gradePoint: 5, min: 50, max: 55, pass: true },
    { grade: "U", gradePoint: 0, min: 0, max: 49, pass: false },
  ];
  for (const g of grades) {
    await prisma.gradingScale.upsert({
      where: { regulationId_grade: { regulationId: r2022.id, grade: g.grade } },
      update: { gradePoint: g.gradePoint, minMark: g.min, maxMark: g.max, isPassing: g.pass },
      create: {
        regulationId: r2022.id,
        grade: g.grade,
        gradePoint: g.gradePoint,
        minMark: g.min,
        maxMark: g.max,
        isPassing: g.pass,
      },
    });
  }

  // Default R2022 internal-marks formula (Section 34): CAT 20 + Class Test 5
  // + Assignment 5 + MCQ 10 = 40, applied to every subject of this regulation.
  const componentRules: Array<{ groupKey: string; label: string; weightage: number; hasRetest: boolean; sortOrder: number }> = [
    { groupKey: "CAT", label: "CAT (1, 2, 3)", weightage: 20, hasRetest: true, sortOrder: 1 },
    { groupKey: "CLASS_TEST", label: "Class Test (avg of 5)", weightage: 5, hasRetest: false, sortOrder: 2 },
    { groupKey: "ASSIGNMENT", label: "Assignment (avg of 5)", weightage: 5, hasRetest: false, sortOrder: 3 },
    { groupKey: "MCQ", label: "MCQ (out of 30, scaled to 10)", weightage: 10, hasRetest: false, sortOrder: 4 },
  ];
  for (const c of componentRules) {
    const existing = await prisma.assessmentComponentRule.findFirst({
      where: { regulationId: r2022.id, subjectId: null, groupKey: c.groupKey },
    });
    if (!existing) {
      await prisma.assessmentComponentRule.create({
        data: {
          regulationId: r2022.id,
          subjectId: null,
          groupKey: c.groupKey,
          label: c.label,
          weightage: c.weightage,
          hasRetest: c.hasRetest,
          retestExcludesComponents: c.groupKey === "CAT" ? ["CAT3"] : [],
          sortOrder: c.sortOrder,
        },
      });
    }
  }

  // ── Academic year & semesters ────────────────────────────────────────
  const ay = await prisma.academicYear.upsert({
    where: { label: "2026-2027" },
    update: { isCurrent: true },
    create: {
      label: "2026-2027",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
      isCurrent: true,
    },
  });

  for (let n = 1; n <= 8; n++) {
    const isOdd = n % 2 === 1;
    await prisma.semester.upsert({
      where: { academicYearId_number: { academicYearId: ay.id, number: n } },
      update: {},
      create: {
        academicYearId: ay.id,
        number: n,
        type: isOdd ? "ODD" : "EVEN",
        startDate: isOdd ? new Date("2026-06-01") : new Date("2026-12-01"),
        endDate: isOdd ? new Date("2026-11-30") : new Date("2027-05-31"),
        isCurrent: n === 3, // demo default: 2nd-year class below is in Semester 3
      },
    });
  }

  // ── Demo class: 2 AIDS A ─────────────────────────────────────────────
  await prisma.class.upsert({
    where: {
      departmentId_academicYearId_yearOfStudy_section: {
        departmentId: aids.id,
        academicYearId: ay.id,
        yearOfStudy: 2,
        section: "A",
      },
    },
    update: {},
    create: {
      departmentId: aids.id,
      academicYearId: ay.id,
      yearOfStudy: 2,
      section: "A",
    },
  });

  // ── System settings (Section 0, 24, 31, 32, 33) ─────────────────────
  const settings: Array<{ key: string; value: unknown; description: string }> = [
    { key: "TIMEZONE", value: "Asia/Kolkata", description: "College IANA timezone." },
    { key: "TIMETABLE_TYPE", value: "WEEKDAY", description: "WEEKDAY or DAY_ORDER." },
    { key: "WORKING_DAYS", value: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], description: "Working weekdays." },
    { key: "ATTENDANCE_THRESHOLD_SAFE", value: 80, description: "Percent at/above which attendance is Safe." },
    { key: "ATTENDANCE_THRESHOLD_WARNING", value: 75, description: "Percent at/above which attendance is Warning (below Safe)." },
    { key: "APPROVED_LEAVE_COUNTS_AS", value: "COUNT_AS_ABSENT", description: "How APPROVED_LEAVE counts toward attendance %." },
    { key: "ON_DUTY_COUNTS_AS", value: "COUNT_AS_PRESENT", description: "How ON_DUTY counts toward attendance %." },
    { key: "LEAVE_APPROVAL_MODE", value: "EITHER_CLASS_ADVISOR_OR_HOD", description: "Single-approver rule for LEAVE/MEDICAL." },
    { key: "OD_APPROVAL_MODE", value: "DUAL_CLASS_ADVISOR_AND_HOD", description: "Compulsory dual approval for ON_DUTY." },
    { key: "ATTENDANCE_DAILY_CUTOFF", value: "16:20", description: "Shared daily on-time attendance cutoff, local time." },
    { key: "ATTENDANCE_CORRECTION_WINDOW_DAYS_TEACHER", value: 7, description: "Days a teacher may correct attendance." },
    { key: "PARENT_SMS_LANGUAGE", value: "en", description: "Language for parent SMS templates." },
    { key: "FIRST_HOUR_ABSENCE_SMS_ENABLED", value: true, description: "Send first-hour absence SMS to parents." },
    {
      key: "SMS_TEMPLATE_FIRST_HOUR_ABSENCE",
      value: DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE,
      description: "First-hour absence SMS text — must match the DLT-registered template exactly.",
    },
    {
      key: "INTERNAL_MARKS_ROUNDING",
      value: "NEAREST_INTEGER",
      description: "How the final internal mark is rounded (NEAREST_INTEGER or NONE). The unrounded value is always kept alongside it.",
    },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value as never, description: s.description, scope: "GLOBAL" },
    });
  }

  // ── Bootstrap Admin users (Section 6) ────────────────────────────────
  const bootstrapEmails = csv("INITIAL_ADMIN_EMAILS");
  if (bootstrapEmails.length === 0) {
    console.warn("INITIAL_ADMIN_EMAILS is empty — no Admin user was created. Set it in .env and re-run the seed.");
  }
  const allowedDomains = csv("ALLOWED_EMAIL_DOMAINS").map((d) => d.toLowerCase());

  for (const email of bootstrapEmails) {
    const lower = email.toLowerCase();
    const domain = lower.split("@")[1];
    const isCollegeDomainHod = domain === "psncet.ac.in" && lower.startsWith("hod");

    const user = await prisma.user.upsert({
      where: { email: lower },
      update: { status: "ACTIVE", isBootstrapAdmin: true },
      create: { email: lower, status: "ACTIVE", isBootstrapAdmin: true, emailVerified: false },
    });

    // A compound unique index with a nullable column doesn't dedupe NULLs in
    // Postgres (NULL never matches in ON CONFLICT), so upsert() would insert
    // a fresh row on every re-seed for the college-wide (departmentId=null)
    // case — find the existing row manually instead.
    const targetDepartmentId = isCollegeDomainHod ? aids.id : null;
    const existingRole = await prisma.userRole.findFirst({
      where: { userId: user.id, role: RoleName.ADMIN, departmentId: targetDepartmentId },
    });
    if (existingRole) {
      await prisma.userRole.update({ where: { id: existingRole.id }, data: { status: "ACTIVE" } });
    } else {
      await prisma.userRole.create({
        data: { userId: user.id, role: RoleName.ADMIN, departmentId: targetDepartmentId, status: "ACTIVE" },
      });
    }

    const onAllowedDomain = allowedDomains.includes(domain ?? "");

    // A non-domain bootstrap address may also use password login, but only
    // because it is explicitly listed in INITIAL_ADMIN_EMAILS — this is a
    // per-address opt-in, not a domain-wide one (see auth.ts's Credentials
    // provider).
    console.log(
      `  Bootstrap admin: ${lower} -> ADMIN${isCollegeDomainHod ? ` (scoped to ${aids.code})` : " (college-wide)"}${
        onAllowedDomain ? "" : " [non-domain bootstrap exception]"
      }`
    );

    if (!user.passwordHash) {
      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: true },
      });
      console.log(`    Temp password (change on first login): ${tempPassword}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
