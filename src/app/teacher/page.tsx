import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTeacherScheduleForDate } from "@/server/services/schedule.service";
import { getActiveAdvisorClassIds } from "@/lib/class-advisor";
import { hasAnyTeacherPermission } from "@/lib/permissions";
import { collegeDateString, collegeTimeString } from "@/lib/time";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

function ordinal(year: number) {
  return ["", "1st", "2nd", "3rd", "4th"][year] ?? `${year}th`;
}

export default async function TeacherHome() {
  const session = await requireRolePage("TEACHER");
  const teacherId = session.user.teacherId!;
  const today = collegeDateString();
  const now = collegeTimeString();

  const [schedule, advisorClassIds, cutoff, canManageEvents] = await Promise.all([
    getTeacherScheduleForDate(session, today),
    getActiveAdvisorClassIds(teacherId),
    getSetting<string>("ATTENDANCE_DAILY_CUTOFF"),
    hasAnyTeacherPermission(teacherId, "MANAGE_EVENTS"),
  ]);

  const missingCount = schedule.filter((s) => s.attendanceStatus !== "HELD" && s.scheduledStart && now > s.scheduledStart).length;

  // Section 5: a teacher may hold subjects across several years and even
  // several departments, so lead with "which years today, and what in each"
  // before the chronological list.
  const byYear = new Map<string, { label: string; subjects: string[] }>();
  for (const entry of schedule) {
    const key = `${entry.departmentCode} ${entry.yearOfStudy}`;
    const group = byYear.get(key) ?? {
      label: `${entry.departmentCode} ${ordinal(entry.yearOfStudy)} year`,
      subjects: [],
    };
    if (!group.subjects.includes(entry.subjectName)) group.subjects.push(entry.subjectName);
    byYear.set(key, group);
  }
  const yearGroups = [...byYear.values()];

  let advisorSummary: { classId: string; className: string; studentCount: number; pendingLeave: number }[] = [];
  if (advisorClassIds.length > 0) {
    advisorSummary = await Promise.all(
      advisorClassIds.map(async (classId) => {
        const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
        const [studentCount, pendingLeave] = await Promise.all([
          prisma.studentEnrollment.count({ where: { classId, status: "ACTIVE" } }),
          prisma.leaveRequest.count({
            where: { status: "PENDING", student: { enrollments: { some: { classId, status: "ACTIVE" } } } },
          }),
        ]);
        return { classId, className: `${cls.yearOfStudy}-${cls.section}`, studentCount, pendingLeave };
      })
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title={`Hi, ${session.user.email.split("@")[0]}`} subtitle="Teacher" />
      <main className="flex-1 space-y-4 p-4">
        {missingCount > 0 ? (
          <Card className="border-amber-300 bg-amber-50">
            <p className="text-sm font-medium text-amber-800">{missingCount} session(s) still need attendance today</p>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Today's schedule" subtitle={`Daily cutoff: ${cutoff}`} />
          {yearGroups.length > 0 ? (
            <div className="mb-3 rounded-lg bg-indigo-50/70 px-3 py-2">
              <p className="text-xs font-medium text-indigo-900">
                Today you have classes in {yearGroups.map((g) => g.label).join(" and ")}
              </p>
              <ul className="mt-1 space-y-0.5">
                {yearGroups.map((g) => (
                  <li key={g.label} className="text-xs text-indigo-800">
                    <span className="font-medium">{g.label}:</span> {g.subjects.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {schedule.length === 0 ? (
            <EmptyState title="No classes today" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {schedule.map((entry) => (
                <li key={entry.timetableEntryId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {entry.subjectName} · {entry.className}
                      {entry.groupName ? ` (${entry.groupName})` : ""}
                    </p>
                    <p className="text-xs text-slate-600">
                      {entry.scheduledStart}–{entry.scheduledEnd} {entry.roomName ? `· ${entry.roomName}` : ""}
                      {entry.isSubstituting ? " · Substituting" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={entry.attendanceStatus} variant={statusVariant(entry.attendanceStatus)} />
                    {entry.attendanceStatus !== "HELD" ? (
                      <Link href={`/teacher/attendance/${entry.timetableEntryId}?date=${today}`}>
                        <Button className="px-3 py-1.5 text-xs">Take</Button>
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {advisorSummary.length > 0 ? (
          <Card>
            <CardHeader title="My Class (Class Advisor)" />
            <ul className="space-y-2">
              {advisorSummary.map((s) => (
                <li key={s.classId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{s.className}</span>
                  <span className="text-slate-600">
                    {s.studentCount} students · {s.pendingLeave} pending leave/OD
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/teacher/leave-requests" className="text-xs font-medium text-slate-700 underline">
                Review leave/OD requests
              </Link>
              {advisorSummary.map((s) => (
                <Link key={s.classId} href={`/teacher/class-report?classId=${s.classId}`} className="text-xs font-medium text-slate-700 underline">
                  Weekly report — {s.className}
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        {canManageEvents ? (
          <Card>
            <CardHeader title="Events" />
            <Link href="/teacher/events" className="text-xs font-medium text-slate-700 underline">
              Create or publish an event
            </Link>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
