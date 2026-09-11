import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listStudents } from "@/server/services/student.service";
import { listDepartments } from "@/server/services/department.service";
import { listRegulations } from "@/server/services/regulation.service";
import { listClasses } from "@/server/services/class.service";
import { listAcademicYears } from "@/server/services/academic-year.service";
import { CreateStudentForm } from "./create-form";

export default async function StudentsPage() {
  const session = await requireRolePage("ADMIN");
  const [students, departments, regulations, classes, academicYears] = await Promise.all([
    listStudents(session),
    listDepartments(session),
    listRegulations(session),
    listClasses(session),
    listAcademicYears(),
  ]);

  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
  const semesters = currentYear?.semesters ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Students" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Link href="/admin/imports" className="text-xs font-medium text-slate-600 underline">
            Bulk import via CSV →
          </Link>
        </div>
        <CreateStudentForm
          departments={departments.map((d) => ({ id: d.id, label: d.code }))}
          regulations={regulations.map((r) => ({ id: r.id, label: r.code }))}
          classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
          semesters={semesters.map((s) => ({ id: s.id, label: `Semester ${s.number}` }))}
        />
        {students.length === 0 ? (
          <EmptyState title="No students yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Roll No</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Class</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{s.rollNumber}</td>
                      <td className="px-4 py-2 text-slate-700">{s.fullName}</td>
                      <td className="px-4 py-2 text-slate-700">
                        {s.enrollments[0] ? `${s.enrollments[0].class.yearOfStudy}-${s.enrollments[0].class.section}` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge label={s.status} variant={s.status === "ACTIVE" ? "safe" : "neutral"} />
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
