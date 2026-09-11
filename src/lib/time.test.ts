import { describe, expect, it } from "vitest";
import { dayBeforeUtc } from "@/lib/time";

describe("dayBeforeUtc", () => {
  it("subtracts one calendar day", () => {
    expect(dayBeforeUtc(new Date("2026-06-01T00:00:00.000Z")).toISOString()).toBe(
      "2026-05-31T00:00:00.000Z"
    );
  });

  it("rolls back across a month boundary", () => {
    expect(dayBeforeUtc(new Date("2026-03-01T00:00:00.000Z")).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z"
    );
  });

  it("rolls back across a year boundary", () => {
    expect(dayBeforeUtc(new Date("2027-01-01T00:00:00.000Z")).toISOString()).toBe(
      "2026-12-31T00:00:00.000Z"
    );
  });

  it("does not mutate the input", () => {
    const input = new Date("2026-06-01T00:00:00.000Z");
    dayBeforeUtc(input);
    expect(input.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});
