import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { listDepartments } from "@/server/services/department.service";
import { listClasses } from "@/server/services/class.service";
import { listEvents } from "@/server/services/event.service";
import { EventForm } from "@/components/events/event-form";
import { EventList } from "@/components/events/event-list";

export default async function AdminEventsPage() {
  const session = await requireRolePage("ADMIN");
  const [departments, classes, events] = await Promise.all([listDepartments(session), listClasses(session), listEvents(session)]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Events" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <p className="text-xs text-slate-500">
          Section 36 — create a draft, then Publish when it&apos;s ready. Publishing notifies every student in the chosen
          audience and can never be undone.
        </p>
        <Card>
          <CardHeader title="New event" />
          <EventForm
            departments={departments.map((d) => ({ id: d.id, label: d.code }))}
            classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}`, departmentId: c.departmentId }))}
          />
        </Card>
        <Card>
          <CardHeader title="Events" />
          <EventList
            events={events.map((e) => ({
              ...e,
              startAt: e.startAt.toISOString(),
              endAt: e.endAt.toISOString(),
            }))}
          />
        </Card>
      </main>
    </div>
  );
}
