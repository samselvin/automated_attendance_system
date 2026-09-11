import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { listRegulations } from "@/server/services/regulation.service";
import { CreateRegulationForm } from "./create-form";
import { GradingScaleEditor } from "./grading-scale-editor";

export default async function RegulationsPage() {
  const session = await requireRolePage("ADMIN");
  const regulations = await listRegulations(session);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Regulations & Grading" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateRegulationForm />
        {regulations.map((r) => (
          <Card key={r.id}>
            <CardHeader title={r.name} subtitle={r.code} />
            <GradingScaleEditor
              regulationId={r.id}
              initial={r.gradingScales.map((g) => ({
                grade: g.grade,
                gradePoint: Number(g.gradePoint),
                minMark: Number(g.minMark),
                maxMark: Number(g.maxMark),
                isPassing: g.isPassing,
              }))}
            />
          </Card>
        ))}
      </main>
    </div>
  );
}
