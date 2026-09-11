import { describe, expect, it } from "vitest";
import { isWindowOpenForSubmission, isBeforePeriodStart, isPastDailyCutoff } from "@/lib/attendance/window";

describe("isWindowOpenForSubmission", () => {
  it("is open right when the period starts", () => {
    expect(isWindowOpenForSubmission("09:00", "09:00", "16:20")).toBe(true);
  });

  it("is open any time after the period starts, up to the cutoff", () => {
    expect(isWindowOpenForSubmission("09:00", "14:15", "16:20")).toBe(true);
  });

  it("is closed before the period starts", () => {
    expect(isWindowOpenForSubmission("09:00", "08:59", "16:20")).toBe(false);
  });

  it("is open exactly at the cutoff", () => {
    expect(isWindowOpenForSubmission("09:00", "16:20", "16:20")).toBe(true);
  });

  it("is closed just after the cutoff", () => {
    expect(isWindowOpenForSubmission("09:00", "16:21", "16:20")).toBe(false);
  });
});

describe("isBeforePeriodStart", () => {
  it("is true before the period", () => {
    expect(isBeforePeriodStart("09:00", "08:00")).toBe(true);
  });

  it("is false once the period has started", () => {
    expect(isBeforePeriodStart("09:00", "09:00")).toBe(false);
  });
});

describe("isPastDailyCutoff", () => {
  it("is false at exactly the cutoff", () => {
    expect(isPastDailyCutoff("16:20", "16:20")).toBe(false);
  });

  it("is true just after the cutoff", () => {
    expect(isPastDailyCutoff("16:21", "16:20")).toBe(true);
  });
});
