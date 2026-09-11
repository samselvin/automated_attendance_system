import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listDepartments } from "@/server/services/department.service";
import { CreateDepartmentForm } from "./create-form";

export default async function DepartmentsPage() {
  const session = await requireRolePage("ADMIN");
  const departments = await listDepartments(session);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Departments" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateDepartmentForm />
        {departments.length === 0 ? (
          <EmptyState title="No departments yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{d.code}</td>
                      <td className="px-4 py-2 text-slate-700">{d.name}</td>
                      <td className="px-4 py-2">
                        <Badge label={d.status} variant={d.status === "ACTIVE" ? "safe" : "neutral"} />
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
