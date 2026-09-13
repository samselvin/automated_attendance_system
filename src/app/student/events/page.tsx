import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listEventsForStudent } from "@/server/services/event.service";

const TYPE_VARIANT: Record<string, "info" | "warning" | "neutral"> = {
  EXAM: "warning",
  HOLIDAY: "warning",
};

export default async function StudentEventsPage() {
  const session = await requireRolePage("STUDENT");
  const events = await listEventsForStudent(session);
  const now = new Date();
  const upcoming = events.filter((e) => e.endAt >= now);
  const past = events.filter((e) => e.endAt < now);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Events" />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Card>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming events" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((e) => (
                <li key={e.id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-900">
                    {e.title} <Badge label={e.type} variant={TYPE_VARIANT[e.type] ?? "info"} />
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {e.startAt.toLocaleString()} – {e.endAt.toLocaleString()}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </p>
                  {e.description ? <p className="mt-1 text-xs text-slate-700">{e.description}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {past.length > 0 ? (
          <Card>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Past</p>
            <ul className="divide-y divide-slate-100">
              {past.map((e) => (
                <li key={e.id} className="py-2 text-sm text-slate-600">
                  {e.title} — {e.startAt.toLocaleDateString()}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
