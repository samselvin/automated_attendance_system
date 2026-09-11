import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const { auth } = NextAuth(authConfig);

// next-auth's declared `auth` overloads don't include the plain
// `(NextRequest, NextFetchEvent) => Response` shape, even though that's
// exactly how Next.js invokes a proxy/middleware default export at
// runtime (this is what `export default NextAuth(authConfig).auth` — the
// previous, working form of this file — resolved to under the hood).
// Wrapping with `auth((req) => {...})` instead would type-check cleanly,
// but next-auth's own dispatcher only applies the `authorized` callback's
// redirect-to-/login behavior when no wrapper function is passed — using
// the wrapper form would silently disable that gate for every page.
type ProxyAuth = (request: NextRequest, event: NextFetchEvent) => Promise<Response>;
const runAuth = auth as unknown as ProxyAuth;

// Section 43 requires rate limiting on login, search and import endpoints.
// Rules are matched in order by path prefix; anything under /api/ that
// doesn't match a specific rule falls back to a generous default so the
// limiter guards against abuse without throttling normal dashboard use.
const RATE_LIMIT_RULES: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/auth/callback/credentials", limit: 20, windowMs: 5 * 60_000 },
  { prefix: "/api/account/password", limit: 10, windowMs: 60_000 },
  { prefix: "/api/imports", limit: 20, windowMs: 60_000 },
  { prefix: "/api/students", limit: 120, windowMs: 60_000 },
  { prefix: "/api/teachers", limit: 120, windowMs: 60_000 },
  { prefix: "/api/cron/", limit: 60, windowMs: 60_000 },
];
const DEFAULT_API_RATE_LIMIT = { limit: 300, windowMs: 60_000 };

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const rule = RATE_LIMIT_RULES.find((r) => pathname.startsWith(r.prefix)) ?? {
      prefix: "/api/",
      ...DEFAULT_API_RATE_LIMIT,
    };
    const ip = getClientIp(request);
    const result = checkRateLimit(`${rule.prefix}:${ip}`, rule.limit, rule.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : undefined,
        },
      );
    }
  }

  return runAuth(request, event);
}

export const config = {
  // sw.js and offline must stay reachable without a session: the service
  // worker script itself is fetched by the browser before any login (and
  // must never come back as a redirect-to-/login, which breaks
  // registration outright), and /offline is its cached fallback page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.json|icons|sw.js|offline).*)"],
};
