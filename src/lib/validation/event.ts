import { z } from "zod";
import { idSchema, dateOnlySchema, hhmmSchema } from "@/lib/validation/common";

export const eventTypeSchema = z.enum([
  "WORKSHOP",
  "SEMINAR",
  "SYMPOSIUM",
  "EXAM",
  "HOLIDAY",
  "SPORTS",
  "CULTURAL",
  "OTHER",
]);

export const eventAudienceTypeSchema = z.enum(["COLLEGE", "DEPARTMENT", "YEAR", "CLASS", "GROUP"]);

/**
 * Start/end are collected as separate local date + HH:MM fields (matching
 * the bell-schedule convention elsewhere) and combined into UTC instants
 * in event.service.ts via collegeWallClockToUtc — never trust a raw
 * datetime-local string's implied timezone.
 */
export const createEventSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    type: eventTypeSchema,
    audienceType: eventAudienceTypeSchema,
    departmentId: idSchema.optional(),
    yearOfStudy: z.number().int().min(1).max(4).optional(),
    classId: idSchema.optional(),
    studentGroupId: idSchema.optional(),
    startDate: dateOnlySchema,
    startTime: hhmmSchema,
    endDate: dateOnlySchema,
    endTime: hhmmSchema,
    venue: z.string().trim().max(200).optional(),
    affectsCalendar: z.boolean().default(false),
  })
  .refine(
    (v) => {
      if (v.audienceType === "COLLEGE") return true;
      if (v.audienceType === "DEPARTMENT") return !!v.departmentId;
      if (v.audienceType === "YEAR") return !!v.departmentId && !!v.yearOfStudy;
      if (v.audienceType === "CLASS") return !!v.classId;
      if (v.audienceType === "GROUP") return !!v.studentGroupId;
      return false;
    },
    { message: "Missing the required audience field for this audience type", path: ["audienceType"] }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;
