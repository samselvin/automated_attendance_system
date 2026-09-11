import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";

export default async function StudentDashboard() {
  const session = await requireRolePage("STUDENT");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Home" subtitle={session.user.email} />
      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Attendance</p>
          <p className="mt-1 text-sm text-slate-500">No attendance data yet — coming in a later phase.</p>
        </div>
      </main>
    </div>
  );
}
