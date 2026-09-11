import type { NextRequest } from "next/server";

/**
 * In-memory, per-instance sliding-window rate limiter. This is enough to
 * blunt brute-force and scraping bursts on a single running process (which
 * is exactly how `next start` / a self-hosted Node server behaves, and is a
 * reasonable best-effort on Vercel too since a warm serverless instance
 * keeps handling requests from the same client for a while).
 *
 * It is NOT a hard multi-instance guarantee: a cold start gets a fresh
 * counter, and two concurrently warm instances don't share state. Section
 * 54's documented-exception rule applies here the same way it does to SMS —
 * a real distributed guarantee needs a shared store (e.g. Upstash Redis via
 * `RATE_LIMIT_REDIS_URL` / `RATE_LIMIT_REDIS_TOKEN`, not provided yet).
 * Swap the implementation below for one backed by that store, behind the
 * same `checkRateLimit` signature, once that credential exists.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Keep the map from growing unboundedly under sustained traffic.
const MAX_TRACKED_KEYS = 20_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true };
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
