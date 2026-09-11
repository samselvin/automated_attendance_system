# Testing

## Automated unit tests

```bash
npm test          # run once
npm run test:watch
```

135 Vitest tests cover every pure calculation module — the parts of the
system where a subtle bug is easiest to introduce silently and hardest to
notice by eye:

- `src/lib/attendance/window.test.ts` — attendance window open/closed logic
- `src/lib/attendance/percentage.test.ts` — percentage calculation (array
  and pre-aggregated-counts forms), including every Leave/OD counting
  setting and the SAFE/WARNING/CRITICAL threshold boundaries
- `src/lib/attendance/od-approval.test.ts` — the OD dual-approval state
  machine (either side rejecting rejects immediately; both must approve)
- `src/lib/attendance/first-hour.test.ts` — first-non-cancelled-period
  detection for SMS eligibility
- `src/lib/marks/internal-marks.test.ts` — the generic CAT-retest-aware
  internal marks calculator
- `src/lib/marks/gpa.test.ts` — SGPA (first attempt) / CGPA (latest
  passing attempt) calculation, including arrear handling
- `src/lib/timetable/validate.test.ts` — time-overlap conflict detection,
  bell schedule slot validation
- `src/lib/sms/template.test.ts` — SMS template variable substitution
- `src/lib/login-lockout.test.ts`, `src/lib/password.test.ts` — account
  lockout state transitions, password hashing/verification
- `src/lib/rbac.test.ts` — role/department-scope matching
- `src/lib/rate-limit.test.ts` — the sliding-window rate limiter (Phase 8)
- `src/lib/settings-schema.test.ts` — per-setting validation, and that every
  setting's own fallback value satisfies its own schema
- `src/lib/env.test.ts`, `src/lib/time.test.ts`, `src/lib/import/validators.test.ts`

Run `npm test` before every commit that touches any of these modules —
they're fast (under 4 seconds for the whole suite) specifically so there's
no excuse not to.

## What's not automated yet

Section 51 also asks for **integration and end-to-end tests** — signing
in, taking attendance through the actual roster UI, approving a leave
request and watching the attendance record flip, RBAC boundary checks
against a real session, and so on. None of that is automated today.

Instead, every phase of this build was verified **manually**, in a real
browser, against the live Neon database: create throwaway test data with
a distinctive prefix (e.g. `P8TEST...`), drive the actual UI end to end,
confirm the result in the database, then delete every row the test
created and re-confirm zero rows remain. That's real coverage, but it
doesn't run itself on every future change — a regression won't be caught
until someone repeats the manual pass.

**If this project keeps growing, the next investment should be a small
Playwright suite** covering the highest-value flows from Section 51:

- Sign in (both methods), unregistered email, wrong domain, deactivated
  user, first-admin bootstrap
- Teacher takes attendance → student sees it → first-hour SMS logged (dev
  provider) → student applies for Leave/OD → Class Advisor (and, for OD,
  HOD) approves → attendance record retroactively updates
- RBAC: a second teacher account cannot open a class they don't teach; a
  second student account cannot fetch another student's records via the
  API directly

This is genuinely deferred work, not a stubbed or faked test suite — see
Section 54's rule against pretending something is done when it isn't.

## Manual smoke test after a deploy

A short checklist worth running by hand after any production deploy,
using a real Admin account:

1. Sign in with a college-domain password account.
2. Admin dashboard shows real counts, not zeros/errors.
3. Create a department → academic year → class → teacher → student (or
   import a small CSV) and confirm each appears in its list page.
4. As the teacher, open today's schedule and take attendance for one
   period.
5. As the student, confirm that period shows up under Attendance.
6. Check `/admin/audit-logs` (college-wide Admin only) — the actions above
   should each have a row.
7. Check the Vercel dashboard's Cron Jobs tab shows both jobs registered.
