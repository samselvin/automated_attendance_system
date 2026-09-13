import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listTeachers } from "@/server/services/teacher.service";
import { listDepartments } from "@/server/services/department.service";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { CreateTeacherForm } from "./create-form";

export default async function TeachersPage() {
  const session = await requireRolePage("ADMIN");
  const [teachers, departments] = await Promise.all([listTeachers(session), listDepartments(session)]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Teachers" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateTeacherForm departments={departments.map((d) => ({ id: d.id, label: `${d.code} — ${d.name}` }))} />
        {teachers.length === 0 ? (
          <EmptyState title="No teachers yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Employee ID</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{t.fullName}</td>
                      <td className="px-4 py-2 text-slate-700">{t.employeeId}</td>
                      <td className="px-4 py-2 text-slate-700">{t.user.email}</td>
                      <td className="px-4 py-2 text-slate-700">{t.department.code}</td>
                      <td className="px-4 py-2">
                        <Badge label={t.status} variant={t.status === "ACTIVE" ? "safe" : "critical"} />
                      </td>
                      <td className="px-4 py-2">
                        <ResetPasswordButton userId={t.userId} name={t.fullName} />
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
