"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

interface OfferingOption extends Option {
  teacherIds: string[];
  teacherNames: string[];
}

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function AddEntryForm({
  timetableVersionId,
  timetableType,
  offerings,
  slots,
  teachers,
  rooms,
}: {
  timetableVersionId: string;
  timetableType: "WEEKDAY" | "DAY_ORDER";
  offerings: OfferingOption[];
  slots: Option[];
  teachers: Option[];
  rooms: Option[];
}) {
  const router = useRouter();
  const [subjectOfferingId, setSubjectOfferingId] = useState(offerings[0]?.id ?? "");
  const [weekday, setWeekday] = useState(WEEKDAYS[0]);
  const [dayOrder, setDayOrder] = useState("1");
  const [slotIds, setSlotIds] = useState<string[]>(slots[0] ? [slots[0].id] : []);
  // Section 7: the staff who already teach this subject are the answer
  // almost every time, so picking a subject fills them in rather than
  // making the admin find the same names again in a list of everyone.
  const [teacherIds, setTeacherIds] = useState<string[]>(offerings[0]?.teacherIds ?? []);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedOffering = offerings.find((o) => o.id === subjectOfferingId);

  function handleOfferingChange(id: string) {
    setSubjectOfferingId(id);
    setTeacherIds(offerings.find((o) => o.id === id)?.teacherIds ?? []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/timetable-versions/${timetableVersionId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectOfferingId,
        ...(timetableType === "WEEKDAY" ? { weekday } : { dayOrder: Number(dayOrder) }),
        slotIds,
        teacherIds,
        roomId: roomId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create entry.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select value={subjectOfferingId} onChange={(e) => handleOfferingChange(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {offerings.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {timetableType === "WEEKDAY" ? (
          <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {WEEKDAYS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        ) : (
          <input type="number" min={1} value={dayOrder} onChange={(e) => setDayOrder(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        )}
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="">No room</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-600">Slot(s) — ctrl/cmd-click for multiple (lab spans)</label>
          <select multiple value={slotIds} onChange={(e) => setSlotIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600">
            Teacher(s)
            {selectedOffering?.teacherNames.length ? (
              <span className="text-indigo-700"> — {selectedOffering.teacherNames.join(", ")} from this subject</span>
            ) : null}
          </label>
          <select multiple value={teacherIds} onChange={(e) => setTeacherIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full text-sm">
        {loading ? "Adding…" : "Add entry"}
      </Button>
    </form>
  );
}
