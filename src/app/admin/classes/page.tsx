import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listClasses } from "@/server/services/class.service";
import { listDepartments } from "@/server/services/department.service";
import { listAcademicYears } from "@/server/services/academic-year.service";
import { CreateClassForm } from "./create-form";

export default async function ClassesPage() {
  const session = await requireRolePage("ADMIN");
  const [classes, departments, academicYears] = await Promise.all([
    listClasses(session),
    listDepartments(session),
    listAcademicYears(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Classes" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateClassForm
          departments={departments.map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` }))}
          academicYears={academicYears.map((y) => ({ id: y.id, label: y.label }))}
        />
        {classes.length === 0 ? (
          <EmptyState title="No classes yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Class</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Academic Year</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {c.yearOfStudy}-{c.section}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{c.department.code}</td>
                      <td className="px-4 py-2 text-slate-700">{c.academicYear.label}</td>
                      <td className="px-4 py-2">
                        <Badge label={c.status} variant={c.status === "ACTIVE" ? "safe" : "neutral"} />
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
