"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateVersionForm({ classes, semesters, bellSchedules }: { classes: Option[]; semesters: Option[]; bellSchedules: Option[] }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [semesterId, setSemesterId] = useState(semesters[0]?.id ?? "");
  const [bellScheduleId, setBellScheduleId] = useState(bellSchedules[0]?.id ?? "");
  const [timetableType, setTimetableType] = useState<"WEEKDAY" | "DAY_ORDER">("WEEKDAY");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/timetable-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, semesterId, bellScheduleId, timetableType, effectiveFrom }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create timetable version.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-5">
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select value={bellScheduleId} onChange={(e) => setBellScheduleId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {bellSchedules.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select>
      <select value={timetableType} onChange={(e) => setTimetableType(e.target.value as "WEEKDAY" | "DAY_ORDER")} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        <option value="WEEKDAY">Weekday</option>
        <option value="DAY_ORDER">Day Order</option>
      </select>
      <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      {error ? <p className="col-span-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Creating…" : "Create version"}
      </Button>
    </form>
  );
}
