import { describe, expect, it } from "vitest";
import { calculateInternalMarks, roundMark, type ComponentMark } from "@/lib/marks/internal-marks";

const R2022_RULES = [
  { groupKey: "CAT", weightage: 20 },
  { groupKey: "CLASS_TEST", weightage: 5 },
  { groupKey: "ASSIGNMENT", weightage: 5 },
  { groupKey: "MCQ", weightage: 10 },
];

function comp(overrides: Partial<ComponentMark>): ComponentMark {
  return { id: "c1", groupKey: "CAT", maxMarks: 50, marksObtained: 50, isRetestFor: null, ...overrides };
}

describe("calculateInternalMarks — R2022 formula", () => {
  it("computes the full 40-mark total for a perfect student", () => {
    const components: ComponentMark[] = [
      comp({ id: "cat1", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      comp({ id: "cat2", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      comp({ id: "cat3", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      ...[1, 2, 3, 4, 5].map((n) => comp({ id: `ct${n}`, groupKey: "CLASS_TEST", maxMarks: 20, marksObtained: 20 })),
      ...[1, 2, 3, 4, 5].map((n) => comp({ id: `as${n}`, groupKey: "ASSIGNMENT", maxMarks: 10, marksObtained: 10 })),
      comp({ id: "mcq", groupKey: "MCQ", maxMarks: 30, marksObtained: 30 }),
    ];
    const result = calculateInternalMarks(components, R2022_RULES);
    expect(result.totalRaw).toBeCloseTo(40, 5);
  });

  it("scales a single-component group correctly (MCQ: raw/30 * 10)", () => {
    const result = calculateInternalMarks([comp({ id: "mcq", groupKey: "MCQ", maxMarks: 30, marksObtained: 21 })], [
      { groupKey: "MCQ", weightage: 10 },
    ]);
    expect(result.breakdown[0].mark).toBeCloseTo(7, 5); // 21/30 * 10
  });

  it("averages percentages across a group before scaling (Class Test: avg of 5, out of 5)", () => {
    const components = [
      comp({ id: "ct1", groupKey: "CLASS_TEST", maxMarks: 20, marksObtained: 20 }), // 100%
      comp({ id: "ct2", groupKey: "CLASS_TEST", maxMarks: 20, marksObtained: 10 }), // 50%
    ];
    const result = calculateInternalMarks(components, [{ groupKey: "CLASS_TEST", weightage: 5 }]);
    // avg percentage = 75% -> 75% of 5 = 3.75
    expect(result.breakdown[0].mark).toBeCloseTo(3.75, 5);
  });

  it("replaces the original CAT mark with the retest mark when one was taken", () => {
    const components = [
      comp({ id: "cat1", groupKey: "CAT", maxMarks: 50, marksObtained: 10 }), // failed originally
      comp({ id: "cat1-retest", groupKey: "CAT", maxMarks: 50, marksObtained: 45, isRetestFor: "cat1" }),
      comp({ id: "cat2", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      comp({ id: "cat3", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
    ];
    const result = calculateInternalMarks(components, [{ groupKey: "CAT", weightage: 20 }]);
    // effective percentages: 90%, 100%, 100% -> avg 96.666...% -> *20 = 19.333...
    expect(result.breakdown[0].mark).toBeCloseTo((0.9 + 1 + 1) / 3 * 20, 5);
  });

  it("treats an ABSENT component (marksObtained null) as zero", () => {
    const components = [
      comp({ id: "as1", groupKey: "ASSIGNMENT", maxMarks: 10, marksObtained: null }),
      comp({ id: "as2", groupKey: "ASSIGNMENT", maxMarks: 10, marksObtained: 10 }),
    ];
    const result = calculateInternalMarks(components, [{ groupKey: "ASSIGNMENT", weightage: 5 }]);
    // avg percentage = (0 + 100) / 2 = 50% -> 2.5
    expect(result.breakdown[0].mark).toBeCloseTo(2.5, 5);
  });

  it("gives zero for a group with no components entered yet, without crashing", () => {
    const result = calculateInternalMarks([], R2022_RULES);
    expect(result.totalRaw).toBe(0);
    expect(result.breakdown.every((b) => b.mark === 0)).toBe(true);
  });

  it("CAT3 has no retest and is used as-is even when it's the worst score", () => {
    const components = [
      comp({ id: "cat1", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      comp({ id: "cat2", groupKey: "CAT", maxMarks: 50, marksObtained: 50 }),
      comp({ id: "cat3", groupKey: "CAT", maxMarks: 50, marksObtained: 0 }), // no retest exists for it
    ];
    const result = calculateInternalMarks(components, [{ groupKey: "CAT", weightage: 20 }]);
    expect(result.breakdown[0].mark).toBeCloseTo(((1 + 1 + 0) / 3) * 20, 5);
  });
});

describe("roundMark", () => {
  it("rounds to the nearest integer by default", () => {
    expect(roundMark(19.4, "NEAREST_INTEGER")).toBe(19);
    expect(roundMark(19.5, "NEAREST_INTEGER")).toBe(20);
  });

  it("leaves the value untouched when rounding is NONE", () => {
    expect(roundMark(19.333, "NONE")).toBeCloseTo(19.333, 5);
  });
});
