import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge, attendanceLevelVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyStudentProfile } from "@/server/services/student-self.service";
import { getStudentAttendancePercentage } from "@/server/services/attendance-report.service";
import { getStudentScheduleForDate } from "@/server/services/schedule.service";
import { listEventsForStudent } from "@/server/services/event.service";
import { prisma } from "@/lib/prisma";
import { collegeDateString } from "@/lib/time";

function greeting() {
  const hour = new Date().getUTCHours() + 5.5; // Asia/Kolkata offset for a friendly greeting only
  const h = hour >= 24 ? hour - 24 : hour;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function StudentHome() {
  const session = await requireRolePage("STUDENT");
  const { student, enrollment } = await getMyStudentProfile(session);
  const today = collegeDateString();

  const [percentage, todaySchedule, events] = await Promise.all([
    getStudentAttendancePercentage(session, student.id, {}),
    getStudentScheduleForDate(session, today),
    listEventsForStudent(session),
  ]);
  const upcomingEvents = events.filter((e) => e.endAt >= new Date()).slice(0, 3);

  const upcomingComponents = enrollment
    ? await prisma.assessmentComponent.findMany({
        where: {
          conductedOn: { gte: new Date(`${today}T00:00:00.000Z`) },
          subjectOffering: { classId: enrollment.classId },
        },
        include: { subjectOffering: { include: { subject: true } } },
        orderBy: { conductedOn: "asc" },
        take: 5,
      })
    : [];

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Home" />
      <main className="flex-1 space-y-4 p-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {greeting()}, {student.fullName.split(" ")[0]} 👋
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-slate-600">Attendance:</span>
            <span className="text-sm font-semibold text-slate-900">{percentage.percentageRounded}%</span>
            <Badge label={percentage.level} variant={attendanceLevelVariant(percentage.level)} />
          </div>
        </div>

        <Card>
          <p className="mb-2 text-sm font-semibold text-slate-900">Today&apos;s Classes</p>
          {todaySchedule.length === 0 ? (
            <p className="text-sm text-slate-400">No classes scheduled today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {todaySchedule.map((entry) => (
                <li key={entry.timetableEntryId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{entry.subjectName}</p>
                    <p className="text-xs text-slate-500">
                      {entry.scheduledStart}–{entry.scheduledEnd} {entry.roomName ? `· ${entry.roomName}` : ""}
                    </p>
                  </div>
                  <Badge
                    label={entry.myStatus ?? "Upcoming"}
                    variant={entry.myStatus === "PRESENT" ? "safe" : entry.myStatus === "ABSENT" ? "critical" : "neutral"}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-sm font-semibold text-slate-900">Upcoming</p>
          {upcomingComponents.length === 0 ? (
            <EmptyState title="Nothing scheduled" subtitle="No upcoming CATs or assignments yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingComponents.map((c) => (
                <li key={c.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-900">{c.label}</p>
                  <p className="text-xs text-slate-500">
                    {c.subjectOffering.subject.name} · {c.conductedOn ? new Date(c.conductedOn).toLocaleDateString() : "TBA"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {upcomingEvents.length > 0 ? (
          <Card>
            <p className="mb-2 text-sm font-semibold text-slate-900">Upcoming Events</p>
            <ul className="divide-y divide-slate-100">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-500">{e.startAt.toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
            <Link href="/student/events" className="mt-2 inline-block text-xs font-medium text-slate-600 underline">
              View all events
            </Link>
          </Card>
        ) : null}

        <Link href="/student/attendance" className="block text-center text-sm font-medium text-slate-600 underline">
          View full attendance & apply for leave/OD
        </Link>
      </main>
    </div>
  );
}
