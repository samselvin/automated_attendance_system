import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createRegulationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(200),
  departmentId: idSchema.nullable().optional(),
});

export const gradingScaleEntrySchema = z.object({
  grade: z.string().trim().min(1).max(10),
  gradePoint: z.number().min(0).max(10),
  minMark: z.number().min(0).max(100),
  maxMark: z.number().min(0).max(100),
  isPassing: z.boolean().default(true),
});

export const setGradingScaleSchema = z.object({
  entries: z.array(gradingScaleEntrySchema).min(1),
});

export type CreateRegulationInput = z.infer<typeof createRegulationSchema>;
export type SetGradingScaleInput = z.infer<typeof setGradingScaleSchema>;
