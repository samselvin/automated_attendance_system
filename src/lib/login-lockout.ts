export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function isLocked(lockedUntil: Date | null | undefined, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** Pure state transition for one failed password attempt — locks the
 * account once the threshold is reached, resetting the counter so the next
 * lockout window starts fresh after it expires. */
export function nextFailedAttemptState(
  currentAttempts: number,
  now: Date = new Date()
): { failedLoginAttempts: number; lockedUntil: Date | null } {
  const attempts = currentAttempts + 1;
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return { failedLoginAttempts: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS) };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}
