# Admin user guide

## Signing in

Use the temp password shown when your account was created (or printed to
the console by `npm run db:seed` for the very first Admin), or "Sign in
with Google" if the college's Google OAuth is set up
(`docs/setup-google-oauth.md`). You'll be asked to change a temp password
on first password login.

## First-time college setup

Do these once, roughly in this order (later steps depend on earlier ones):

1. **Departments** (`/admin/departments`) — the college's academic
   departments (e.g. AIDS).
2. **Regulations & Grading** (`/admin/regulations`) — a regulation (e.g.
   R2022) and its grading scale (grade → grade point), plus the
   assessment component rules used for internal marks (CAT/Class
   Test/Assignment/MCQ weights — configurable per regulation, not
   hard-coded).
3. **Academic Years** (`/admin/academic-years`) — create the year and its
   semesters, then mark the current one active.
4. **Classes** (`/admin/classes`) — one row per department/year/section
   (e.g. AIDS 2-A).
5. **Teachers** and **Students** (`/admin/teachers`, `/admin/students`) —
   add individually, or use **Imports** (`/admin/imports`) for a CSV
   batch. Every new account gets a one-time temp password shown on
   screen — write it down or share it immediately, it isn't shown again.
   Lost it, or need to force a reset? Use the **Reset password** button on
   that person's row in the Teachers or Students list — it shows the new
   temp password once, the same way creation does, and is fully audited
   (`PASSWORD_RESET_BY_ADMIN`).
6. **Class Advisors** (`/admin/class-advisors`) — post a teacher as the
   advisor for a class. This is a posting with extra permissions, not a
   separate login role — the same teacher account gains Class-Advisor
   visibility into that class while the posting is active, and loses it
   the moment you end or change the posting (history is preserved, never
   overwritten).
7. **Subjects & Offerings** (`/admin/subjects`) — the regulation's subject
   catalog, then which teacher(s) teach which subject to which class this
   semester.
8. **Bell Schedules** (`/admin/bell-schedules`) — the daily period
   structure (start/end times per period). Different classes or days can
   use different bell schedules.
9. **Timetables** (`/admin/timetables`) — create a version, add entries
   (subject + teacher + room + bell schedule slot(s) per weekday), then
   **Lock** it once it's correct. The system checks for teacher/room/class
   double-booking automatically and blocks a conflicting entry.
10. **Academic Calendar** (`/admin/calendar`) — declare holidays; a
    declared holiday automatically cancels that day's sessions.

Attendance thresholds, Leave/OD counting rules, the daily attendance
cutoff, and a few other college-wide rules can be changed any time from
**Settings** (`/admin/settings`, college-wide Admin only) — see below.

## Day to day

- **Leave/OD, Timetable-change, and Late-Attendance-Unlock queues**
  (`/admin/leave-requests`, `/admin/timetable-requests`,
  `/admin/unlock-requests`) — Admin can decide any of these; day to day
  they're usually handled by the relevant Class Advisor/HOD/teacher
  instead, with Admin as a fallback.
- **Substitutions** (`/admin/substitutions`) — assign a substitute teacher
  for a specific date/period when the scheduled teacher is unavailable.
- **Reports & Export** (`/admin/reports`) — a class's attendance report
  (with CSV download and a print-friendly view) and a college/department
  low-attendance list. Excel/PDF export aren't built yet — CSV and the
  browser's own Print are what's available.
- **Audit Logs** (`/admin/audit-logs`) — **visible only to a college-wide
  Admin** (one whose role isn't scoped to a single department), since log
  entries can span every department and don't carry a reliable
  per-department tag. Filter by action, entity type, or date range;
  nothing here can ever be edited or deleted, by anyone, through the app.
- **Settings** (`/admin/settings`) — also **college-wide Admin only**,
  since these rules apply to the whole college with no per-department
  override. Grouped into Attendance, Leave & On-Duty, Marks, and SMS;
  each row saves independently, and every change is written to the audit
  log as `SETTINGS_CHANGED` with both the old and new value. A few rows
  under "Reserved (not yet wired into behavior)" are seeded but not
  currently read by any business logic — they're shown (and labelled)
  rather than hidden, but changing one won't change how the app behaves
  yet.

## A department-scoped Admin

If your Admin role is scoped to one department (set up by a college-wide
Admin), every screen above is automatically limited to that department's
data — you won't see other departments' students, teachers, or
timetables, and you won't see the Audit Logs or Settings links at all.
