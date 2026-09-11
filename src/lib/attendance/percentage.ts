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
    if (status === "PRESENT") {
      applicableHours += 1;
      attendedHours += 1;
      continue;
    }
    if (status === "ABSENT") {
      applicableHours += 1;
      continue;
    }

    const setting = status === "APPROVED_LEAVE" ? settings.approvedLeaveCounts : settings.onDutyCounts;
    if (setting === "EXCLUDE_FROM_TOTAL") {
      continue;
    }
    applicableHours += 1;
    if (setting === "COUNT_AS_PRESENT") {
      attendedHours += 1;
    }
    // COUNT_AS_ABSENT: stays in applicableHours, not attendedHours.
  }

  const percentage = applicableHours === 0 ? 0 : (attendedHours / applicableHours) * 100;
  return { applicableHours, attendedHours, percentage };
}

export type AttendanceLevel = "SAFE" | "WARNING" | "CRITICAL";

export function attendanceLevel(percentage: number, safeThreshold: number, warningThreshold: number): AttendanceLevel {
  if (percentage >= safeThreshold) return "SAFE";
  if (percentage >= warningThreshold) return "WARNING";
  return "CRITICAL";
}
