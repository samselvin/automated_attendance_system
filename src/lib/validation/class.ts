import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createClassSchema = z.object({
  departmentId: idSchema,
  academicYearId: idSchema,
  yearOfStudy: z.number().int().min(1).max(4),
  section: z
    .string()
    .trim()
    .min(1)
    .max(5)
    .transform((v) => v.toUpperCase()),
});

export const updateClassSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
