import { z } from "zod";

/**
 * Single source of truth for every `SystemSetting` row this app actually
 * reads (Section 22: "College rules are configurable settings, not
 * hard-coded, wherever practical") — used to render the Admin Settings
 * page and to validate a write before it ever reaches the database. A
 * `key` not listed here is rejected by the update endpoint; nothing can
 * create an arbitrary settings row through the UI.
 */

export type SettingType = "number" | "boolean" | "select" | "time" | "text";

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDef {
  key: string;
  label: string;
  help: string;
  group: string;
  type: SettingType;
  min?: number;
  max?: number;
  options?: SettingOption[];
  /** Used to prefill the form when no row exists yet in the database. */
  fallback: unknown;
}

const COUNT_AS_OPTIONS: SettingOption[] = [
  { value: "COUNT_AS_PRESENT", label: "Counts as present" },
  { value: "COUNT_AS_ABSENT", label: "Counts as absent" },
  { value: "EXCLUDE_FROM_TOTAL", label: "Excluded from the total" },
];

export const SETTINGS_SCHEMA: SettingDef[] = [
  {
    key: "ATTENDANCE_THRESHOLD_SAFE",
    label: "Safe threshold",
    help: "Attendance percent at or above this is shown as Safe.",
    group: "Attendance",
    type: "number",
    min: 0,
    max: 100,
    fallback: 80,
  },
  {
    key: "ATTENDANCE_THRESHOLD_WARNING",
    label: "Warning threshold",
    help: "Attendance percent at or above this (but below Safe) is shown as Warning; anything lower is Critical.",
    group: "Attendance",
    type: "number",
    min: 0,
    max: 100,
    fallback: 75,
  },
  {
    key: "ATTENDANCE_DAILY_CUTOFF",
    label: "Daily attendance cutoff",
    help: "Local time after which a period the timetable expected — but nobody took — is flagged as attendance-missing.",
    group: "Attendance",
    type: "time",
    fallback: "16:20",
  },
  {
    key: "ATTENDANCE_CORRECTION_WINDOW_DAYS_TEACHER",
    label: "Teacher correction window (days)",
    help: "How many days after the fact a teacher (not Admin) may still correct attendance they took.",
    group: "Attendance",
    type: "number",
    min: 0,
    max: 365,
    fallback: 7,
  },
  {
    key: "APPROVED_LEAVE_COUNTS_AS",
    label: "Approved Leave/Medical",
    help: "How an APPROVED_LEAVE record counts toward the attendance percentage.",
    group: "Leave & On-Duty",
    type: "select",
    options: COUNT_AS_OPTIONS,
    fallback: "COUNT_AS_ABSENT",
  },
  {
    key: "ON_DUTY_COUNTS_AS",
    label: "On-Duty",
    help: "How an ON_DUTY record counts toward the attendance percentage.",
    group: "Leave & On-Duty",
    type: "select",
    options: COUNT_AS_OPTIONS,
    fallback: "COUNT_AS_PRESENT",
  },
  {
    key: "CLASS_ADVISOR_MAX_ACTIVE",
    label: "Max active postings per teacher",
    help: "How many classes the same teacher may be an active Class Advisor for at once.",
    group: "Leave & On-Duty",
    type: "number",
    min: 1,
    max: 20,
    fallback: 1,
  },
  {
    key: "INTERNAL_MARKS_ROUNDING",
    label: "Internal marks rounding",
    help: "How the final internal mark is rounded for display. The unrounded value is always kept alongside it.",
    group: "Marks",
    type: "select",
    options: [
      { value: "NEAREST_INTEGER", label: "Nearest integer" },
      { value: "NONE", label: "No rounding" },
    ],
    fallback: "NEAREST_INTEGER",
  },
  {
    key: "FIRST_HOUR_ABSENCE_SMS_ENABLED",
    label: "Send first-hour absence SMS",
    help: "If off, no parent SMS is ever queued, regardless of the SMS provider configuration.",
    group: "SMS",
    type: "boolean",
    fallback: true,
  },
  {
    key: "SMS_TEMPLATE_FIRST_HOUR_ABSENCE",
    label: "First-hour absence SMS text",
    help: "Must match the DLT-registered template exactly, including every {{variable}} — see docs/setup-sms.md.",
    group: "SMS",
    type: "text",
    fallback: "Your ward {{studentName}} ({{rollNumber}}) was marked absent for the first period today, {{date}}.",
  },
];

const RESERVED_SETTINGS: SettingDef[] = [
  {
    key: "TIMEZONE",
    label: "College timezone",
    help: "Seeded but not currently read — DEFAULT_TIMEZONE in the environment is what the app actually uses.",
    group: "Reserved (not yet wired into behavior)",
    type: "text",
    fallback: "Asia/Kolkata",
  },
  {
    key: "TIMETABLE_TYPE",
    label: "Timetable type",
    help: "Seeded but not currently read by any timetable logic.",
    group: "Reserved (not yet wired into behavior)",
    type: "select",
    options: [
      { value: "WEEKDAY", label: "Weekday" },
      { value: "DAY_ORDER", label: "Day order" },
    ],
    fallback: "WEEKDAY",
  },
  {
    key: "LEAVE_APPROVAL_MODE",
    label: "Leave/Medical approval mode",
    help: "Descriptive only — the single-approver rule is implemented directly in the leave/OD service, not read from here.",
    group: "Reserved (not yet wired into behavior)",
    type: "text",
    fallback: "EITHER_CLASS_ADVISOR_OR_HOD",
  },
  {
    key: "OD_APPROVAL_MODE",
    label: "On-Duty approval mode",
    help: "Descriptive only — the dual-approval rule is implemented directly in the OD state machine, not read from here.",
    group: "Reserved (not yet wired into behavior)",
    type: "text",
    fallback: "DUAL_CLASS_ADVISOR_AND_HOD",
  },
  {
    key: "PARENT_SMS_LANGUAGE",
    label: "Parent SMS language",
    help: "Seeded but not currently read — only one SMS template exists today.",
    group: "Reserved (not yet wired into behavior)",
    type: "text",
    fallback: "en",
  },
];

/** Every editable setting, live ones first. */
export const ALL_SETTINGS_SCHEMA: SettingDef[] = [...SETTINGS_SCHEMA, ...RESERVED_SETTINGS];

export function findSettingDef(key: string): SettingDef | undefined {
  return ALL_SETTINGS_SCHEMA.find((s) => s.key === key);
}

/** Builds the right Zod validator for a setting's declared type. */
export function zodSchemaForSetting(def: SettingDef) {
  switch (def.type) {
    case "number": {
      let schema = z.number();
      if (def.min !== undefined) schema = schema.min(def.min);
      if (def.max !== undefined) schema = schema.max(def.max);
      return schema;
    }
    case "boolean":
      return z.boolean();
    case "select":
      return z.enum((def.options ?? []).map((o) => o.value) as [string, ...string[]]);
    case "time":
      return z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be a 24-hour HH:MM time");
    case "text":
      return z.string().min(1).max(2000);
  }
}
