import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const submitLeaveRequestSchema = z
  .object({
    studentId: idSchema.optional(), // omitted when a student submits for themselves
    type: z.enum(["LEAVE", "MEDICAL", "ON_DUTY"]),
    fromDate: dateOnlySchema,
    toDate: dateOnlySchema,
    isFullDay: z.boolean().default(true),
    periods: z.array(z.number().int().min(1).max(20)).default([]),
    reason: z.string().trim().min(5).max(1000),
    documentFileId: idSchema.optional(),
  })
  .refine((v) => v.toDate >= v.fromDate, { message: "toDate must be on or after fromDate", path: ["toDate"] })
  .refine((v) => v.isFullDay || v.periods.length > 0, {
    message: "periods is required when isFullDay is false",
    path: ["periods"],
  });

export const decideSingleApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(500).optional(),
});

export const decideOdApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().trim().max(500).optional(),
});

export type SubmitLeaveRequestInput = z.infer<typeof submitLeaveRequestSchema>;
export type DecideSingleApprovalInput = z.infer<typeof decideSingleApprovalSchema>;
export type DecideOdApprovalInput = z.infer<typeof decideOdApprovalSchema>;
