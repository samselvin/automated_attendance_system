# College Attendance Management System

Mobile-first attendance, timetable, leave/OD, marks and reporting system for
PSN College of Engineering and Technology (AIDS department first, built to
support any number of departments). See the master prompt this project was
built from for the full specification.

## Stack

Next.js (App Router, TypeScript) · PostgreSQL (Neon) via Prisma · Auth.js
(NextAuth v5) with Google Sign-In only · Zod · Tailwind CSS.

## Build phases

This is being built phase by phase (see the master prompt, Section 54):

- [x] **Phase 1** — project setup, database schema & migrations, seed script,
      Google authentication, first-admin bootstrap, RBAC foundation, audit log
- [x] **Phase 2** — departments, regulations + grading scale, academic years
      & semesters, classes, teachers, students + parent contacts, enrollments
      (promotion/transfer history), student groups, Class Advisor postings,
      CSV import for students & teachers (Excel/Google Sheets/OCR import are
      not built yet — Sheets needs a service-account credential and OCR
      needs either a cloud vision API key or a heavy local model; both are
      documented pending work, not stubbed)
- [x] **Phase 3** — subjects (regulation-catalog, keyed by semester number)
      and offerings, bell schedules (with slot-overlap validation), rooms,
      timetable versions/entries with full Section 21 conflict detection
      (teacher/room/class double-booking checked across all departments by
      actual time overlap, not just shared slot IDs), lock/unlock,
      timetable change requests, academic calendar days, substitute
      assignment — all with in-app notifications and audit logs
- [x] **Phase 4** — attendance sessions created lazily and idempotently (one
      per period, even across a multi-period lab block), the daily
      attendance window with late-unlock requests, roster fetch with
      approved-leave pre-fill, submission, corrections (with a teacher
      correction window vs. Admin any-time), Leave/Medical single-approval
      and On-Duty dual-approval (rejection wins immediately either side),
      the teacher-marked direct Leave/OD shortcut gated on the
      MARK_LEAVE_OD_DIRECT HOD grant, retroactive application of an
      approval to attendance already taken (with an audit trail), the
      attendance-percentage calculation (configurable Leave/OD counting),
      and a missing-attendance report that diffs the timetable's expected
      periods against what was actually held
- [x] **Phase 5** — SMS provider abstraction (a `dev` provider that logs
      instead of sending, plus a generic HTTP provider shaped for MSG91's
      Flow API as the default real gateway — SMS_PROVIDER/SMS_API_KEY/etc.
      are the exact credential this needs and don't exist yet, per Section
      54's documented exception), first-hour absence SMS wired into
      attendance submission (fires off the request path via Next's
      `after()`, with a fire-and-forget fallback so a `after()` failure can
      never break attendance submission — Section 33's explicit
      requirement), per-student-per-day de-duplication, a recorded
      "no parent contact" case, low-attendance and attendance-missing
      alert jobs on Vercel Cron (`vercel.json`), and IMPORT_COMPLETED /
      OD_SUBMITTED notification wiring. Web push is deferred to Phase 8 —
      it needs the PWA service-worker/installability work to actually be
      testable, so building the backend alone now would be untestable
      scope creep, not genuine progress.
- [x] **Phase 6** — assessment component rules (configurable per regulation,
      never hard-coded — R2022's CAT/Class Test/Assignment/MCQ formula is
      just the seeded default) and concrete assessment components per
      subject offering, marks entry (bulk, with a max-marks and lock check),
      a generic internal-marks calculator that correctly reproduces R2022's
      CAT-retest replacement and percentage-of-max averaging, marks lock
      (teacher blocked, Admin can still override) and publish gating
      (students see nothing pre-publish), official semester-result entry
      (grade → grade point via the regulation's grading scale) kept
      separate from internal marks so entering the internal figure never
      requires knowing the university's outcome yet, and SGPA (per-semester
      snapshot, first attempt only) / CGPA (cumulative, latest passing
      attempt per subject — proved live that a fixed arrear correctly
      replaces its earlier fail).
- [x] **Phase 7 (core workflows built and verified live; some admin/report
      screens still pending)** — role-based layouts and navigation for all
      three roles (student bottom nav, teacher bottom nav, admin sidebar
      with a mobile dropdown fallback); a notification bell with unread
      count. **Student**: Home, Attendance (overall + subject-wise +
      leave/OD history), Apply for Leave/OD, Academics (marks + SGPA/CGPA,
      gated on publish), Timetable (weekly view), Profile. **Teacher**:
      Today's schedule with a Take Attendance button, the full
      roll-number-search-free roster flow (mark all present/absent,
      per-student P/A/L/OD, review screen, submit), Leave/OD approval
      queue, Marks entry (create components, bulk-enter with a max-marks
      guard), Timetable change requests. **Admin**: dashboard with real
      stats (students/teachers/classes, pending queues, classes missing an
      advisor, first-hour SMS today, recent imports), and management
      screens for Departments, Academic Years/Semesters, Classes, Teachers
      and Students (temp password shown once on creation), Class Advisor
      postings, Regulations/Grading, Subjects/Offerings, Bell Schedules,
      Timetable versions/entries (with the Section 21 conflict engine
      surfaced as validation errors), Academic Calendar, Substitutions,
      Leave/OD + Timetable-request + Late-Unlock approval queues, CSV
      Import wizard, and a Reports screen (class attendance + low-attendance
      lists) with CSV export and a print-friendly view.
      Verified end-to-end in a real browser session across all three roles
      on freshly seeded data: admin creates data → teacher takes attendance
      and enters marks → student sees it live and applies for leave →
      teacher approves it → attendance record retroactively flips, exactly
      as Phase 4 promised, this time proven through the actual UI, not a
      script.
      **Not yet built**: Excel (.xlsx) and PDF export (CSV and print-view
      only so far); most of Section 39's other report types (only class
      attendance and low-attendance are done); Events (Section 36) has no
      UI or CRUD yet; a few nice-to-haves like an inline timetable-entry
      editor and a dedicated day-order calendar view.
