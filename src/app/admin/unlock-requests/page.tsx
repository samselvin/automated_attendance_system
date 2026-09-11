import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listUnlockRequests } from "@/server/services/unlock.service";
import { DecideGenericButtons } from "@/components/decide-generic-buttons";

export default async function AdminUnlockRequestsPage() {
  await requireRolePage("ADMIN");
  const requests = await listUnlockRequests({ status: "PENDING" });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Late-Attendance Unlock Requests" showNotifications={false} />
      <main className="flex-1 space-y-3 p-4 sm:p-6">
        {requests.length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          requests.map((req) => (
            <Card key={req.id}>
              <p className="text-sm text-slate-900">
                Session on {new Date(req.session.date).toLocaleDateString()} · Period {req.session.periodNumber}
              </p>
              <p className="mt-1 text-sm text-slate-700">{req.reason}</p>
              <div className="mt-3">
                <DecideGenericButtons endpoint={`/api/attendance/unlock-requests/${req.id}/decide`} />
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
