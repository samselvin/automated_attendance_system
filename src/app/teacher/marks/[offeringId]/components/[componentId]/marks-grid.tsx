"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RosterRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  marksObtained: number | null;
  entryStatus: "PRESENT" | "ABSENT";
}

export function MarksGrid({ componentId, maxMarks, roster }: { componentId: string; maxMarks: number; roster: RosterRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(roster);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(studentId: string, patch: Partial<RosterRow>) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/assessment-components/${componentId}/marks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: rows.map((r) => ({
          studentId: r.studentId,
          marksObtained: r.entryStatus === "ABSENT" ? null : r.marksObtained,
          entryStatus: r.entryStatus,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not save marks.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.studentId} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{r.rollNumber}</p>
                <p className="truncate text-xs text-slate-600">{r.fullName}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxMarks}
                  disabled={r.entryStatus === "ABSENT"}
                  value={r.marksObtained ?? ""}
                  onChange={(e) => update(r.studentId, { marksObtained: e.target.value === "" ? null : Number(e.target.value) })}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                />
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={r.entryStatus === "ABSENT"}
                    onChange={(e) => update(r.studentId, { entryStatus: e.target.checked ? "ABSENT" : "PRESENT", marksObtained: e.target.checked ? null : r.marksObtained })}
                  />
                  Absent
                </label>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-600">Saved.</p> : null}
      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save marks"}
      </Button>
    </div>
  );
}
