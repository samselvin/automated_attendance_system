import { describe, expect, it } from "vitest";
import {
  validateBellScheduleSlots,
  validateTimetableEntry,
  isSchedulableSlotType,
  areSlotsConsecutive,
  type SlotInput,
  type ExistingEntry,
  type CandidateEntry,
} from "@/lib/timetable/validate";

function slot(overrides: Partial<SlotInput>): SlotInput {
  return {
    slotType: "PERIOD",
    periodNumber: 1,
    label: "Period 1",
    startTime: "09:00",
    endTime: "09:50",
    sortOrder: 1,
    ...overrides,
  };
}

describe("validateBellScheduleSlots", () => {
  it("accepts a well-formed schedule with no gaps needed", () => {
    const slots = [
      slot({ label: "Period 1", startTime: "09:00", endTime: "09:50", sortOrder: 1 }),
      slot({ label: "Period 2", startTime: "09:50", endTime: "10:40", sortOrder: 2 }),
    ];
    expect(validateBellScheduleSlots(slots)).toEqual([]);
  });

  it("flags an end time at or before its start time", () => {
    const slots = [slot({ label: "Period 1", startTime: "09:50", endTime: "09:00" })];
    const errors = validateBellScheduleSlots(slots);
    expect(errors.some((e) => e.includes("Period 1"))).toBe(true);
  });

  it("flags two overlapping slots", () => {
    const slots = [
      slot({ label: "Period 1", startTime: "09:00", endTime: "09:50" }),
      slot({ label: "Period 2", startTime: "09:40", endTime: "10:30" }),
    ];
    const errors = validateBellScheduleSlots(slots);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("overlaps");
  });

  it("does not flag back-to-back slots that only touch", () => {
    const slots = [
      slot({ label: "Period 1", startTime: "09:00", endTime: "09:50" }),
      slot({ label: "Break", startTime: "09:50", endTime: "10:00", slotType: "SHORT_BREAK" }),
    ];
    expect(validateBellScheduleSlots(slots)).toEqual([]);
  });
});

function entry(overrides: Partial<ExistingEntry>): ExistingEntry {
  return {
    id: "e1",
    weekday: "MONDAY",
    dayOrder: null,
    timeRanges: [{ startTime: "09:00", endTime: "09:50" }],
    teacherIds: ["t1"],
    classId: "class-1",
    studentGroupId: null,
    roomId: "room-1",
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateEntry>): CandidateEntry {
  return {
    weekday: "MONDAY",
    dayOrder: null,
    timeRanges: [{ startTime: "09:00", endTime: "09:50" }],
    teacherIds: ["t2"],
    classId: "class-2",
    studentGroupId: null,
    roomId: "room-2",
    ...overrides,
  };
}

describe("validateTimetableEntry", () => {
  it("has no conflicts against an unrelated existing entry", () => {
    expect(validateTimetableEntry(candidate({}), [entry({})])).toEqual([]);
  });

  it("flags teacher double-booking in an overlapping time range", () => {
    const errors = validateTimetableEntry(candidate({ teacherIds: ["t1"] }), [entry({})]);
    expect(errors.some((e) => e.includes("Teacher"))).toBe(true);
  });

  it("flags teacher double-booking even across different bell schedules with partial overlap", () => {
    const errors = validateTimetableEntry(
      candidate({ teacherIds: ["t1"], timeRanges: [{ startTime: "09:30", endTime: "10:20" }] }),
      [entry({ timeRanges: [{ startTime: "09:00", endTime: "09:50" }] })]
    );
    expect(errors.some((e) => e.includes("Teacher"))).toBe(true);
  });

  it("does not flag the same teacher on a different day", () => {
    const errors = validateTimetableEntry(
      candidate({ teacherIds: ["t1"], weekday: "TUESDAY" }),
      [entry({})]
    );
    expect(errors).toEqual([]);
  });

  it("does not flag the same teacher in a non-overlapping time range", () => {
    const errors = validateTimetableEntry(
      candidate({ teacherIds: ["t1"], timeRanges: [{ startTime: "09:50", endTime: "10:40" }] }),
      [entry({})]
    );
    expect(errors).toEqual([]);
  });

  it("flags room double-booking", () => {
    const errors = validateTimetableEntry(candidate({ roomId: "room-1" }), [entry({})]);
    expect(errors.some((e) => e.includes("Room"))).toBe(true);
  });

  it("flags class double-booking for the same class with no groups", () => {
    const errors = validateTimetableEntry(candidate({ classId: "class-1" }), [entry({})]);
    expect(errors.some((e) => e.includes("Class"))).toBe(true);
  });

  it("allows the same class in the same slot when the groups differ (electives/labs)", () => {
    const errors = validateTimetableEntry(
      candidate({ classId: "class-1", studentGroupId: "group-a" }),
      [entry({ classId: "class-1", studentGroupId: "group-b" })]
    );
    expect(errors.some((e) => e.includes("Class is already"))).toBe(false);
  });

  it("still flags the same class+group scheduled twice", () => {
    const errors = validateTimetableEntry(
      candidate({ classId: "class-1", studentGroupId: "group-a" }),
      [entry({ classId: "class-1", studentGroupId: "group-a" })]
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("excludes the entry being edited from conflict checks against itself", () => {
    const errors = validateTimetableEntry(
      candidate({ teacherIds: ["t1"], excludeEntryId: "e1" }),
      [entry({ id: "e1" })]
    );
    expect(errors).toEqual([]);
  });

  it("collects multiple simultaneous conflicts", () => {
    const errors = validateTimetableEntry(
      candidate({ teacherIds: ["t1"], roomId: "room-1", classId: "class-1" }),
      [entry({})]
    );
    expect(errors.length).toBe(3);
  });
});

describe("isSchedulableSlotType", () => {
  it("allows PERIOD", () => {
    expect(isSchedulableSlotType("PERIOD")).toBe(true);
  });

  it("rejects breaks, lunch, free and event slots", () => {
    for (const t of ["SHORT_BREAK", "TEA_BREAK", "LUNCH", "SPECIAL_BREAK", "FREE", "EVENT"]) {
      expect(isSchedulableSlotType(t)).toBe(false);
    }
  });
});

describe("areSlotsConsecutive", () => {
  it("accepts a single slot", () => {
    expect(areSlotsConsecutive([5])).toBe(true);
  });

  it("accepts a contiguous run regardless of input order", () => {
    expect(areSlotsConsecutive([7, 5, 6])).toBe(true);
  });

  it("rejects a run with a gap", () => {
    expect(areSlotsConsecutive([5, 7])).toBe(false);
  });
});
