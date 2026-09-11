import { describe, expect, it } from "vitest";
import { calculateAttendancePercentage, attendanceLevel } from "@/lib/attendance/percentage";

const DEFAULT_SETTINGS = { approvedLeaveCounts: "COUNT_AS_ABSENT" as const, onDutyCounts: "COUNT_AS_PRESENT" as const };

describe("calculateAttendancePercentage", () => {
  it("is 100% when every session is present", () => {
    const result = calculateAttendancePercentage(["PRESENT", "PRESENT", "PRESENT"], DEFAULT_SETTINGS);
    expect(result).toEqual({ applicableHours: 3, attendedHours: 3, percentage: 100 });
  });

  it("counts absences against the percentage", () => {
    const result = calculateAttendancePercentage(["PRESENT", "ABSENT"], DEFAULT_SETTINGS);
    expect(result.applicableHours).toBe(2);
    expect(result.attendedHours).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("counts APPROVED_LEAVE as absent when configured COUNT_AS_ABSENT", () => {
    const result = calculateAttendancePercentage(["PRESENT", "APPROVED_LEAVE"], DEFAULT_SETTINGS);
    expect(result.applicableHours).toBe(2);
    expect(result.attendedHours).toBe(1);
  });

  it("counts ON_DUTY as present when configured COUNT_AS_PRESENT", () => {
    const result = calculateAttendancePercentage(["PRESENT", "ON_DUTY"], DEFAULT_SETTINGS);
    expect(result.applicableHours).toBe(2);
    expect(result.attendedHours).toBe(2);
  });

  it("excludes EXCLUDE_FROM_TOTAL statuses from both totals", () => {
    const result = calculateAttendancePercentage(["PRESENT", "APPROVED_LEAVE"], {
      approvedLeaveCounts: "EXCLUDE_FROM_TOTAL",
      onDutyCounts: "COUNT_AS_PRESENT",
    });
    expect(result).toEqual({ applicableHours: 1, attendedHours: 1, percentage: 100 });
  });

  it("is 0% (not NaN) when there are no applicable sessions", () => {
    const result = calculateAttendancePercentage([], DEFAULT_SETTINGS);
    expect(result.percentage).toBe(0);
  });

  it("returns an unrounded percentage for threshold comparison", () => {
    const result = calculateAttendancePercentage(["PRESENT", "PRESENT", "ABSENT"], DEFAULT_SETTINGS);
    expect(result.percentage).toBeCloseTo(66.666, 2);
  });
});

describe("attendanceLevel", () => {
  it("is SAFE at or above the safe threshold", () => {
    expect(attendanceLevel(80, 80, 75)).toBe("SAFE");
    expect(attendanceLevel(95, 80, 75)).toBe("SAFE");
  });

  it("is WARNING between the thresholds", () => {
    expect(attendanceLevel(75, 80, 75)).toBe("WARNING");
    expect(attendanceLevel(79.99, 80, 75)).toBe("WARNING");
  });

  it("is CRITICAL below the warning threshold", () => {
    expect(attendanceLevel(74.99, 80, 75)).toBe("CRITICAL");
  });
});
