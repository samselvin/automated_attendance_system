import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createTeacherSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  employeeId: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(2).max(200),
  designation: z.string().trim().max(100).optional(),
  departmentId: idSchema,
  mobileNumber: z.string().trim().max(20).optional(),
});

export const updateTeacherSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  designation: z.string().trim().max(100).nullable().optional(),
  mobileNumber: z.string().trim().max(20).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
