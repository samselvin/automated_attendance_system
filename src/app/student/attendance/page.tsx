import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, attendanceLevelVariant, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyStudentProfile } from "@/server/services/student-self.service";
import { getStudentAttendancePercentage, getStudentSubjectWiseAttendance } from "@/server/services/attendance-report.service";
import { listLeaveRequests } from "@/server/services/leave.service";

export default async function StudentAttendancePage() {
  const session = await requireRolePage("STUDENT");
  const { student } = await getMyStudentProfile(session);

  const [overall, bySubject, leaveRequests] = await Promise.all([
    getStudentAttendancePercentage(session, student.id, {}),
    getStudentSubjectWiseAttendance(session, student.id),
    listLeaveRequests(session, { studentId: student.id }),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Attendance" />
      <main className="flex-1 space-y-4 p-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Overall attendance</p>
              <p className="text-2xl font-semibold text-slate-900">{overall.percentageRounded}%</p>
            </div>
            <Badge label={overall.level} variant={attendanceLevelVariant(overall.level)} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {overall.attendedHours} of {overall.applicableHours} hours attended
          </p>
        </Card>

        <Link href="/student/attendance/apply">
          <Button className="w-full">Apply for Leave / OD</Button>
        </Link>

        <Card>
          <CardHeader title="Subject-wise attendance" />
          {bySubject.length === 0 ? (
            <EmptyState title="No attendance recorded yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {bySubject.map((s) => (
                <li key={s.subjectOfferingId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{s.subjectName}</p>
                    <p className="text-xs text-slate-600">
                      {s.attendedHours}/{s.applicableHours} hours
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{s.percentageRounded}%</span>
                    <Badge label={s.level} variant={attendanceLevelVariant(s.level)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Leave & OD history" />
          {leaveRequests.length === 0 ? (
            <EmptyState title="No leave or OD requests yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {leaveRequests.map((req) => (
                <li key={req.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{req.type}</p>
                    <Badge label={req.status} variant={statusVariant(req.status)} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {new Date(req.fromDate).toLocaleDateString()} – {new Date(req.toDate).toLocaleDateString()}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{req.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
