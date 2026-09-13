"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ExistingComponent {
  id: string;
  groupKey: string;
  label: string;
}

export function AddComponentForm({ offeringId, existing }: { offeringId: string; existing: ExistingComponent[] }) {
  const router = useRouter();
  const [groupKey, setGroupKey] = useState("CAT");
  const [label, setLabel] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [isRetestFor, setIsRetestFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const retestCandidates = existing.filter((c) => c.groupKey === groupKey);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/subject-offerings/${offeringId}/assessment-components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupKey,
        label,
        maxMarks: Number(maxMarks),
        isRetestFor: isRetestFor || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create component.");
      return;
    }
    setLabel("");
    setMaxMarks("");
    setIsRetestFor("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-xs font-semibold text-slate-700">Add assessment component</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={groupKey} onChange={(e) => setGroupKey(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="CAT">CAT</option>
          <option value="CLASS_TEST">Class Test</option>
          <option value="ASSIGNMENT">Assignment</option>
          <option value="MCQ">MCQ</option>
        </select>
        <input
          type="number"
          placeholder="Max marks"
          required
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <input
        type="text"
        placeholder="Label (e.g. CAT 1)"
        required
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      {retestCandidates.length > 0 ? (
        <select value={isRetestFor} onChange={(e) => setIsRetestFor(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="">Not a retest</option>
          {retestCandidates.map((c) => (
            <option key={c.id} value={c.id}>
              Retest for: {c.label}
            </option>
          ))}
        </select>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full text-xs">
        {loading ? "Adding…" : "Add component"}
      </Button>
    </form>
  );
}
