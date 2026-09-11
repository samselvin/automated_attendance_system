import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listSubstitutions } from "@/server/services/substitution.service";
import { listTeachers } from "@/server/services/teacher.service";
import { listClasses } from "@/server/services/class.service";
import { CreateSubstitutionForm } from "./create-form";

export default async function SubstitutionsPage() {
  const session = await requireRolePage("ADMIN");
  const [substitutions, teachers, classes] = await Promise.all([
    listSubstitutions(),
    listTeachers(session),
    listClasses(session),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Substitutions" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <CreateSubstitutionForm
          teachers={teachers.map((t) => ({ id: t.id, label: t.fullName }))}
          classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
        />
        {substitutions.length === 0 ? (
          <EmptyState title="No substitutions yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Original</th>
                    <th className="px-4 py-2">Substitute</th>
                    <th className="px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {substitutions.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-slate-700">{new Date(s.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{s.originalTeacher.fullName}</td>
                      <td className="px-4 py-2 text-slate-700">{s.substituteTeacher.fullName}</td>
                      <td className="px-4 py-2 text-slate-500">{s.reason ?? "—"}</td>
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
