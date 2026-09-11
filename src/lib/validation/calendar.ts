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

export const declareCalendarDaySchema = z.object({
  date: dateOnlySchema,
  departmentId: idSchema.nullable().optional(),
  dayType: z.enum([
    "HOLIDAY_GOVT",
    "HOLIDAY_COLLEGE",
    "HOLIDAY_EMERGENCY",
    "SPECIAL_WORKING",
    "EXAM_DAY",
    "EVENT_DAY",
  ]),
  description: z.string().trim().max(500).optional(),
  followsWeekday: weekdayEnum.optional(),
  followsDayOrder: z.number().int().min(1).max(10).optional(),
  dayOrderOverride: z.number().int().min(1).max(10).optional(),
});

export type DeclareCalendarDayInput = z.infer<typeof declareCalendarDaySchema>;
