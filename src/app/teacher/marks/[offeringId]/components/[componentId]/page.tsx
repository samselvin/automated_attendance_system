import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { listMarksForComponent } from "@/server/services/marks.service";
import { prisma } from "@/lib/prisma";
import { MarksGrid } from "./marks-grid";

export default async function ComponentMarksPage({
  params,
}: {
  params: Promise<{ offeringId: string; componentId: string }>;
}) {
  const session = await requireRolePage("TEACHER");
  const { offeringId, componentId } = await params;

  const [offering, component, marks] = await Promise.all([
    prisma.subjectOffering.findUniqueOrThrow({ where: { id: offeringId } }),
    prisma.assessmentComponent.findUniqueOrThrow({ where: { id: componentId } }),
    listMarksForComponent(session, componentId),
  ]);

  let studentIds: string[] = [];
  if (offering.studentGroupId) {
    const members = await prisma.studentGroupMember.findMany({ where: { studentGroupId: offering.studentGroupId } });
    studentIds = members.map((m) => m.studentId);
  } else if (offering.classId) {
    const enrollments = await prisma.studentEnrollment.findMany({ where: { classId: offering.classId, status: "ACTIVE" } });
    studentIds = enrollments.map((e) => e.studentId);
  }

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, orderBy: { rollNumber: "asc" } });
  const markByStudent = new Map(marks.map((m) => [m.studentId, m]));

  const roster = students.map((s) => ({
    studentId: s.id,
    rollNumber: s.rollNumber,
    fullName: s.fullName,
    marksObtained: markByStudent.get(s.id)?.marksObtained != null ? Number(markByStudent.get(s.id)!.marksObtained) : null,
    entryStatus: (markByStudent.get(s.id)?.entryStatus ?? "PRESENT") as "PRESENT" | "ABSENT",
  }));

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title={component.label} subtitle={`Out of ${Number(component.maxMarks)}`} showNotifications={false} />
      <main className="flex-1 p-4">
        <MarksGrid componentId={componentId} maxMarks={Number(component.maxMarks)} roster={roster} />
      </main>
    </div>
  );
}
