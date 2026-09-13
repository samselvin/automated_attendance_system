import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentScheduleForDate } from "@/server/services/schedule.service";
import { collegeDateString } from "@/lib/time";

function startOfWeek(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // back up to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export default async function StudentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireRolePage("STUDENT");
  const { date: dateParam } = await searchParams;
  const today = collegeDateString();
  const selectedDate = dateParam ?? today;

  const monday = startOfWeek(selectedDate);
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const schedule = await getStudentScheduleForDate(session, selectedDate);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Timetable" />
      <main className="flex-1 space-y-4 p-4">
        <div className="grid grid-cols-5 gap-1">
          {weekDates.map((d) => {
            const label = new Date(`${d}T00:00:00.000Z`).toLocaleDateString(undefined, { weekday: "short" });
            const isSelected = d === selectedDate;
            const isToday = d === today;
            return (
              <Link
                key={d}
                href={`/student/timetable?date=${d}`}
                className={`rounded-lg py-2 text-center text-xs font-medium ${
                  isSelected ? "bg-slate-900 text-white" : isToday ? "bg-slate-200 text-slate-900" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {label}
                <br />
                {d.slice(8, 10)}
              </Link>
            );
          })}
        </div>

        <Card>
          {schedule.length === 0 ? (
            <EmptyState title="No classes on this day" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {schedule.map((entry) => (
                <li key={entry.timetableEntryId} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{entry.subjectName}</p>
                    <p className="text-xs text-slate-600">
                      {entry.scheduledStart}–{entry.scheduledEnd}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {entry.teacherName ?? "—"} {entry.roomName ? `· ${entry.roomName}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
