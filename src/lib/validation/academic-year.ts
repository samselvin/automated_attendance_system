import { z } from "zod";
import { dateOnlySchema } from "@/lib/validation/common";

export const createAcademicYearSchema = z
  .object({
    label: z.string().trim().regex(/^\d{4}-\d{4}$/, "Expected e.g. 2026-2027"),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const updateAcademicYearSchema = z.object({
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const createSemesterSchema = z
  .object({
    number: z.number().int().min(1).max(8),
    type: z.enum(["ODD", "EVEN"]),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const updateSemesterSchema = z.object({
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  isCurrent: z.boolean().optional(),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterInput = z.infer<typeof updateSemesterSchema>;
