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
- [ ] Phase 3 — subjects/offerings, bell schedules, timetables, calendar
- [ ] Phase 4 — attendance sessions/records, leave & OD, percentages
- [ ] Phase 5 — notifications, first-hour parent SMS
- [ ] Phase 6 — marks, internal marks, results, SGPA/CGPA
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
   an Admin user for every address in `INITIAL_ADMIN_EMAILS`.

6. **Start the dev server**

   ```bash
   npm run dev
   ```

   Sign in with an `INITIAL_ADMIN_EMAILS` Google account to reach the Admin
   dashboard.

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

- Login is Google OAuth only; there is no self-registration. Users must
  already exist in the database (created by Admin or import) before they can
  sign in.
- `INITIAL_ADMIN_EMAILS` may include one address outside
  `ALLOWED_EMAIL_DOMAINS` as a one-time bootstrap exception so a founding
  Admin can set up the college's real domain and its first in-domain Admin.
  Every login through that exception is written to the audit log. Deactivate
  it from Admin → Users once the college-domain Admin is confirmed working.
- Audit logs (`audit_logs` table) are append-only — nothing in the app ever
  updates or deletes a row in that table.
