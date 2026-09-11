import { describe, expect, it } from "vitest";
import { renderTemplate, buildDedupeKey, DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE } from "@/lib/sms/template";

describe("renderTemplate", () => {
  it("substitutes every variable", () => {
    const result = renderTemplate(DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE, {
      student_name: "D. SamSelvin",
      roll_number: "23AIDS001",
      date: "11-09-2026",
      college_name: "PSN CET",
    });
    expect(result).toBe(
      "Dear Parent, your son/daughter D. SamSelvin (23AIDS001) was marked absent in the first hour today, 11-09-2026. - PSN CET"
    );
  });

  it("leaves an unknown placeholder untouched rather than dropping it", () => {
    expect(renderTemplate("Hello {name}, {unknown}", { name: "X" })).toBe("Hello X, {unknown}");
  });

  it("passes through text with no placeholders", () => {
    expect(renderTemplate("no placeholders here", {})).toBe("no placeholders here");
  });
});

describe("buildDedupeKey", () => {
  it("combines student, date and message type", () => {
    expect(buildDedupeKey("stu1", "2026-09-11", "FIRST_HOUR_ABSENCE")).toBe("stu1:2026-09-11:FIRST_HOUR_ABSENCE");
  });

  it("produces different keys for different dates (one SMS per student per day)", () => {
    const a = buildDedupeKey("stu1", "2026-09-11", "FIRST_HOUR_ABSENCE");
    const b = buildDedupeKey("stu1", "2026-09-12", "FIRST_HOUR_ABSENCE");
    expect(a).not.toBe(b);
  });
});
