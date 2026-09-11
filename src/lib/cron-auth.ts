/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET
 * is set on the project — this just verifies that header so the endpoint
 * can't be triggered by anyone who finds the URL.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow local/dev testing without a secret
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
