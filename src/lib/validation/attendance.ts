import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "APPROVED_LEAVE", "ON_DUTY"]);

export const attendanceRecordInputSchema = z.object({
  studentId: idSchema,
  status: attendanceStatusEnum,
});

export const submitAttendanceSchema = z.object({
  timetableEntryId: idSchema,
  date: dateOnlySchema,
  records: z.array(attendanceRecordInputSchema).min(1),
});

export const correctAttendanceSchema = z.object({
  newStatus: attendanceStatusEnum,
  reason: z.string().trim().min(5).max(500),
});

export const requestUnlockSchema = z.object({
  timetableEntryId: idSchema,
  date: dateOnlySchema,
  reason: z.string().trim().min(5).max(500),
});

export const decideUnlockSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(500).optional(),
});

export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>;
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;
export type RequestUnlockInput = z.infer<typeof requestUnlockSchema>;
export type DecideUnlockInput = z.infer<typeof decideUnlockSchema>;
