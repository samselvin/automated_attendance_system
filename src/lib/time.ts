import { toZonedTime, fromZonedTime, format } from "date-fns-tz";
import { env } from "@/lib/env";

/**
 * All "what time/day is it" logic must go through here so it always uses
 * server time converted to the college timezone (Section 9) — never the
 * device clock, never the server's local timezone.
 */
export function collegeNow(): Date {
  return toZonedTime(new Date(), env.defaultTimezone);
}

export function collegeDateString(date: Date = new Date()): string {
  return format(toZonedTime(date, env.defaultTimezone), "yyyy-MM-dd", {
    timeZone: env.defaultTimezone,
  });
}

export function collegeTimeString(date: Date = new Date()): string {
  return format(toZonedTime(date, env.defaultTimezone), "HH:mm", {
    timeZone: env.defaultTimezone,
  });
}

/** Combine a local "HH:MM" wall-clock time on a given date into a UTC instant. */
export function collegeWallClockToUtc(dateStr: string, hhmm: string): Date {
  return fromZonedTime(`${dateStr}T${hhmm}:00`, env.defaultTimezone);
}

export function compareHHMM(a: string, b: string): number {
  return a.localeCompare(b);
}
