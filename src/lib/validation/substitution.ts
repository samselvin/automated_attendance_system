import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const assignSubstituteSchema = z
  .object({
    originalTeacherId: idSchema,
    substituteTeacherId: idSchema,
    date: dateOnlySchema,
    timetableEntryId: idSchema.optional(),
    classId: idSchema.optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.originalTeacherId !== v.substituteTeacherId, {
    message: "Substitute must be a different teacher",
    path: ["substituteTeacherId"],
  });

export type AssignSubstituteInput = z.infer<typeof assignSubstituteSchema>;
