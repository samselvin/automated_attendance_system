import { after } from "next/server";

/**
 * Runs `fn` once the response has been sent (Next.js's `after()`), so slow
 * follow-up work (an SMS gateway call, a notification fan-out) never adds
 * latency to the request. `after()` throws synchronously if called outside
 * a real request scope — this must never happen in the app itself (every
 * caller runs inside an API route handler), but Section 33 is explicit
 * that attendance submission must never break because of this follow-up
 * work, so a failure here falls back to fire-and-forget instead of
 * propagating and failing the caller.
 */
export function runAfterResponse(fn: () => Promise<void>): void {
  try {
    after(fn);
  } catch (err) {
    console.error("runAfterResponse: after() unavailable, falling back to fire-and-forget:", err);
    fn().catch((e) => console.error("runAfterResponse fallback failed:", e));
  }
}
