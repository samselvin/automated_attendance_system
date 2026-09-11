# Production deployment guide

The app targets **Vercel** specifically — the background-job design
(Section 3/54) uses Vercel Cron (`vercel.json`) rather than a separate
queue service, and Next.js's own build output is what Vercel expects
natively. Self-hosting on a plain Node server is possible (Next.js
supports it — see `next start`) but you would need to replace the two
Vercel Cron entries with your own scheduler (e.g. system `cron` calling
the same two routes with the right `Authorization` header).

## 1. Prerequisites

- A Neon Postgres database — see `docs/setup-neon.md`.
- A Google OAuth Client ID/Secret — see `docs/setup-google-oauth.md`
  (optional for a first deploy if you only need password login initially,
  but Google sign-in won't work until this is set).
- A GitHub (or GitLab/Bitbucket) repository connected to a Vercel project.

## 2. Environment variables

Set every variable from `.env.example` in the Vercel project's
**Settings → Environment Variables**, for both **Production** and
**Preview** environments (use a separate Neon branch/database for Preview
so preview deployments never touch production data):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_DATABASE_URL` | Neon **direct** connection string (migrations only) |
| `APP_URL` | The deployment's real HTTPS URL |
| `AUTH_SECRET` | Generate a fresh one per environment — never reuse the dev value |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | See `docs/setup-google-oauth.md` |
| `ALLOWED_EMAIL_DOMAINS` | The college's real domain(s) |
| `INITIAL_ADMIN_EMAILS` | At minimum one real college-domain address |
| `DEFAULT_TIMEZONE` | `Asia/Kolkata` unless the college is elsewhere |
| `SMS_PROVIDER` and the `SMS_*` variables | `dev` until `docs/setup-sms.md` is done |
| `CRON_SECRET` | Any random string — Vercel sends it as `Authorization: Bearer <value>` when it calls a cron route; the route rejects any other caller in production |
| `STORAGE_*` | Not yet used by any code path — see `docs/setup-file-storage.md` |

Do not commit real secrets to the repository — `.env` is already
git-ignored; only `.env.example` (with placeholder values) is tracked.

## 3. Build & database migration

Vercel runs `npm run build` automatically. **Database migrations are not
part of the build** — `next build` never touches the database — so run
migrations as a separate, deliberate step before (or as part of) each
deploy that changes `prisma/schema.prisma`:

```bash
npm run db:deploy    # prisma migrate deploy — applies committed migrations, no prompts
```

Run this from your own machine or CI (pointed at `DIRECT_DATABASE_URL`
for the target environment) right before promoting a deploy that depends
on the new schema. Never run `db:migrate` (the interactive dev command)
against production — it can create a new migration file instead of
applying existing ones.

## 4. Vercel Cron

`vercel.json` already declares both scheduled jobs:

```json
{ "path": "/api/cron/attendance-missing-alerts", "schedule": "30 11 * * 1-5" },
{ "path": "/api/cron/low-attendance-alerts", "schedule": "0 3 * * 1" }
```

Vercel Cron is only invoked once the project is deployed with a
`vercel.json` present — no extra dashboard configuration is needed beyond
setting `CRON_SECRET`. After the first deploy, check **Vercel dashboard →
your project → Cron Jobs** to confirm both jobs are registered, and watch
their run logs the first time each fires (the schedules above are in
UTC — `30 11 * * 1-5` is 5:00 PM IST on weekdays, `0 3 * * 1` is 8:30 AM
IST on Mondays; adjust if `DEFAULT_TIMEZONE` isn't `Asia/Kolkata`).

Cron functions run with whatever the plan's default function timeout is
(10s on Hobby, 60s on Pro unless you raise it) — if `runAttendanceMissingAlerts`
or `runLowAttendanceAlerts` ever start timing out as the college's student
count grows well past a few thousand, raise `maxDuration` for those two
routes via a `functions` entry in `vercel.json` (Pro plan or higher) before
optimizing the queries further; both were rewritten in Phase 8 to use
batched aggregate queries specifically to keep this from being an issue at
realistic scale.

## 5. Domain & HTTPS

Add the college's real domain in **Vercel dashboard → your project →
Domains**. Vercel provisions and renews the TLS certificate automatically
— there is nothing else to configure for HTTPS. Update:

- `APP_URL` to the final domain.
- The Google OAuth Client's authorized redirect URI to
  `https://<domain>/api/auth/callback/google` (see `docs/setup-google-oauth.md`).

The security headers in `next.config.ts` (HSTS, CSP, X-Frame-Options,
etc. — see Phase 8 notes in `README.md`) apply automatically; nothing
further to configure there.

## 6. First deploy checklist

1. Environment variables set (production + preview).
2. `npm run db:deploy` run against the production database.
3. `npm run db:seed` run **once**, only the very first time, to create the
   AIDS department/regulation/first Admin. Never re-run it against a
   database that already has real student/teacher data — it's designed
   for a fresh database (see the seed script's own upsert guards, which
   protect existing rows, but there's no reason to run it again).
4. Deploy, then sign in as an `INITIAL_ADMIN_EMAILS` address and confirm
   the Admin dashboard loads real data.
5. Confirm both Cron Jobs appear in the Vercel dashboard.
6. Run through `docs/testing.md`'s smoke-test list against the live URL.
