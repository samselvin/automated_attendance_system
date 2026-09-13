import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listTimetableVersions } from "@/server/services/timetable.service";
import { listClasses } from "@/server/services/class.service";
import { listBellSchedules } from "@/server/services/bell-schedule.service";
import { listAcademicYears } from "@/server/services/academic-year.service";
import { CreateVersionForm } from "./create-version-form";

export default async function TimetablesPage() {
  const session = await requireRolePage("ADMIN");
  const [versions, classes, bellSchedules, academicYears] = await Promise.all([
    listTimetableVersions(),
    listClasses(session),
    listBellSchedules(session),
    listAcademicYears(),
  ]);
  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Timetables" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateVersionForm
          classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
          semesters={(currentYear?.semesters ?? []).map((s) => ({ id: s.id, label: `Sem ${s.number}` }))}
          bellSchedules={bellSchedules.map((b) => ({ id: b.id, label: b.name }))}
        />
        {versions.length === 0 ? (
          <EmptyState title="No timetable versions yet" />
        ) : (
          versions.map((v) => (
            <Link key={v.id} href={`/admin/timetables/${v.id}`}>
              <Card className="hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {v.class.yearOfStudy}-{v.class.section} · {v.bellSchedule.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {v.timetableType} · effective {new Date(v.effectiveFrom).toLocaleDateString()}
                    </p>
                  </div>
                  {v.isLocked ? <Badge label="Locked" variant="warning" /> : <Badge label="Unlocked" variant="safe" />}
                </div>
              </Card>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
