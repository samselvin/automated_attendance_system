import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { adminDepartmentScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { computeMissingAttendance } from "@/server/services/attendance-report.service";
import { collegeDateString } from "@/lib/time";

export default async function AdminDashboard() {
  const session = await requireRolePage("ADMIN");
  const scope = adminDepartmentScope(session);
  const deptFilter = scope === "ALL" ? {} : { departmentId: { in: scope } };
  const deptIds = scope === "ALL" ? null : scope;

  const [studentCount, teacherCount, departmentCount, classCount, pendingLeave, pendingTimetableReq, pendingUnlocks, classesTotal] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE", ...deptFilter } }),
      prisma.teacher.count({ where: { status: "ACTIVE", ...deptFilter } }),
      scope === "ALL" ? prisma.department.count() : Promise.resolve(scope.length),
      prisma.class.count({ where: { status: "ACTIVE", ...deptFilter } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.timetableChangeRequest.count({ where: { status: "PENDING" } }),
      prisma.attendanceUnlockRequest.count({ where: { status: "PENDING" } }),
      prisma.class.findMany({ where: { status: "ACTIVE", ...deptFilter } }),
    ]);

  const classesWithAdvisor = await prisma.classAdvisorPosting.findMany({
    where: { status: "ACTIVE", classId: { in: classesTotal.map((c) => c.id) } },
    select: { classId: true },
  });
  const advisedClassIds = new Set(classesWithAdvisor.map((c) => c.classId));
  const classesWithoutAdvisor = classesTotal.filter((c) => !advisedClassIds.has(c.id));

  const today = collegeDateString();
  const missingToday = await computeMissingAttendance(today, deptIds).catch(() => []);

  const smsToday = await prisma.smsMessage.groupBy({
    by: ["status"],
    where: { createdAt: { gte: new Date(`${today}T00:00:00.000Z`) } },
    _count: true,
  });
  const smsSent = smsToday.find((s) => s.status === "SENT")?._count ?? 0;
  const smsFailed = smsToday.find((s) => s.status === "FAILED")?._count ?? 0;

  const recentImports = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Admin Dashboard" subtitle={scope === "ALL" ? "College-wide" : `Scoped to ${scope.length} department(s)`} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Students" value={studentCount} />
          <StatTile label="Teachers" value={teacherCount} />
          <StatTile label="Departments" value={departmentCount} />
          <StatTile label="Classes" value={classCount} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/admin/leave-requests">
            <StatTile label="Pending Leave/OD" value={pendingLeave} />
          </Link>
          <Link href="/admin/timetable-requests">
            <StatTile label="Timetable Requests" value={pendingTimetableReq} />
          </Link>
          <Link href="/admin/unlock-requests">
            <StatTile label="Late-Unlock Requests" value={pendingUnlocks} />
          </Link>
          <StatTile label="Attendance Missing Today" value={missingToday.length} />
        </div>

        <Card>
          <CardHeader title="Classes without an active Class Advisor" />
          {classesWithoutAdvisor.length === 0 ? (
            <EmptyState title="Every class has an advisor" />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {classesWithoutAdvisor.map((c) => (
                <li key={c.id} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  {c.yearOfStudy}-{c.section}
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/class-advisors" className="mt-2 inline-block text-xs font-medium text-slate-600 underline">
            Manage postings
          </Link>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="First-hour SMS today" />
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600">Sent: {smsSent}</span>
              <span className="text-red-600">Failed: {smsFailed}</span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent imports" />
            {recentImports.length === 0 ? (
              <EmptyState title="No imports yet" />
            ) : (
              <ul className="space-y-1 text-sm">
                {recentImports.map((job) => (
                  <li key={job.id} className="flex justify-between">
                    <span>{job.entityType}</span>
                    <span className="text-slate-500">
                      {job.status} · {job.validRows}/{job.totalRows}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/imports" className="mt-2 inline-block text-xs font-medium text-slate-600 underline">
              View all imports
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}
