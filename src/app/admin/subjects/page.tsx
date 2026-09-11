import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listSubjects, listSubjectOfferings } from "@/server/services/subject.service";
import { listDepartments } from "@/server/services/department.service";
import { listRegulations } from "@/server/services/regulation.service";
import { listClasses } from "@/server/services/class.service";
import { listAcademicYears } from "@/server/services/academic-year.service";
import { listTeachers } from "@/server/services/teacher.service";
import { CreateSubjectForm } from "./create-subject-form";
import { CreateOfferingForm } from "./create-offering-form";

export default async function SubjectsPage() {
  const session = await requireRolePage("ADMIN");
  const [subjects, offerings, departments, regulations, classes, academicYears, teachers] = await Promise.all([
    listSubjects(session),
    listSubjectOfferings(session),
    listDepartments(session),
    listRegulations(session),
    listClasses(session),
    listAcademicYears(),
    listTeachers(session),
  ]);

  const currentYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Subjects & Offerings" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader title="Subjects" />
          <CreateSubjectForm departments={departments.map((d) => ({ id: d.id, label: d.code }))} regulations={regulations.map((r) => ({ id: r.id, label: r.code }))} />
          <div className="mt-3">
            {subjects.length === 0 ? (
              <EmptyState title="No subjects yet" />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {subjects.map((s) => (
                  <li key={s.id} className="flex justify-between py-1.5">
                    <span className="font-medium text-slate-900">{s.code} — {s.name}</span>
                    <span className="text-xs text-slate-500">Sem {s.semesterNumber} · {Number(s.credits)} credits</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Subject offerings" />
          <CreateOfferingForm
            subjects={subjects.map((s) => ({ id: s.id, label: `${s.code} (Sem ${s.semesterNumber})` }))}
            classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
            academicYears={academicYears.map((y) => ({ id: y.id, label: y.label }))}
            semesters={(currentYear?.semesters ?? []).map((s) => ({ id: s.id, label: `Sem ${s.number}` }))}
            teachers={teachers.map((t) => ({ id: t.id, label: t.fullName }))}
          />
          <div className="mt-3">
            {offerings.length === 0 ? (
              <EmptyState title="No offerings yet" />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {offerings.map((o) => (
                  <li key={o.id} className="py-1.5">
                    <span className="font-medium text-slate-900">{o.subject.name}</span>
                    <span className="text-xs text-slate-500"> · {o.teachers.map((t) => t.teacher.fullName).join(", ") || "no teacher"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
