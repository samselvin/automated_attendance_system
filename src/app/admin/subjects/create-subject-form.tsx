"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateSubjectForm({ departments, regulations }: { departments: Option[]; regulations: Option[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [regulationId, setRegulationId] = useState(regulations[0]?.id ?? "");
  const [semesterNumber, setSemesterNumber] = useState("1");
  const [credits, setCredits] = useState("");
  const [type, setType] = useState("THEORY");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code, name, departmentId, regulationId,
        semesterNumber: Number(semesterNumber),
        credits: Number(credits),
        type,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create subject.");
      return;
    }
    setCode("");
    setName("");
    setCredits("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-4">
      <input required placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:col-span-1" />
      <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>
      <select value={regulationId} onChange={(e) => setRegulationId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {regulations.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <select value={semesterNumber} onChange={(e) => setSemesterNumber(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Sem {n}</option>)}
      </select>
      <input required type="number" step="0.5" placeholder="Credits" value={credits} onChange={(e) => setCredits(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        <option value="THEORY">Theory</option>
        <option value="LAB">Lab</option>
        <option value="THEORY_WITH_LAB">Theory + Lab</option>
        <option value="ELECTIVE">Elective</option>
        <option value="PROJECT">Project</option>
        <option value="NON_CREDIT">Non-credit</option>
      </select>
      {error ? <p className="col-span-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Adding…" : "Add subject"}
      </Button>
    </form>
  );
}
