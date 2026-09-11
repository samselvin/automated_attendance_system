import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// No external script/style/image origins are used anywhere in this app
// (fonts are self-hosted at build time via next/font, there is no
// analytics/tag-manager script, and no next/image remotePatterns are
// configured) — so this stays a tight, same-origin-only policy.
//
// 'unsafe-inline' on script-src is required because the App Router embeds
// the React Server Components payload as an inline <script> on every page;
// removing it means switching every route to nonce-based dynamic rendering
// (see the Next.js CSP guide), which would disable static optimization
// across the app. That trade-off is deliberately deferred — see Phase 8
// notes in README.md.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No camera/mic/geolocation anywhere in the spec (attendance is
  // roll-number/manual only — Section 53 explicitly forbids biometrics).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
