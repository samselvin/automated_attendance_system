"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function AssignAdvisorForm({ classes, teachers }: { classes: Option[]; teachers: Option[] }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [mode, setMode] = useState<"assign" | "change">("assign");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const endpoint = mode === "assign" ? `/api/classes/${classId}/advisors` : `/api/classes/${classId}/advisors/change`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, effectiveFrom }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not assign advisor.");
      return;
    }
    setEffectiveFrom("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-700">Class</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Teacher</label>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Effective from</label>
        <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as "assign" | "change")} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="assign">Assign (add)</option>
          <option value="change">Change (replace current)</option>
        </select>
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Saving…" : "Save posting"}
      </Button>
    </form>
  );
}
