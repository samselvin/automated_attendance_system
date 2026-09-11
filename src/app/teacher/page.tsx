import { requireRolePage } from "@/lib/guards";
import { getActiveAdvisorClassIds } from "@/lib/class-advisor";
import { TopBar } from "@/components/top-bar";

export default async function TeacherDashboard() {
  const session = await requireRolePage("TEACHER");
  const advisorClassIds = session.user.teacherId
    ? await getActiveAdvisorClassIds(session.user.teacherId)
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={`Good day, ${session.user.email}`} subtitle="Teacher" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">Current period</p>
          <p className="mt-1 text-sm text-slate-500">No timetable data yet — coming in a later phase.</p>
        </div>
        {advisorClassIds.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Class Advisor duties</p>
            <p className="mt-1 text-sm text-slate-500">
              You are the active Class Advisor for {advisorClassIds.length} class(es).
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
