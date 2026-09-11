import { z } from "zod";
import { idSchema } from "@/lib/validation/common";

export const createStudentGroupSchema = z.object({
  classId: idSchema,
  name: z.string().trim().min(1).max(100),
  kind: z.enum(["ELECTIVE", "LAB_BATCH"]),
});

export const setGroupMembersSchema = z.object({
  studentIds: z.array(idSchema),
});

export type CreateStudentGroupInput = z.infer<typeof createStudentGroupSchema>;
export type SetGroupMembersInput = z.infer<typeof setGroupMembersSchema>;
