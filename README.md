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
- [ ] Phase 7 — dashboards, reports & export
- [ ] Phase 8 — full test pass, security/performance review, PWA polish, deploy

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
  updates or deletes a row in that table.
