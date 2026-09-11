import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listCalendarDays } from "@/server/services/calendar.service";
import { DeclareCalendarDayForm } from "./declare-form";
import { RemoveCalendarDayButton } from "./remove-button";

export default async function CalendarPage() {
  const session = await requireRolePage("ADMIN");
  const days = await listCalendarDays(session);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Academic Calendar" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <DeclareCalendarDayForm />
        {days.length === 0 ? (
          <EmptyState title="No calendar entries yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {days.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-slate-700">{d.dayType}</td>
                      <td className="px-4 py-2 text-slate-500">{d.description ?? "—"}</td>
                      <td className="px-4 py-2">
                        <RemoveCalendarDayButton id={d.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
