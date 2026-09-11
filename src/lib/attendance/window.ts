/**
 * Section 24: the daily attendance window opens when the period starts and
 * closes at one shared daily cutoff (default 16:20) that applies to every
 * period that day. All times are "HH:MM" local wall-clock strings compared
 * lexicographically, which works correctly for zero-padded 24-hour time.
 */
export function isWindowOpenForSubmission(scheduledStartHHMM: string, nowHHMM: string, cutoffHHMM: string): boolean {
  return nowHHMM >= scheduledStartHHMM && nowHHMM <= cutoffHHMM;
}

export function isBeforePeriodStart(scheduledStartHHMM: string, nowHHMM: string): boolean {
  return nowHHMM < scheduledStartHHMM;
}

export function isPastDailyCutoff(nowHHMM: string, cutoffHHMM: string): boolean {
  return nowHHMM > cutoffHHMM;
}
