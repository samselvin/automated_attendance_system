import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listChangeRequests } from "@/server/services/timetable-change-request.service";
import { getActiveAdvisorClassIds } from "@/lib/class-advisor";
import { prisma } from "@/lib/prisma";
import { RequestForm } from "./request-form";

export default async function TeacherTimetableRequestsPage() {
  const session = await requireRolePage("TEACHER");
  const teacherId = session.user.teacherId!;

  const [requests, advisorClassIds, taughtEntries] = await Promise.all([
    listChangeRequests(session),
    getActiveAdvisorClassIds(teacherId),
    prisma.timetableEntry.findMany({
      where: { teachers: { some: { teacherId } } },
      select: { timetableVersion: { select: { classId: true } } },
      distinct: ["timetableVersionId"],
    }),
  ]);

  const classIds = [...new Set([...advisorClassIds, ...taughtEntries.map((e) => e.timetableVersion.classId)])];
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } } });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Timetable Requests" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4">
        {classes[0] ? (
          <RequestForm classId={classes[0].id} />
        ) : (
          <p className="text-xs text-slate-400">You have no classes to request changes for yet.</p>
        )}

        {requests.length === 0 ? (
          <EmptyState title="No requests yet" />
        ) : (
          requests.map((req) => (
            <Card key={req.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-900">{req.description}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{req.reason}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Effective {new Date(req.effectiveFrom).toLocaleDateString()}</p>
                </div>
                <Badge label={req.status} variant={statusVariant(req.status)} />
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
