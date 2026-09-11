export type CountSetting = "COUNT_AS_PRESENT" | "COUNT_AS_ABSENT" | "EXCLUDE_FROM_TOTAL";
export type RecordStatus = "PRESENT" | "ABSENT" | "APPROVED_LEAVE" | "ON_DUTY";

export interface PercentageSettings {
  approvedLeaveCounts: CountSetting;
  onDutyCounts: CountSetting;
}

export interface PercentageResult {
  applicableHours: number;
  attendedHours: number;
  /** Unrounded — compare against thresholds using this, display the rounded form. */
  percentage: number;
}

/** One status's contribution to (applicable, attended), multiplied by how many times it occurred. */
function contribution(status: RecordStatus, count: number, settings: PercentageSettings): { applicable: number; attended: number } {
  if (count === 0) return { applicable: 0, attended: 0 };
  if (status === "PRESENT") return { applicable: count, attended: count };
  if (status === "ABSENT") return { applicable: count, attended: 0 };

  const setting = status === "APPROVED_LEAVE" ? settings.approvedLeaveCounts : settings.onDutyCounts;
  if (setting === "EXCLUDE_FROM_TOTAL") return { applicable: 0, attended: 0 };
  return { applicable: count, attended: setting === "COUNT_AS_PRESENT" ? count : 0 };
}

function finish(applicableHours: number, attendedHours: number): PercentageResult {
  const percentage = applicableHours === 0 ? 0 : (attendedHours / applicableHours) * 100;
  return { applicableHours, attendedHours, percentage };
}

/**
 * Section 31: calculated from real HELD sessions only, never calendar days.
 * `statuses` should already be filtered to HELD, non-cancelled sessions for
 * classes the student was actually enrolled in at the time.
 */
export function calculateAttendancePercentage(
  statuses: RecordStatus[],
  settings: PercentageSettings
): PercentageResult {
  let applicableHours = 0;
  let attendedHours = 0;

  for (const status of statuses) {
    const c = contribution(status, 1, settings);
    applicableHours += c.applicable;
    attendedHours += c.attended;
  }

  return finish(applicableHours, attendedHours);
}

/**
 * Same calculation as `calculateAttendancePercentage`, but from pre-aggregated
 * per-status counts (e.g. a Prisma `groupBy`) instead of one array entry per
 * record — lets a report cover many students from a single aggregate query
 * instead of one query (or one array element) per record.
 */
export function calculateAttendancePercentageFromCounts(
  counts: Partial<Record<RecordStatus, number>>,
  settings: PercentageSettings
): PercentageResult {
  let applicableHours = 0;
  let attendedHours = 0;

  for (const status of Object.keys(counts) as RecordStatus[]) {
    const c = contribution(status, counts[status] ?? 0, settings);
    applicableHours += c.applicable;
    attendedHours += c.attended;
  }

  return finish(applicableHours, attendedHours);
}

export type AttendanceLevel = "SAFE" | "WARNING" | "CRITICAL";

export function attendanceLevel(percentage: number, safeThreshold: number, warningThreshold: number): AttendanceLevel {
  if (percentage >= safeThreshold) return "SAFE";
  if (percentage >= warningThreshold) return "WARNING";
  return "CRITICAL";
}
