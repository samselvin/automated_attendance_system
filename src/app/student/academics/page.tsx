import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyStudentProfile } from "@/server/services/student-self.service";
import { getMyMarksOverview } from "@/server/services/marks.service";
import { getStudentSgpa, getStudentCgpa } from "@/server/services/semester-result.service";

const GROUP_LABELS: Record<string, string> = {
  CAT: "CAT",
  CLASS_TEST: "Class Tests",
  ASSIGNMENT: "Assignments",
  MCQ: "MCQ",
};

export default async function StudentAcademicsPage() {
  const session = await requireRolePage("STUDENT");
  const { student, enrollment } = await getMyStudentProfile(session);

  const [overview, cgpa] = await Promise.all([
    getMyMarksOverview(session, student.id),
    getStudentCgpa(session, student.id),
  ]);
  const sgpa = enrollment ? await getStudentSgpa(session, student.id, enrollment.semesterId) : null;

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Academics" />
      <main className="flex-1 space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="SGPA (this semester)" value={sgpa ? sgpa.sgpa.toFixed(2) : "—"} />
          <StatTile label="CGPA" value={cgpa.cgpa.toFixed(2)} />
        </div>

        {overview.length === 0 ? (
          <EmptyState title="No marks published yet" subtitle="Your teachers haven't published marks for this semester." />
        ) : (
          overview.map((subject) => (
            <Card key={subject.subjectOfferingId}>
              <CardHeader
                title={subject.subjectName}
                subtitle={subject.subjectCode}
                action={
                  subject.internalMark != null ? (
                    <span className="text-sm font-semibold text-slate-900">Internal: {Number(subject.internalMark)}/40</span>
                  ) : undefined
                }
              />
              {["CAT", "CLASS_TEST", "ASSIGNMENT", "MCQ"].map((group) => {
                const items = subject.components.filter((c) => c.groupKey === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-2">
                    <p className="text-xs font-medium text-slate-600">{GROUP_LABELS[group] ?? group}</p>
                    <ul className="mt-1 space-y-1">
                      {items.map((c) => (
                        <li key={c.id} className="flex justify-between text-sm">
                          <span className="text-slate-700">{c.label}</span>
                          <span className="font-medium text-slate-900">
                            {c.entryStatus === "ABSENT" ? "Absent" : `${c.marksObtained ?? "—"}/${c.maxMarks}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {subject.grade ? (
                <p className="mt-2 border-t border-slate-100 pt-2 text-sm">
                  Semester result: <span className="font-semibold text-slate-900">{subject.grade}</span> (
                  {Number(subject.gradePoint)} points)
                </p>
              ) : null}
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
