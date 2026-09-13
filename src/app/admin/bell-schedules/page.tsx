import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listBellSchedules } from "@/server/services/bell-schedule.service";
import { CreateBellScheduleForm } from "./create-form";

export default async function BellSchedulesPage() {
  const session = await requireRolePage("ADMIN");
  const schedules = await listBellSchedules(session);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Bell Schedules" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateBellScheduleForm />
        {schedules.length === 0 ? (
          <EmptyState title="No bell schedules yet" />
        ) : (
          schedules.map((bs) => (
            <Card key={bs.id}>
              <CardHeader title={bs.name} subtitle={`${bs.slots.length} slots`} />
              <div className="flex flex-wrap gap-1.5 text-xs">
                {bs.slots.map((s) => (
                  <span key={s.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                    {s.label} ({s.startTime}–{s.endTime})
                  </span>
                ))}
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
