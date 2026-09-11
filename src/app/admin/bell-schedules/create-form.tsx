"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Slot {
  slotType: string;
  periodNumber: string;
  label: string;
  startTime: string;
  endTime: string;
}

const DEFAULT_SLOTS: Slot[] = [
  { slotType: "PERIOD", periodNumber: "1", label: "Period 1", startTime: "09:00", endTime: "09:50" },
  { slotType: "PERIOD", periodNumber: "2", label: "Period 2", startTime: "09:50", endTime: "10:40" },
  { slotType: "SHORT_BREAK", periodNumber: "", label: "Break", startTime: "10:40", endTime: "10:55" },
  { slotType: "PERIOD", periodNumber: "3", label: "Period 3", startTime: "10:55", endTime: "11:45" },
  { slotType: "PERIOD", periodNumber: "4", label: "Period 4", startTime: "11:45", endTime: "12:35" },
  { slotType: "LUNCH", periodNumber: "", label: "Lunch", startTime: "12:35", endTime: "13:25" },
  { slotType: "PERIOD", periodNumber: "5", label: "Period 5", startTime: "13:25", endTime: "14:15" },
  { slotType: "PERIOD", periodNumber: "6", label: "Period 6", startTime: "14:15", endTime: "15:05" },
  { slotType: "PERIOD", periodNumber: "7", label: "Period 7", startTime: "15:05", endTime: "15:55" },
];

export function CreateBellScheduleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSlot() {
    setSlots((prev) => [...prev, { slotType: "PERIOD", periodNumber: "", label: "", startTime: "", endTime: "" }]);
  }
  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/bell-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slots: slots.map((s, i) => ({
          slotType: s.slotType,
          periodNumber: s.periodNumber ? Number(s.periodNumber) : undefined,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
          sortOrder: i + 1,
        })),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create bell schedule.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
      <input required placeholder="Schedule name (e.g. Regular Weekday)" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {slots.map((s, i) => (
          <div key={i} className="grid grid-cols-6 gap-1 text-xs">
            <select value={s.slotType} onChange={(e) => updateSlot(i, { slotType: e.target.value })} className="rounded border border-slate-300 px-1 py-1">
              <option value="PERIOD">Period</option>
              <option value="SHORT_BREAK">Short Break</option>
              <option value="TEA_BREAK">Tea Break</option>
              <option value="LUNCH">Lunch</option>
              <option value="SPECIAL_BREAK">Special Break</option>
              <option value="FREE">Free</option>
            </select>
            <input placeholder="#" value={s.periodNumber} onChange={(e) => updateSlot(i, { periodNumber: e.target.value })} className="rounded border border-slate-300 px-1 py-1" />
            <input placeholder="Label" value={s.label} onChange={(e) => updateSlot(i, { label: e.target.value })} className="rounded border border-slate-300 px-1 py-1" />
            <input type="time" value={s.startTime} onChange={(e) => updateSlot(i, { startTime: e.target.value })} className="rounded border border-slate-300 px-1 py-1" />
            <input type="time" value={s.endTime} onChange={(e) => updateSlot(i, { endTime: e.target.value })} className="rounded border border-slate-300 px-1 py-1" />
            <button type="button" onClick={() => removeSlot(i)} className="text-red-500">✕</button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" className="text-xs" onClick={addSlot}>+ Add slot</Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full text-sm">
        {loading ? "Creating…" : "Create bell schedule"}
      </Button>
    </form>
  );
}
