import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listChangeRequests } from "@/server/services/timetable-change-request.service";
import { DecideGenericButtons } from "@/components/decide-generic-buttons";

export default async function AdminTimetableRequestsPage() {
  const session = await requireRolePage("ADMIN");
  const requests = await listChangeRequests(session, { status: "PENDING" });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Timetable Requests" showNotifications={false} />
      <main className="flex-1 space-y-3 p-4 sm:p-6">
        {requests.length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          requests.map((req) => (
            <Card key={req.id}>
              <p className="text-sm font-medium text-slate-900">{req.teacher.fullName}</p>
              <p className="mt-1 text-sm text-slate-700">{req.description}</p>
              <p className="mt-0.5 text-xs text-slate-600">{req.reason}</p>
              <p className="mt-0.5 text-xs text-slate-500">Effective {new Date(req.effectiveFrom).toLocaleDateString()}</p>
              <div className="mt-3">
                <DecideGenericButtons endpoint={`/api/timetable-requests/${req.id}/decide`} />
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
