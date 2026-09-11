import Link from "next/link";
import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listAssessmentComponents } from "@/server/services/assessment.service";
import { prisma } from "@/lib/prisma";
import { AddComponentForm } from "./add-component-form";

export default async function OfferingMarksPage({ params }: { params: Promise<{ offeringId: string }> }) {
  await requireRolePage("TEACHER");
  const { offeringId } = await params;

  const [offering, components] = await Promise.all([
    prisma.subjectOffering.findUniqueOrThrow({ where: { id: offeringId }, include: { subject: true, class: true } }),
    listAssessmentComponents(offeringId),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={offering.subject.name}
        subtitle={offering.class ? `${offering.class.yearOfStudy}-${offering.class.section}` : undefined}
        showNotifications={false}
      />
      <main className="flex-1 space-y-4 p-4">
        <Card>
          <CardHeader title="Assessment components" />
          {components.length === 0 ? (
            <EmptyState title="No components yet" subtitle="Add CAT/Class Test/Assignment/MCQ components below." />
          ) : (
            <ul className="mb-3 divide-y divide-slate-100">
              {components.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-500">
                      {c.groupKey} · out of {Number(c.maxMarks)}
                    </p>
                  </div>
                  <Link href={`/teacher/marks/${offeringId}/components/${c.id}`} className="text-xs font-medium text-slate-600 underline">
                    Enter marks
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!offering.marksLocked ? (
            <AddComponentForm offeringId={offeringId} existing={components.map((c) => ({ id: c.id, groupKey: c.groupKey, label: c.label }))} />
          ) : (
            <p className="text-xs text-amber-600">Marks are locked for this offering — contact Admin to add components.</p>
          )}
        </Card>
      </main>
    </div>
  );
}
