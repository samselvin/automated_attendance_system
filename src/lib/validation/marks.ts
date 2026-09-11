import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

const markEntrySchema = z
  .object({
    studentId: idSchema,
    marksObtained: z.number().min(0).max(1000).nullable(),
    entryStatus: z.enum(["PRESENT", "ABSENT"]).default("PRESENT"),
  })
  .refine((v) => v.entryStatus === "PRESENT" || v.marksObtained === null, {
    message: "marksObtained must be null when entryStatus is ABSENT",
    path: ["marksObtained"],
  })
  .refine((v) => v.entryStatus === "ABSENT" || v.marksObtained !== null, {
    message: "marksObtained is required when entryStatus is PRESENT",
    path: ["marksObtained"],
  });

export const bulkEnterMarksSchema = z.object({
  assessmentComponentId: idSchema,
  entries: z.array(markEntrySchema).min(1),
});

export type BulkEnterMarksInput = z.infer<typeof bulkEnterMarksSchema>;
