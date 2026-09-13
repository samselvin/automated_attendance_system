import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listAcademicYears } from "@/server/services/academic-year.service";
import { CreateAcademicYearForm } from "./create-form";
import { SetCurrentButton } from "./set-current-button";
import { AddSemesterForm } from "./add-semester-form";

export default async function AcademicYearsPage() {
  await requireRolePage("ADMIN");
  const years = await listAcademicYears();

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Academic Years" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateAcademicYearForm />
        {years.length === 0 ? (
          <EmptyState title="No academic years yet" />
        ) : (
          years.map((year) => (
            <Card key={year.id}>
              <CardHeader
                title={year.label}
                subtitle={`${new Date(year.startDate).toLocaleDateString()} – ${new Date(year.endDate).toLocaleDateString()}`}
                action={
                  <div className="flex items-center gap-2">
                    {year.isCurrent ? <Badge label="Current" variant="safe" /> : <SetCurrentButton id={year.id} />}
                  </div>
                }
              />
              <div className="flex flex-wrap gap-1.5">
                {year.semesters.map((s) => (
                  <span
                    key={s.id}
                    className={`rounded-full px-2 py-0.5 text-xs ${s.isCurrent ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    Sem {s.number} ({s.type})
                  </span>
                ))}
                {year.semesters.length === 0 ? <p className="text-xs text-slate-500">No semesters created yet.</p> : null}
              </div>
              <AddSemesterForm academicYearId={year.id} />
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
