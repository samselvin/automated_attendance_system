import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const assignAdvisorSchema = z.object({
  classId: idSchema,
  teacherId: idSchema,
  semesterId: idSchema.optional(),
  effectiveFrom: dateOnlySchema,
  notes: z.string().trim().max(500).optional(),
});

export const changeAdvisorSchema = assignAdvisorSchema;

export const endPostingSchema = z.object({
  effectiveTo: dateOnlySchema,
});

export type AssignAdvisorInput = z.infer<typeof assignAdvisorSchema>;
export type EndPostingInput = z.infer<typeof endPostingSchema>;
