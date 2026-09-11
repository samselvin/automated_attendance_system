import { z } from "zod";

/** Generic entity-id validator — deliberately format-agnostic (works whether
 * ids are Prisma's default cuid, a future uuid, etc.). */
export const idSchema = z.string().trim().min(1).max(64);

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .transform((v) => new Date(`${v}T00:00:00.000Z`));

export const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected 24-hour HH:MM");
