import { z } from "zod";
import { idSchema, hhmmSchema } from "@/lib/validation/common";

export const bellScheduleSlotSchema = z.object({
  slotType: z.enum(["PERIOD", "SHORT_BREAK", "TEA_BREAK", "LUNCH", "SPECIAL_BREAK", "FREE", "EVENT"]),
  periodNumber: z.number().int().min(1).max(20).nullable().optional(),
  label: z.string().trim().min(1).max(50),
  startTime: hhmmSchema,
  endTime: hhmmSchema,
  sortOrder: z.number().int().min(1),
});

export const createBellScheduleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  departmentId: idSchema.optional(),
  isDefault: z.boolean().default(false),
  slots: z.array(bellScheduleSlotSchema).min(1),
});

export type CreateBellScheduleInput = z.infer<typeof createBellScheduleSchema>;
export type BellScheduleSlotInput = z.infer<typeof bellScheduleSlotSchema>;
