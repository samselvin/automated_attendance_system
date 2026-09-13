"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateSubstitutionForm({ teachers, classes }: { teachers: Option[]; classes: Option[] }) {
  const router = useRouter();
  const [originalTeacherId, setOriginalTeacherId] = useState(teachers[0]?.id ?? "");
  const [substituteTeacherId, setSubstituteTeacherId] = useState(teachers[1]?.id ?? teachers[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/substitutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalTeacherId, substituteTeacherId, classId, date, reason: reason || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not assign substitute.");
      return;
    }
    setDate("");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-5">
      <select value={originalTeacherId} onChange={(e) => setOriginalTeacherId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <select value={substituteTeacherId} onChange={(e) => setSubstituteTeacherId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      {error ? <p className="col-span-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Assigning…" : "Assign substitute"}
      </Button>
    </form>
  );
}
