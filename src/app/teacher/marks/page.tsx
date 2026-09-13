import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listSubjectOfferings } from "@/server/services/subject.service";

export default async function TeacherMarksPage() {
  const session = await requireRolePage("TEACHER");
  const offerings = await listSubjectOfferings(session, { teacherId: session.user.teacherId! });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Marks" showNotifications={false} />
      <main className="flex-1 space-y-3 p-4">
        {offerings.length === 0 ? (
          <EmptyState title="No subject offerings assigned to you yet" />
        ) : (
          offerings.map((offering) => (
            <Link key={offering.id} href={`/teacher/marks/${offering.id}`}>
              <Card className="hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{offering.subject.name}</p>
                    <p className="text-xs text-slate-600">
                      {offering.subject.code} · {offering.class ? `${offering.class.yearOfStudy}-${offering.class.section}` : "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {offering.marksLocked ? <Badge label="Locked" variant="warning" /> : null}
                    {offering.marksPublished ? <Badge label="Published" variant="safe" /> : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
