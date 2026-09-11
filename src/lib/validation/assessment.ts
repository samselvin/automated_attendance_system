import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const createAssessmentRuleSchema = z.object({
  regulationId: idSchema,
  subjectId: idSchema.nullable().optional(),
  groupKey: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .transform((v) => v.toUpperCase()),
  label: z.string().trim().min(1).max(100),
  weightage: z.number().min(0).max(100),
  hasRetest: z.boolean().default(false),
  retestExcludesComponents: z.array(z.string()).default([]),
  sortOrder: z.number().int().min(1),
});

export const createAssessmentComponentSchema = z.object({
  groupKey: z.string().trim().min(1).max(30).transform((v) => v.toUpperCase()),
  label: z.string().trim().min(1).max(100),
  maxMarks: z.number().positive().max(1000),
  isRetestFor: idSchema.nullable().optional(),
  conductedOn: dateOnlySchema.optional(),
});

export type CreateAssessmentRuleInput = z.infer<typeof createAssessmentRuleSchema>;
export type CreateAssessmentComponentInput = z.infer<typeof createAssessmentComponentSchema>;
