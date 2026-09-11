import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createSubjectSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(200),
  departmentId: idSchema,
  regulationId: idSchema,
  semesterNumber: z.number().int().min(1).max(8),
  credits: z.number().min(0).max(10),
  type: z.enum(["THEORY", "LAB", "THEORY_WITH_LAB", "ELECTIVE", "PROJECT", "NON_CREDIT"]),
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  credits: z.number().min(0).max(10).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const createSubjectOfferingSchema = z
  .object({
    subjectId: idSchema,
    classId: idSchema.optional(),
    studentGroupId: idSchema.optional(),
    academicYearId: idSchema,
    semesterId: idSchema,
    teacherIds: z.array(idSchema).min(1),
    primaryTeacherId: idSchema.optional(),
  })
  .refine((v) => Boolean(v.classId) !== Boolean(v.studentGroupId), {
    message: "Exactly one of classId or studentGroupId is required",
    path: ["classId"],
  })
  .refine((v) => !v.primaryTeacherId || v.teacherIds.includes(v.primaryTeacherId), {
    message: "primaryTeacherId must be one of teacherIds",
    path: ["primaryTeacherId"],
  });

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateSubjectOfferingInput = z.infer<typeof createSubjectOfferingSchema>;
