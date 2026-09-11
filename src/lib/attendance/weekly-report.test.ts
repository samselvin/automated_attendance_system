import { describe, expect, it } from "vitest";
import { mondayOf, weekdaysFrom, percentageBand } from "@/lib/attendance/weekly-report";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

describe("mondayOf", () => {
  it("returns the same date when already a Monday", () => {
    expect(iso(mondayOf(new Date("2026-07-27T00:00:00.000Z")))).toBe("2026-07-27");
  });

  it("rolls a mid-week date back to that week's Monday", () => {
    expect(iso(mondayOf(new Date("2026-07-30T00:00:00.000Z")))).toBe("2026-07-27"); // Thursday
  });

  it("rolls Sunday back to the previous Monday, not forward", () => {
    expect(iso(mondayOf(new Date("2026-08-02T00:00:00.000Z")))).toBe("2026-07-27"); // Sunday
  });
});

describe("weekdaysFrom", () => {
  it("returns Monday through Friday in order", () => {
    const monday = new Date("2026-07-27T00:00:00.000Z");
    const days = weekdaysFrom(monday).map(iso);
    expect(days).toEqual(["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"]);
  });
});

describe("percentageBand", () => {
  it("covers every percentage from 0 to 100 with no gap", () => {
    expect(percentageBand(100)).toBe("GT_80");
    expect(percentageBand(80)).toBe("GT_80");
    expect(percentageBand(79.99)).toBe("P75_TO_80");
    expect(percentageBand(75)).toBe("P75_TO_80");
    expect(percentageBand(74.99)).toBe("P70_TO_75");
    expect(percentageBand(70)).toBe("P70_TO_75");
    expect(percentageBand(69.99)).toBe("P65_TO_70");
    expect(percentageBand(65)).toBe("P65_TO_70");
    expect(percentageBand(64.99)).toBe("LT_65");
    expect(percentageBand(0)).toBe("LT_65");
  });
});