- [x] **Phase 8 (test pass, security/performance review, PWA polish and
      deployment groundwork — an automated e2e suite is the one piece
      still open, see below)**. **Testing**: full
      `tsc`/`eslint`/`vitest`/`build` pass is clean (127 unit tests, up
      from 120 at Phase 7); see `docs/testing.md` for what's automated and
      what's still manual-only. **Security**: standard security headers
      (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
      Permissions-Policy — `next.config.ts`) and `poweredByHeader: false`;
      a sliding-window rate limiter (`src/lib/rate-limit.ts`) on login,
      search, and import endpoints via `proxy.ts` (documented as an
      in-memory, single-instance implementation — see Section 43 notes in
      `docs/pending-credentials.md`); a new Admin **Audit Logs** screen
      (`/admin/audit-logs`, college-wide Admin only) closing the gap where
      Section 44's audit trail was being written but was never actually
      viewable. **Performance**: the low-attendance report and the daily
      low-attendance-alert cron job were doing one database round trip per
      student college-wide — rewritten to a single grouped aggregate query
      each (`report.service.ts`, `alerts.service.ts`), and the
      missing-attendance report's per-period `findFirst` loop was
      collapsed into one batch fetch (`attendance-report.service.ts`); the
      Admin Students list is now paginated (50/page) with a name/roll-number
      search instead of returning every student unbounded on every load.
      **PWA**: a real app icon and manifest (`public/manifest.json`,
      `src/app/icon.png` / `apple-icon.png`, `appleWebApp` metadata for
      iOS), and a minimal service worker (`public/sw.js`) that caches only
      the static app shell and never intercepts an API call — attendance,
      marks and notifications can never be served stale, per Section 46.
      **Deployment**: `docs/deployment.md` covers Vercel end to end
      (env vars, `db:deploy` vs `db:migrate`, Cron verification, domain/HTTPS);
      `docs/setup-google-oauth.md`, `docs/setup-neon.md`, `docs/setup-sms.md`
      and `docs/setup-file-storage.md` cover every external credential;
      `docs/guide-admin.md`, `docs/guide-teacher.md` and `docs/guide-student.md`
      are the Section 55 user guides; `docs/pending-credentials.md` is the
      single list of everything still waiting on a credential.
      **Not yet built**: an automated integration/e2e test suite
      (Section 51 — every phase's end-to-end verification so far has been
      manual, see `docs/testing.md`); Leave/OD document upload
      (schema-ready, no upload route/UI — see `docs/setup-file-storage.md`).
