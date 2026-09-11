import { z } from "zod";
import { idSchema, dateOnlySchema } from "@/lib/validation/common";

export const parentContactSchema = z.object({
  name: z.string().trim().min(2).max(200),
  relationship: z.string().trim().min(2).max(50),
  mobileNumber: z.string().trim().min(6).max(20),
  isSmsContact: z.boolean().default(false),
});

export const createStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  rollNumber: z.string().trim().min(1).max(30),
  registerNumber: z.string().trim().min(1).max(30).optional(),
  fullName: z.string().trim().min(2).max(200),
  dateOfBirth: dateOnlySchema.optional(),
  address: z.string().trim().max(500).optional(),
  mobileNumber: z.string().trim().max(20).optional(),
  departmentId: idSchema,
  regulationId: idSchema,
  batchLabel: z.string().trim().regex(/^\d{4}-\d{4}$/, "Expected e.g. 2025-2029"),
  admissionType: z.enum(["REGULAR", "LATERAL_ENTRY"]).default("REGULAR"),
  parentContacts: z.array(parentContactSchema).min(1),
  enrollment: z.object({
    classId: idSchema,
    semesterId: idSchema,
    effectiveFrom: dateOnlySchema,
  }),
});

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  address: z.string().trim().max(500).nullable().optional(),
  mobileNumber: z.string().trim().max(20).nullable().optional(),
  dateOfBirth: dateOnlySchema.nullable().optional(),
  status: z.enum(["ACTIVE", "DETAINED", "DISCONTINUED", "PASSED_OUT"]).optional(),
});

export const changeEnrollmentSchema = z.object({
  classId: idSchema,
  semesterId: idSchema,
  effectiveFrom: dateOnlySchema,
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ChangeEnrollmentInput = z.infer<typeof changeEnrollmentSchema>;
