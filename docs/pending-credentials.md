# Waiting on an external credential

Per Section 54's build rule, nothing in this project fakes an integration
it doesn't have — each item below is built behind a real interface with a
working development fallback (where one makes sense), and needs exactly
one thing from the college to go live.

**Parent SMS is no longer on this list** — `SMS_PROVIDER=textbee` is
configured in `.env` with a real TextBee API key and device ID, so
first-hour absence SMS actually sends today. See `docs/setup-sms.md` for
how it works and its trade-offs (a personal SIM, not a provisioned bulk
gateway).

| What | Needs | Where it's built | Doc |
|---|---|---|---|
| Google Sign-In | A Google Cloud OAuth Client ID/Secret for the college's own project | `src/lib/auth.ts`, `src/lib/auth.config.ts` — fully implemented, only untested live | `docs/setup-google-oauth.md` |
| Leave/OD document upload | An S3-compatible bucket + access keys | Schema-only (`FileAsset` model) — **no upload route or UI exists yet**, this is the one item below the "interface + dev fallback" bar the others meet | `docs/setup-file-storage.md` |
| Google Sheets import | A Google service account JSON key | Not built — CSV import is fully working; Sheets/Excel/OCR import were explicitly scoped out from Phase 2 onward | README.md Phase 2 notes |
| Web push notifications | VAPID key pair | Not built — in-app notifications are fully working; web push was deferred to avoid building an untestable feature ahead of PWA service-worker support | README.md Phase 5 notes |
| A shared, multi-instance rate limiter | A Redis-compatible store (e.g. Upstash) | `src/lib/rate-limit.ts` — an in-memory limiter runs today, correct for a single Node process but only best-effort across multiple serverless instances | `src/lib/rate-limit.ts`'s own doc comment |

None of these block a first production deploy — college-domain password
login works today without Google, in-app notifications work today without
push, and Leave/OD requests can be submitted today without an attached
document. They're listed here so nobody mistakes "not configured" for
"broken."
