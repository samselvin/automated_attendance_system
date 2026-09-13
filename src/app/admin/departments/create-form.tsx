"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateDepartmentForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create department.");
      return;
    }
    setCode("");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-700">Code</label>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="AIDS"
          className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-700">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artificial Intelligence and Data Science"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Adding…" : "Add department"}
      </Button>
    </form>
  );
}
