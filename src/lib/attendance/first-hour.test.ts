import { describe, expect, it } from "vitest";
import { isFirstNonCancelledPeriod } from "@/lib/attendance/first-hour";

describe("isFirstNonCancelledPeriod", () => {
  it("is true for period 1 when nothing is cancelled", () => {
    expect(isFirstNonCancelledPeriod(1, [1, 2, 3], new Set())).toBe(true);
  });

  it("is false for period 2 when period 1 exists and isn't cancelled", () => {
    expect(isFirstNonCancelledPeriod(2, [1, 2, 3], new Set())).toBe(false);
  });

  it("shifts to period 2 when period 1 is cancelled", () => {
    expect(isFirstNonCancelledPeriod(2, [1, 2, 3], new Set([1]))).toBe(true);
    expect(isFirstNonCancelledPeriod(1, [1, 2, 3], new Set([1]))).toBe(false);
  });

  it("handles unsorted and duplicate period lists", () => {
    expect(isFirstNonCancelledPeriod(1, [3, 1, 2, 1], new Set())).toBe(true);
  });

  it("is false for every period when all are cancelled", () => {
    expect(isFirstNonCancelledPeriod(1, [1, 2], new Set([1, 2]))).toBe(false);
    expect(isFirstNonCancelledPeriod(2, [1, 2], new Set([1, 2]))).toBe(false);
  });
});
