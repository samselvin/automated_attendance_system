import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/guards";
import { isActiveClassAdvisor } from "@/lib/class-advisor";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { WeeklyAttendanceReport } from "@/components/reports/weekly-attendance-report";

export default async function TeacherClassReportPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const session = await requireRolePage("TEACHER");
  const { classId } = await searchParams;
  const teacherId = session.user.teacherId;

  if (!classId || !teacherId || !(await isActiveClassAdvisor(teacherId, classId))) {
    redirect("/forbidden");
  }

  const cls = await prisma.class.findUniqueOrThrow({ where: { id: classId }, include: { department: true } });
  const classLabel = `${cls.department.code} ${cls.yearOfStudy}-${cls.section}`;

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Weekly Attendance Report" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader title="Weekly attendance report" subtitle="Matches the department's paper weekly attendance register" />
          <WeeklyAttendanceReport fixedClassId={classId} fixedClassLabel={classLabel} />
        </Card>
      </main>
    </div>
  );
}
