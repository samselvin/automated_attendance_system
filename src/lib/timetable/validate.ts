/** Pure timetable validation (Section 21) — no DB access, so every rule
 * here is unit-testable in isolation. Services fetch the DB rows and hand
 * them to these functions as plain data. */

export interface SlotInput {
  slotType: string; // SlotType enum value
  periodNumber?: number | null;
  label: string;
  startTime: string; // "HH:MM"
  endTime: string;
  sortOrder: number;
}

/** Detects overlapping or invalid start/end times within one bell schedule. */
export function validateBellScheduleSlots(slots: SlotInput[]): string[] {
  const errors: string[] = [];

  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      errors.push(`"${slot.label}" has an end time (${slot.endTime}) at or before its start time (${slot.startTime})`);
    }
  }

  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.endTime > b.startTime) {
      errors.push(`"${a.label}" (${a.startTime}-${a.endTime}) overlaps "${b.label}" (${b.startTime}-${b.endTime})`);
    }
  }

  return errors;
}

export interface TimeRange {
  startTime: string; // "HH:MM"
  endTime: string;
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

function anyRangeOverlaps(a: TimeRange[], b: TimeRange[]): boolean {
  return a.some((ra) => b.some((rb) => rangesOverlap(ra, rb)));
}

export interface ExistingEntry {
  id: string;
  weekday: string | null;
  dayOrder: number | null;
  timeRanges: TimeRange[];
  teacherIds: string[];
  classId: string | null;
  studentGroupId: string | null;
  roomId: string | null;
}

export interface CandidateEntry {
  weekday: string | null;
  dayOrder: number | null;
  timeRanges: TimeRange[];
  teacherIds: string[];
  classId: string | null;
  studentGroupId: string | null;
  roomId: string | null;
  excludeEntryId?: string; // when editing an existing entry, ignore itself
}

function sameDay(a: { weekday: string | null; dayOrder: number | null }, b: { weekday: string | null; dayOrder: number | null }): boolean {
  if (a.weekday !== null || b.weekday !== null) return a.weekday === b.weekday;
  return a.dayOrder === b.dayOrder;
}

/**
 * Checks one candidate timetable entry against every other entry already
 * scheduled for the same day. `existing` should span every department's
 * timetable entries (Section 21: teacher/room conflicts are checked across
 * all departments), compared here by actual wall-clock time overlap so it
 * works correctly even when two classes use different bell schedules.
 */
export function validateTimetableEntry(candidate: CandidateEntry, existing: ExistingEntry[]): string[] {
  const errors: string[] = [];

  for (const other of existing) {
    if (candidate.excludeEntryId && other.id === candidate.excludeEntryId) continue;
    if (!sameDay(candidate, other)) continue;
    if (!anyRangeOverlaps(candidate.timeRanges, other.timeRanges)) continue;

    const sharedTeachers = candidate.teacherIds.filter((t) => other.teacherIds.includes(t));
    if (sharedTeachers.length > 0) {
      errors.push(`Teacher already assigned to another class in this time slot on this day (entry ${other.id})`);
    }

    if (candidate.roomId && candidate.roomId === other.roomId) {
      errors.push(`Room is already booked for this time slot on this day (entry ${other.id})`);
    }

    // Class double-booking is allowed only when the two entries target
    // different student groups within the same class (electives/labs).
    if (candidate.classId && candidate.classId === other.classId) {
      const differentGroups =
        candidate.studentGroupId !== null &&
        other.studentGroupId !== null &&
        candidate.studentGroupId !== other.studentGroupId;
      if (!differentGroups) {
        errors.push(`Class is already scheduled for this time slot on this day (entry ${other.id})`);
      }
    }

    // A student group is double-booked if the exact same group appears
    // twice in the same slot, regardless of class (shouldn't normally
    // happen since a group belongs to one class, but cheap to check).
    if (candidate.studentGroupId && candidate.studentGroupId === other.studentGroupId) {
      errors.push(`This student group is already scheduled for this time slot on this day (entry ${other.id})`);
    }
  }

  return errors;
}

/** A PERIOD slot with a scheduled class is the only kind attendance (or a
 * timetable entry) may target — Section 8's rule 8. */
export function isSchedulableSlotType(slotType: string): boolean {
  return slotType === "PERIOD";
}

/** True if the sortOrder values form one contiguous run (a multi-period lab
 * block must be consecutive slots, Section 19). */
export function areSlotsConsecutive(sortOrders: number[]): boolean {
  if (sortOrders.length <= 1) return true;
  const sorted = [...sortOrders].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}
