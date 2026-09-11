import { requireRolePage } from "@/lib/guards";
import { adminDepartmentScope } from "@/lib/rbac";
import { TopBar } from "@/components/top-bar";

export default async function AdminDashboard() {
  const session = await requireRolePage("ADMIN");
  const scope = adminDepartmentScope(session);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="Admin Dashboard"
        subtitle={scope === "ALL" ? "College-wide" : `Scoped to ${scope.length} department(s)`}
      />
      <main className="flex-1 p-4 sm:p-6">
        <p className="text-sm text-slate-600">
          Signed in as <span className="font-medium">{session.user.email}</span>
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Students", "Teachers", "Departments", "Classes"].map((label) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">—</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Departments, regulations, academic years, classes, teachers, students and timetables
          are managed from here as later phases land.
        </p>
      </main>
    </div>
  );
}
