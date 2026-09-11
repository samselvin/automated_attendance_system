import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, generateTempPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-1");
    expect(await verifyPassword("Correct-Horse-Battery-1", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-1");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("SamePassword1");
    const b = await hashPassword("SamePassword1");
    expect(a).not.toBe(b);
    expect(await verifyPassword("SamePassword1", a)).toBe(true);
    expect(await verifyPassword("SamePassword1", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("generates a password of the requested length", () => {
    expect(generateTempPassword(14)).toHaveLength(14);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it("generates different passwords on each call", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).not.toBe(b);
  });
});
