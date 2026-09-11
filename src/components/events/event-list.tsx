"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface EventRow {
  id: string;
  title: string;
  type: string;
  audienceType: string;
  startAt: string;
  endAt: string;
  venue: string | null;
  isPublished: boolean;
  department?: { code: string } | null;
  class?: { yearOfStudy: number; section: string } | null;
  studentGroup?: { name: string } | null;
}

function audienceLabel(e: EventRow): string {
  switch (e.audienceType) {
    case "COLLEGE":
      return "Whole college";
    case "DEPARTMENT":
      return e.department?.code ?? "Department";
    case "YEAR":
      return `${e.department?.code ?? ""} Year ${e.class?.yearOfStudy ?? ""}`.trim();
    case "CLASS":
      return e.class ? `${e.department?.code ?? ""} ${e.class.yearOfStudy}-${e.class.section}` : "Class";
    case "GROUP":
      return e.studentGroup?.name ?? "Group";
    default:
      return e.audienceType;
  }
}

export function EventList({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish(id: string) {
    setError(null);
    setBusyId(id);
    const res = await fetch(`/api/events/${id}/publish`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setError(body?.message ?? "Could not publish this event.");
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this draft event? This can't be undone.")) return;
    setError(null);
    setBusyId(id);
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    setBusyId(null);
    if (!res.ok) {
      setError(body?.message ?? "Could not delete this event.");
      return;
    }
    router.refresh();
  }

  if (events.length === 0) return <EmptyState title="No events yet" />;

  return (
    <div className="space-y-2">
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <ul className="divide-y divide-slate-100">
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {e.title} <span className="font-normal text-slate-400">· {e.type}</span>
              </p>
              <p className="text-xs text-slate-500">
                {audienceLabel(e)} · {new Date(e.startAt).toLocaleString()} – {new Date(e.endAt).toLocaleString()}
                {e.venue ? ` · ${e.venue}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={e.isPublished ? "Published" : "Draft"} variant={e.isPublished ? "safe" : "neutral"} />
              {!e.isPublished ? (
                <>
                  <Button variant="secondary" className="!px-2 !py-1 text-xs" disabled={busyId === e.id} onClick={() => handlePublish(e.id)}>
                    Publish
                  </Button>
                  <Button variant="danger" className="!px-2 !py-1 text-xs" disabled={busyId === e.id} onClick={() => handleDelete(e.id)}>
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
