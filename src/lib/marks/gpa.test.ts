import { describe, expect, it } from "vitest";
import { calculateWeightedGpa, calculateSgpa, calculateCgpa, selectEffectiveAttempts, type SubjectResult } from "@/lib/marks/gpa";

function result(overrides: Partial<SubjectResult>): SubjectResult {
  return { subjectId: "s1", attemptNumber: 1, credits: 3, gradePoint: 8, isPass: true, ...overrides };
}

describe("calculateWeightedGpa", () => {
  it("computes the credit-weighted average", () => {
    const gpa = calculateWeightedGpa([
      { credits: 3, gradePoint: 8 },
      { credits: 4, gradePoint: 10 },
    ]);
    // (3*8 + 4*10) / 7 = 64/7
    expect(gpa).toBeCloseTo(64 / 7, 5);
  });

  it("is 0 (not NaN) with zero total credits", () => {
    expect(calculateWeightedGpa([])).toBe(0);
  });
});

describe("calculateSgpa", () => {
  it("only uses first-attempt results, ignoring later re-attempts", () => {
    const results = [
      result({ subjectId: "s1", attemptNumber: 1, credits: 3, gradePoint: 0, isPass: false }),
      result({ subjectId: "s1", attemptNumber: 2, credits: 3, gradePoint: 8, isPass: true }),
      result({ subjectId: "s2", attemptNumber: 1, credits: 4, gradePoint: 9, isPass: true }),
    ];
    // SGPA is a historical snapshot: only attempt 1 rows count, so s1's
    // original fail (gradePoint 0) is what shows here, not the later retake.
    const sgpa = calculateSgpa(results);
    expect(sgpa).toBeCloseTo((3 * 0 + 4 * 9) / 7, 5);
  });
});

describe("selectEffectiveAttempts", () => {
  it("picks the latest passing attempt when the subject was eventually cleared", () => {
    const results = [
      result({ subjectId: "s1", attemptNumber: 1, gradePoint: 0, isPass: false }),
      result({ subjectId: "s1", attemptNumber: 2, gradePoint: 6, isPass: true }),
    ];
    const effective = selectEffectiveAttempts(results);
    expect(effective).toHaveLength(1);
    expect(effective[0].attemptNumber).toBe(2);
  });

  it("falls back to the latest attempt when the subject has never been passed", () => {
    const results = [
      result({ subjectId: "s1", attemptNumber: 1, gradePoint: 0, isPass: false }),
      result({ subjectId: "s1", attemptNumber: 2, gradePoint: 0, isPass: false }),
    ];
    const effective = selectEffectiveAttempts(results);
    expect(effective[0].attemptNumber).toBe(2);
    expect(effective[0].isPass).toBe(false);
  });

  it("does not let an earlier pass get shadowed by picking the wrong one when there are 3+ attempts", () => {
    const results = [
      result({ subjectId: "s1", attemptNumber: 1, gradePoint: 0, isPass: false }),
      result({ subjectId: "s1", attemptNumber: 2, gradePoint: 5, isPass: true }),
      result({ subjectId: "s1", attemptNumber: 3, gradePoint: 7, isPass: true }),
    ];
    // Latest PASSING attempt, not just latest attempt — here they coincide (3),
    // but the selection must be by pass status first, not just max attemptNumber.
    expect(selectEffectiveAttempts(results)[0].attemptNumber).toBe(3);
  });
});

describe("calculateCgpa", () => {
  it("uses the effective attempt per subject across all semesters", () => {
    const results = [
      result({ subjectId: "s1", attemptNumber: 1, credits: 3, gradePoint: 0, isPass: false }),
      result({ subjectId: "s1", attemptNumber: 2, credits: 3, gradePoint: 7, isPass: true }),
      result({ subjectId: "s2", attemptNumber: 1, credits: 4, gradePoint: 9, isPass: true }),
    ];
    const cgpa = calculateCgpa(results);
    expect(cgpa).toBeCloseTo((3 * 7 + 4 * 9) / 7, 5);
  });
});
