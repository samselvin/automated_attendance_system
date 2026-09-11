import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listLeaveRequests } from "@/server/services/leave.service";
import { DecideButtons } from "@/components/leave/decide-buttons";

export default async function TeacherLeaveRequestsPage() {
  const session = await requireRolePage("TEACHER");
  const requests = await listLeaveRequests(session, { status: "PENDING" });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Leave / OD Requests" showNotifications={false} />
      <main className="flex-1 space-y-3 p-4">
        {requests.length === 0 ? (
          <EmptyState title="No pending requests" subtitle="Requests from students in classes you advise will appear here." />
        ) : (
          requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {req.student.fullName} ({req.student.rollNumber})
                  </p>
                  <p className="text-xs text-slate-500">
                    {req.type} · {new Date(req.fromDate).toLocaleDateString()} – {new Date(req.toDate).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{req.reason}</p>
                  {req.type === "ON_DUTY" ? (
                    <div className="mt-1 flex gap-2 text-xs">
                      <Badge
                        label={`Class Advisor: ${req.classAdvisorDecision ?? "Pending"}`}
                        variant={statusVariant(req.classAdvisorDecision ?? "PENDING")}
                      />
                      <Badge label={`HOD: ${req.hodDecision ?? "Pending"}`} variant={statusVariant(req.hodDecision ?? "PENDING")} />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <DecideButtons requestId={req.id} isOd={req.type === "ON_DUTY"} />
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
