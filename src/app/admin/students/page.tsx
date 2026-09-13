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
import { ResetPasswordButton } from "@/components/reset-password-button";
import { CreateStudentForm } from "./create-form";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await requireRolePage("ADMIN");
  const { page: pageParam, search } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);

  const [{ students, total, pageSize }, departments, regulations, classes, academicYears] = await Promise.all([
    listStudents(session, { page, search }),
    listDepartments(session),
    listRegulations(session),
    listClasses(session),
    listAcademicYears(),
  ]);

  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
  const semesters = currentYear?.semesters ?? [];
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/students?${qs}` : "/admin/students";
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Students" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Link href="/admin/imports" className="text-xs font-medium text-slate-700 underline">
            Bulk import via CSV →
          </Link>
        </div>
        <CreateStudentForm
          departments={departments.map((d) => ({ id: d.id, label: d.code }))}
          regulations={regulations.map((r) => ({ id: r.id, label: r.code }))}
          classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
          semesters={semesters.map((s) => ({ id: s.id, label: `Semester ${s.number}` }))}
        />
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search by name or roll number"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700">
            Search
          </button>
        </form>
        {students.length === 0 ? (
          <EmptyState title="No students yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Roll No</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Class</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Actions</th>
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
                      <td className="px-4 py-2">
                        <ResetPasswordButton userId={s.userId} name={s.fullName} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages} · {total} student{total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700">
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
