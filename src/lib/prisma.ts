import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

/**
 * Prisma's default interactive-transaction timeout is 5s. A handful of our
 * transactions do many sequential round-trips (a multi-student attendance
 * submission, a bulk CSV import, applying a leave decision across every
 * already-taken record it covers) — over any real network latency to the
 * database these can legitimately exceed 5s even with no bug involved, so
 * they opt into a longer budget explicitly rather than tuning the global
 * default for every trivial transaction too.
 */
export const LONG_TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 10_000 };
