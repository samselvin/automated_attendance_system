"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AddSemesterForm({ academicYearId }: { academicYearId: string }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [type, setType] = useState<"ODD" | "EVEN">("ODD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/academic-years/${academicYearId}/semesters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: Number(number), type, startDate, endDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not add semester.");
      return;
    }
    setNumber("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
      <input
        type="number"
        min={1}
        max={8}
        required
        placeholder="Sem #"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <select value={type} onChange={(e) => setType(e.target.value as "ODD" | "EVEN")} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
        <option value="ODD">Odd</option>
        <option value="EVEN">Even</option>
      </select>
      <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
      <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="px-2 py-1 text-xs">
        {loading ? "…" : "Add semester"}
      </Button>
    </form>
  );
}
