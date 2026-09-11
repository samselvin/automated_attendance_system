import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { getRoster } from "@/server/services/attendance.service";
import { collegeDateString } from "@/lib/time";
import { RosterForm } from "./roster-form";

export default async function TakeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireRolePage("TEACHER");
  const { entryId } = await params;
  const { date } = await searchParams;
  const effectiveDate = date ?? collegeDateString();

  const roster = await getRoster(session, entryId, effectiveDate);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Take Attendance" subtitle={effectiveDate} showNotifications={false} />
      <main className="flex-1 p-4">
        <RosterForm
          timetableEntryId={entryId}
          date={effectiveDate}
          students={roster.students}
          alreadySubmitted={roster.alreadySubmitted}
        />
      </main>
    </div>
  );
}
