import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listClasses } from "@/server/services/class.service";
import { listTeachers } from "@/server/services/teacher.service";
import { listPostings } from "@/server/services/class-advisor.service";
import { AssignAdvisorForm } from "./assign-form";

export default async function ClassAdvisorsPage() {
  const session = await requireRolePage("ADMIN");
  const [classes, teachers] = await Promise.all([listClasses(session), listTeachers(session)]);

  const classesWithPostings = await Promise.all(
    classes.map(async (c) => ({ class: c, postings: await listPostings(session, c.id) }))
  );

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Class Advisors" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <AssignAdvisorForm
          classes={classes.map((c) => ({ id: c.id, label: `${c.department.code} ${c.yearOfStudy}-${c.section}` }))}
          teachers={teachers.map((t) => ({ id: t.id, label: t.fullName }))}
        />
        {classesWithPostings.map(({ class: c, postings }) => {
          const active = postings.filter((p) => p.status === "ACTIVE");
          return (
            <Card key={c.id}>
              <CardHeader
                title={`${c.department.code} ${c.yearOfStudy}-${c.section}`}
                action={active.length === 0 ? <Badge label="No advisor" variant="warning" /> : undefined}
              />
              {postings.length === 0 ? (
                <p className="text-sm text-slate-500">No postings yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {postings.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span className={p.status === "ACTIVE" ? "font-medium text-slate-900" : "text-slate-500"}>
                        {p.teacher.fullName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(p.effectiveFrom).toLocaleDateString()} –{" "}
                        {p.effectiveTo ? new Date(p.effectiveTo).toLocaleDateString() : "Current"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </main>
    </div>
  );
}
