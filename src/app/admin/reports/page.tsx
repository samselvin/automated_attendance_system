import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { listClasses } from "@/server/services/class.service";
import { WeeklyAttendanceReport } from "@/components/reports/weekly-attendance-report";
import { ClassAttendanceReport } from "./class-attendance-report";
import { LowAttendanceReport } from "./low-attendance-report";

export default async function ReportsPage() {
  const session = await requireRolePage("ADMIN");
  const classes = await listClasses(session);
  const classOptions = classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }));

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Reports & Export" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <p className="text-xs text-slate-500 print:hidden">
          CSV export and print-friendly view are available below. Excel (.xlsx) and PDF export are not built yet.
        </p>
        <Card>
          <CardHeader title="Weekly attendance report" subtitle="Matches the department's paper weekly attendance register" />
          <WeeklyAttendanceReport classes={classOptions} />
        </Card>
        <Card className="print:hidden">
          <CardHeader title="Class attendance report" />
          <ClassAttendanceReport classes={classOptions} />
        </Card>
        <Card className="print:hidden">
          <CardHeader title="Low-attendance students (below Safe threshold)" />
          <LowAttendanceReport />
        </Card>
      </main>
    </div>
  );
}