- [x] **Post-Phase-8 additions** — a running list of things added after the
      formal 8-phase build plan closed out, each verified live against the
      real database and fully cleaned up afterward:
      - **Reset password** button on the Teachers and Students list pages,
        calling the existing `POST /api/admin/users/:id/reset-password`
        endpoint (confirmed and audit-logged the same way password reset
        always was — it just had no UI trigger before).
      - **Settings** screen (`/admin/settings`, college-wide Admin only —
        Section 22's rules have no per-department scope) editing every
        `SystemSetting` row this app actually reads, grouped by area
        (Attendance, Leave & On-Duty, Marks, SMS). Rows that are seeded but
        not yet consulted by any business logic (`TIMEZONE`,
        `TIMETABLE_TYPE`, `LEAVE_APPROVAL_MODE`, `OD_APPROVAL_MODE`,
        `PARENT_SMS_LANGUAGE`) are labelled "Not used yet" rather than
        hidden. Every save is validated against a per-setting schema
        (`src/lib/settings-schema.ts`) and audit-logged as
        `SETTINGS_CHANGED` with the old and new value.
      - **Weekly Attendance Report** (`/admin/reports`, and from a Class
        Advisor's own Home screen for their own class) reproducing the
        department's existing paper weekly attendance register exactly —
        daily hours Monday to Friday, a weekly total, and a running
        cumulative total since the semester began, respecting the
        college's configured Leave/OD counting rules the same way every
        other report does. The paper form's own percentage bands (`>80`,
        `75–80`, `70–75`, `65–70`, `below 60`) left a 60–65% gap that would
        go uncounted once a real percentage lands there; the automated
        report closes it with five contiguous bands ending in "below 65%"
        instead.
      - A real transaction-timeout bug found during a full live test pass:
        `getRoster` crashed with Prisma's P2028 the first time it was
        exercised under real Neon latency — the same class of timeout
        previously patched one call site at a time. Fixed at the root
        instead: the 20s/10s budget is now the `PrismaClient`'s own
        `transactionOptions` default (`src/lib/prisma.ts`), so every
        interactive transaction gets it and no call site has to opt in.
      - **Events** (Section 36, closing the one gap Phase 7 had explicitly
        left open) — Admin, and a teacher granted the new `MANAGE_EVENTS`
        permission, can create a draft event (workshop, seminar, exam,
        holiday, sports, cultural, etc.) scoped to the whole college, one
        department, one year within a department, one class, or one
        student group, then Publish it. Publishing notifies every student
        in that audience (`EVENT_PUBLISHED`) and can't be undone; a
        published event can't be deleted, only an unpublished draft can.
        Students see only events relevant to them, matched by a pure,
        unit-tested predicate (`src/lib/events/audience.ts`) — surfaced on
        the student Home screen and at `/student/events`.

## Documentation

- [`docs/deployment.md`](docs/deployment.md) — production deployment guide
- [`docs/setup-google-oauth.md`](docs/setup-google-oauth.md),
  [`docs/setup-neon.md`](docs/setup-neon.md),
  [`docs/setup-sms.md`](docs/setup-sms.md),
  [`docs/setup-file-storage.md`](docs/setup-file-storage.md) — per-credential setup guides
- [`docs/testing.md`](docs/testing.md) — how to run the tests, and what's still manual-only
- [`docs/guide-admin.md`](docs/guide-admin.md),
  [`docs/guide-teacher.md`](docs/guide-teacher.md),
  [`docs/guide-student.md`](docs/guide-student.md) — per-role user guides
- [`docs/pending-credentials.md`](docs/pending-credentials.md) — everything still waiting on an external credential

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Neon Postgres database** (https://neon.tech) and copy its
   pooled and direct connection strings.

3. **Create a Google OAuth Client** (Google Cloud Console → APIs & Services →
   Credentials → OAuth client ID → Web application):
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     (add your production URL's equivalent later)

4. **Copy `.env.example` to `.env`** and fill in every value — database URLs,
   `AUTH_SECRET` (generate with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`),
   Google client id/secret, `ALLOWED_EMAIL_DOMAINS`, `INITIAL_ADMIN_EMAILS`.

5. **Run migrations and seed the database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The seed script creates the AIDS department, the R2022 regulation and
   grading scale, a demo academic year/class, default system settings, and
   an Admin user for every address in `INITIAL_ADMIN_EMAILS`. Any of those
   emails on an allowed college domain also gets a temp password printed to
   the console — the personal-email bootstrap address (if any) is Google
   sign-in only.

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   Sign in with an `INITIAL_ADMIN_EMAILS` account (its printed temp password,
   or Google) to reach the Admin dashboard.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm run start` | Production build / start |
| `npm run lint` | ESLint |
| `npm test` | Run the unit test suite (Vitest) once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Create/apply a Prisma migration (dev) |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:studio` | Open Prisma Studio |

## Security notes

- Two login methods: Google OAuth, or college-email + password. Either way
  there is no self-registration — users must already exist in the database
  (created by Admin or import) before they can sign in.
- Password accounts are college-domain only (`ALLOWED_EMAIL_DOMAINS`) — the
  personal-email bootstrap-admin exception below is Google sign-in only.
  Admin/import issues a random temp password for every new account (shown
  once at creation time); the user must change it on first password login.
  Passwords are hashed with scrypt (a random salt per password, Node's
  built-in `crypto`, no plaintext ever stored or logged). Five failed
  attempts locks the account for 15 minutes. Admin can issue a fresh temp
  password for anyone in their department scope from
  `POST /api/admin/users/:id/reset-password`.
- `INITIAL_ADMIN_EMAILS` may include one address outside
  `ALLOWED_EMAIL_DOMAINS` as a one-time bootstrap exception so a founding
  Admin can set up the college's real domain and its first in-domain Admin.
  Every login through that exception is written to the audit log. Deactivate
  it from Admin → Users once the college-domain Admin is confirmed working.
- Audit logs (`audit_logs` table) are append-only — nothing in the app ever
  updates or deletes a row in that table, and Admin → Audit Logs
  (college-wide Admin only) is where they're actually searched and
  filtered.
- Standard security headers (`Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set for every response in
  `next.config.ts`, and `poweredByHeader` is disabled.
- Login, search, and import endpoints are rate-limited per IP
  (`src/lib/rate-limit.ts`, wired in `proxy.ts`) on top of the per-account
  lockout above — see that file's own doc comment for the multi-instance
  caveat, and `docs/pending-credentials.md` for the upgrade path.
