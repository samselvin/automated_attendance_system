import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

const weekdayEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const createTimetableVersionSchema = z.object({
  classId: idSchema,
  semesterId: idSchema,
  bellScheduleId: idSchema,
  timetableType: z.enum(["WEEKDAY", "DAY_ORDER"]),
  effectiveFrom: dateOnlySchema,
  effectiveTo: dateOnlySchema.optional(),
});

export const createTimetableEntrySchema = z
  .object({
    subjectOfferingId: idSchema,
    studentGroupId: idSchema.optional(),
    roomId: idSchema.optional(),
    weekday: weekdayEnum.optional(),
    dayOrder: z.number().int().min(1).max(10).optional(),
    slotIds: z.array(idSchema).min(1),
    teacherIds: z.array(idSchema).min(1),
    isSpecialClass: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.weekday) !== Boolean(v.dayOrder), {
    message: "Exactly one of weekday or dayOrder is required",
    path: ["weekday"],
  });

export type CreateTimetableVersionInput = z.infer<typeof createTimetableVersionSchema>;
export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;
