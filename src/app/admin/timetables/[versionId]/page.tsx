import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listTimetableEntries } from "@/server/services/timetable.service";
import { listSubjectOfferings } from "@/server/services/subject.service";
import { listTeachers } from "@/server/services/teacher.service";
import { listRooms } from "@/server/services/room.service";
import { prisma } from "@/lib/prisma";
import { AddEntryForm } from "./add-entry-form";
import { LockToggle } from "./lock-toggle";
import { DeleteEntryButton } from "./delete-entry-button";

export default async function TimetableVersionPage({ params }: { params: Promise<{ versionId: string }> }) {
  const session = await requireRolePage("ADMIN");
  const { versionId } = await params;

  const version = await prisma.timetableVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: { class: true, bellSchedule: { include: { slots: { orderBy: { sortOrder: "asc" } } } } },
  });

  const [entries, offerings, teachers, rooms] = await Promise.all([
    listTimetableEntries(versionId),
    listSubjectOfferings(session, { classId: version.classId, semesterId: version.semesterId }),
    listTeachers(session),
    listRooms(),
  ]);

  const periodSlots = version.bellSchedule.slots.filter((s) => s.slotType === "PERIOD");

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={`${version.class.yearOfStudy}-${version.class.section} Timetable`}
        subtitle={`${version.bellSchedule.name} · ${version.timetableType}`}
        showNotifications={false}
        extra={<LockToggle versionId={version.id} isLocked={version.isLocked} />}
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {!version.isLocked ? (
          <AddEntryForm
            timetableVersionId={version.id}
            timetableType={version.timetableType}
            offerings={offerings.map((o) => ({ id: o.id, label: o.subject.name }))}
            slots={periodSlots.map((s) => ({ id: s.id, label: `${s.label} (${s.startTime}-${s.endTime})` }))}
            teachers={teachers.map((t) => ({ id: t.id, label: t.fullName }))}
            rooms={rooms.map((r) => ({ id: r.id, label: r.name }))}
          />
        ) : (
          <p className="text-xs text-amber-600">Timetable is locked. Unlock to add entries directly, or route changes through teacher change requests.</p>
        )}

        <Card>
          <CardHeader title="Entries" />
          {entries.length === 0 ? (
            <EmptyState title="No entries yet" />
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {e.subjectOffering.subject.name} · {e.weekday ?? `Day ${e.dayOrder}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.slots.map((s) => s.bellScheduleSlot.label).join(", ")} ·{" "}
                      {e.teachers.map((t) => t.teacher.fullName).join(", ")}
                    </p>
                  </div>
                  {!version.isLocked ? <DeleteEntryButton entryId={e.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
