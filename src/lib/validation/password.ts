import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(100)
  .refine((v) => /[a-z]/.test(v), "Password must include a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Password must include an uppercase letter")
  .refine((v) => /[0-9]/.test(v), "Password must include a number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordPolicySchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
