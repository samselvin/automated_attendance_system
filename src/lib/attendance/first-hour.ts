/**
 * Section 33: "first hour" means the first scheduled academic session of
 * the student's day. If that session is cancelled, the next scheduled one
 * takes its place. Pure so the tie-breaking logic is unit-testable without
 * a database.
 */
export function isFirstNonCancelledPeriod(
  candidatePeriodNumber: number,
  allPeriodNumbersForDay: number[],
  cancelledPeriodNumbers: Set<number>
): boolean {
  const sorted = [...new Set(allPeriodNumbersForDay)].sort((a, b) => a - b);
  const firstLive = sorted.find((p) => !cancelledPeriodNumbers.has(p));
  return firstLive !== undefined && firstLive === candidatePeriodNumber;
}
