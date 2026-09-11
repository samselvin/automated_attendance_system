import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const enterSemesterResultSchema = z.object({
  studentId: idSchema,
  semesterId: idSchema,
  subjectId: idSchema,
  grade: z.string().trim().min(1).max(10),
  attemptNumber: z.number().int().min(1).default(1),
});

export type EnterSemesterResultInput = z.infer<typeof enterSemesterResultSchema>;
