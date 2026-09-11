import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(200),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
