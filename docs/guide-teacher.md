# Teacher user guide (including Class Advisor duties)

## Signing in

Use your college email with the temp password Admin gave you (you'll be
asked to set a new one on first login), or "Sign in with Google" if
enabled for the college.

## Taking attendance

Your **Home** screen shows today's schedule, in order, with a **Take
Attendance** button on whichever period is currently open for
submission. Tap it to open the roster:

1. Mark everyone **Present** with one tap, then flip individual students
   to Absent / Leave / On-Duty — or mark individually from the start if
   most of the class is absent that day. Any student with an already
   **approved** Leave or OD for that period is pre-filled for you.
2. Review the summary screen, then **Submit**.
3. Attendance is locked in immediately: the session is marked HELD, every
   student's record is saved, and if this was any student's **first
   period of the day** and they're marked Absent, a parent SMS goes out
   in that same submission (Section 16) — you don't need to do anything
   extra for that.

You can only take attendance for a period you're actually scheduled for
(or assigned as a substitute), and only while the attendance window is
open. If you're late, you can request a **late-attendance unlock** — the
request goes to your Admin/HOD (`/api/attendance/unlock-requests`).

**Correcting a mistake**: attendance you already submitted can be
corrected for a configurable number of days afterward (7 by default);
every correction requires a reason and is permanently logged — nothing
about attendance history is ever silently overwritten.

## Class Advisor duties (if you've been posted as one)

Being a Class Advisor is a **posting** Admin makes, not a separate login —
your account gains extra visibility and permissions for that specific
class for as long as the posting is active:

- **Leave / OD approval queue** (`/teacher/leave-requests`) — you only see
  requests from students in classes you actively advise, not the whole
  college. A plain Leave or Medical request needs just one approval
  (yours, or the HOD's — whichever comes first). An On-Duty request needs
  **both** you and the HOD to approve before it counts; either one of you
  rejecting it rejects it immediately.
- If your HOD has granted you the **direct Leave/OD marking** permission,
  you can mark a student's attendance as Leave/OD directly while taking
  attendance, without a separate approval step.
- Approving a Leave/OD request for a date where attendance was **already
  taken** automatically updates that attendance record retroactively — you
  don't need to go back and re-mark anything by hand.
- From your Home screen, **Weekly report** next to your class opens the
  same Weekly Attendance Report format the department already fills in on
  paper — daily hours for the week, weekly and cumulative totals, and the
  percentage-band summary — ready to print for signing.

You monitor the class; you don't take every hour's attendance yourself —
whoever is actually scheduled (or substituting) for a given period takes
that period's attendance, Class Advisor or not.

## Marks entry

**Marks** (`/teacher/marks`) lists the subject offerings you teach. Open
one, create an assessment component (e.g. "CAT 1", out of its configured
max marks), then bulk-enter marks for the class. Marks stay hidden from
students until an Admin **publishes** the semester's results — entering a
number here never means a student can see it that same moment.

## Timetable change requests

If your schedule needs a change (a swapped period, a new offering, etc.),
submit a request from `/teacher/timetable-requests` — Admin reviews and
either applies it or declines it with a reason.
