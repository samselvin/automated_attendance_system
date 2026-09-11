import { describe, expect, it } from "vitest";
import { isLocked, nextFailedAttemptState, MAX_FAILED_LOGIN_ATTEMPTS } from "@/lib/login-lockout";

describe("isLocked", () => {
  it("is false when there is no lock", () => {
    expect(isLocked(null)).toBe(false);
    expect(isLocked(undefined)).toBe(false);
  });

  it("is true while lockedUntil is in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const lockedUntil = new Date("2026-01-01T00:10:00Z");
    expect(isLocked(lockedUntil, now)).toBe(true);
  });

  it("is false once lockedUntil has passed", () => {
    const now = new Date("2026-01-01T00:20:00Z");
    const lockedUntil = new Date("2026-01-01T00:10:00Z");
    expect(isLocked(lockedUntil, now)).toBe(false);
  });
});

describe("nextFailedAttemptState", () => {
  it("increments the counter below the threshold without locking", () => {
    const result = nextFailedAttemptState(0);
    expect(result).toEqual({ failedLoginAttempts: 1, lockedUntil: null });
  });

  it("locks and resets the counter once the threshold is reached", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = nextFailedAttemptState(MAX_FAILED_LOGIN_ATTEMPTS - 1, now);
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockedUntil).not.toBeNull();
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(now.getTime());
  });
});
