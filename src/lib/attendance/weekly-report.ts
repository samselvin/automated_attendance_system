/**
 * Pure helpers for the Weekly Attendance Report (Section 39) — a
 * Monday-to-Friday ledger matching the college's existing paper form:
 * per-student daily hours, a weekly total, and a running cumulative
 * total since the semester began.
 */

/** Snaps any date to the Monday that starts its week (UTC-safe — dates
 * here are always `@db.Date` values with no time component). */
export function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day; // Sunday rolls back to the *previous* Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** The five weekdays (Monday–Friday) of the week `monday` starts. */
export function weekdaysFrom(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

export type PercentageBand = "GT_80" | "P75_TO_80" | "P70_TO_75" | "P65_TO_70" | "LT_65";

export const PERCENTAGE_BAND_LABELS: Record<PercentageBand, string> = {
  GT_80: "Greater than 80%",
  P75_TO_80: "75% to 80%",
  P70_TO_75: "70% to 75%",
  P65_TO_70: "65% to 70%",
  LT_65: "Below 65%",
};

/**
 * Five contiguous, non-overlapping bands (Section 39) — every student
 * always falls in exactly one, unlike the original paper form's bands
 * (>80 / 75–80 / 70–75 / 65–70 / "below 60") which left 60–64.99%
 * uncounted. Boundaries are inclusive on the lower edge, matching the
 * app's existing SAFE/WARNING/CRITICAL convention (percentage.ts).
 */
export function percentageBand(percentage: number): PercentageBand {
  if (percentage >= 80) return "GT_80";
  if (percentage >= 75) return "P75_TO_80";
  if (percentage >= 70) return "P70_TO_75";
  if (percentage >= 65) return "P65_TO_70";
  return "LT_65";
}
