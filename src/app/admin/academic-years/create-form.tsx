"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateAcademicYearForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, startDate, endDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create academic year.");
      return;
    }
    setLabel("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-600">Label</label>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="2026-2027"
          className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Start date</label>
        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">End date</label>
        <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Adding…" : "Add academic year"}
      </Button>
    </form>
  );
}
