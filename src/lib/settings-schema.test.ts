import { describe, expect, it } from "vitest";
import { ALL_SETTINGS_SCHEMA, findSettingDef, zodSchemaForSetting } from "@/lib/settings-schema";

describe("findSettingDef", () => {
  it("finds a known setting by key", () => {
    expect(findSettingDef("ATTENDANCE_THRESHOLD_SAFE")?.type).toBe("number");
  });

  it("returns undefined for an unknown key", () => {
    expect(findSettingDef("NOT_A_REAL_SETTING")).toBeUndefined();
  });
});

describe("zodSchemaForSetting", () => {
  it("enforces the min/max bounds on a number setting", () => {
    const def = findSettingDef("ATTENDANCE_THRESHOLD_SAFE")!;
    const schema = zodSchemaForSetting(def);
    expect(schema.safeParse(80).success).toBe(true);
    expect(schema.safeParse(-1).success).toBe(false);
    expect(schema.safeParse(101).success).toBe(false);
  });

  it("only accepts a real boolean for a boolean setting", () => {
    const def = findSettingDef("FIRST_HOUR_ABSENCE_SMS_ENABLED")!;
    const schema = zodSchemaForSetting(def);
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse("true").success).toBe(false);
  });

  it("only accepts one of the declared options for a select setting", () => {
    const def = findSettingDef("APPROVED_LEAVE_COUNTS_AS")!;
    const schema = zodSchemaForSetting(def);
    expect(schema.safeParse("COUNT_AS_ABSENT").success).toBe(true);
    expect(schema.safeParse("SOMETHING_ELSE").success).toBe(false);
  });

  it("only accepts a 24-hour HH:MM string for a time setting", () => {
    const def = findSettingDef("ATTENDANCE_DAILY_CUTOFF")!;
    const schema = zodSchemaForSetting(def);
    expect(schema.safeParse("16:20").success).toBe(true);
    expect(schema.safeParse("4:20 PM").success).toBe(false);
    expect(schema.safeParse("25:00").success).toBe(false);
  });

  it("rejects an empty string for a text setting", () => {
    const def = findSettingDef("SMS_TEMPLATE_FIRST_HOUR_ABSENCE")!;
    const schema = zodSchemaForSetting(def);
    expect(schema.safeParse("Hello {{studentName}}").success).toBe(true);
    expect(schema.safeParse("").success).toBe(false);
  });

  it("every declared setting's own fallback value passes its own schema", () => {
    for (const def of ALL_SETTINGS_SCHEMA) {
      const result = zodSchemaForSetting(def).safeParse(def.fallback);
      expect(result.success, `${def.key}'s fallback should satisfy its own schema`).toBe(true);
    }
  });
});
