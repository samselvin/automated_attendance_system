import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const submitChangeRequestSchema = z.object({
  classId: idSchema,
  description: z.string().trim().min(5).max(1000),
  reason: z.string().trim().min(5).max(1000),
  effectiveFrom: dateOnlySchema,
});

export const decideChangeRequestSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(1000).optional(),
});

export type SubmitChangeRequestInput = z.infer<typeof submitChangeRequestSchema>;
export type DecideChangeRequestInput = z.infer<typeof decideChangeRequestSchema>;
