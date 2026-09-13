import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createImportJobSchema = z.object({
  entityType: z.enum(["STUDENT", "TEACHER", "SUBJECT"]),
  csvText: z.string().min(1),
  columnMapping: z.record(z.string(), z.string()),
  sourceFilename: z.string().trim().max(200).optional(),
});

export type CreateImportJobInput = z.infer<typeof createImportJobSchema>;

export const importJobIdSchema = idSchema;
