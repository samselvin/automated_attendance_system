import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Prisma's default interactive-transaction timeout is 5s. This was
 * originally opted into per call site for the handful of transactions
 * doing many sequential round-trips (a multi-student attendance
 * submission, a bulk CSV import, a leave decision applied across every
 * already-taken record it covers) — but a live test against the real
 * database (Neon, real network latency, not localhost) hit the same
 * P2028 "transaction not found" timeout in `getRoster`, a plain read
 * nobody had flagged as "multi-step enough" to opt in. Auditing every
 * `$transaction()` call site by hand for round-trip count is exactly the
 * kind of thing that's fine until the next one is missed, so this is a
 * client-wide default instead: every interactive transaction gets the
 * same 20s budget, and no call site has to remember to ask for it.
 */
export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    transactionOptions: { timeout: 20_000, maxWait: 10_000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
