"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GradeRow {
  grade: string;
  gradePoint: number;
  minMark: number;
  maxMark: number;
  isPassing: boolean;
}

export function GradingScaleEditor({ regulationId, initial }: { regulationId: string; initial: GradeRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<GradeRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateRow(i: number, patch: Partial<GradeRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { grade: "", gradePoint: 0, minMark: 0, maxMark: 0, isPassing: true }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/regulations/${regulationId}/grading-scale`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not save grading scale.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <table className="w-full text-left text-xs">
        <thead className="text-slate-600">
          <tr>
            <th className="py-1">Grade</th>
            <th className="py-1">Points</th>
            <th className="py-1">Min</th>
            <th className="py-1">Max</th>
            <th className="py-1">Pass</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1 pr-1">
                <input value={r.grade} onChange={(e) => updateRow(i, { grade: e.target.value })} className="w-14 rounded border border-slate-300 px-1 py-0.5" />
              </td>
              <td className="py-1 pr-1">
                <input type="number" value={r.gradePoint} onChange={(e) => updateRow(i, { gradePoint: Number(e.target.value) })} className="w-14 rounded border border-slate-300 px-1 py-0.5" />
              </td>
              <td className="py-1 pr-1">
                <input type="number" value={r.minMark} onChange={(e) => updateRow(i, { minMark: Number(e.target.value) })} className="w-14 rounded border border-slate-300 px-1 py-0.5" />
              </td>
              <td className="py-1 pr-1">
                <input type="number" value={r.maxMark} onChange={(e) => updateRow(i, { maxMark: Number(e.target.value) })} className="w-14 rounded border border-slate-300 px-1 py-0.5" />
              </td>
              <td className="py-1 pr-1 text-center">
                <input type="checkbox" checked={r.isPassing} onChange={(e) => updateRow(i, { isPassing: e.target.checked })} />
              </td>
              <td>
                <button type="button" onClick={() => removeRow(i)} className="text-red-500">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={addRow}>
          + Add grade
        </Button>
        <Button className="px-2 py-1 text-xs" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save grading scale"}
        </Button>
      </div>
    </div>
  );
}
