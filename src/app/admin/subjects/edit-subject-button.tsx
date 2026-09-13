"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EditSubjectButton({
  subjectId,
  initialName,
  initialCredits,
  initialStatus,
}: {
  subjectId: string;
  initialName: string;
  initialCredits: number;
  initialStatus: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [credits, setCredits] = useState(initialCredits);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/subjects/${subjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, credits, status }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not update subject.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-slate-600 underline">
        Edit
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-40 rounded border border-slate-300 px-1.5 py-0.5 text-xs" />
      <input
        type="number"
        step="0.5"
        min={0}
        max={10}
        value={credits}
        onChange={(e) => setCredits(Number(e.target.value))}
        className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs"
      />
      <select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
      <Button className="!px-2 !py-1 text-xs" disabled={loading} onClick={handleSave}>
        {loading ? "Saving…" : "Save"}
      </Button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-slate-500">
        Cancel
      </button>
      {error ? <span className="w-full text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
