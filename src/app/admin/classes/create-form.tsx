"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateClassForm({ departments, academicYears }: { departments: Option[]; academicYears: Option[] }) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");
  const [yearOfStudy, setYearOfStudy] = useState("1");
  const [section, setSection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId, academicYearId, yearOfStudy: Number(yearOfStudy), section }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create class.");
      return;
    }
    setSection("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-700">Department</label>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Academic year</label>
        <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Year</label>
        <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Section</label>
        <input required value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Adding…" : "Add class"}
      </Button>
    </form>
  );
}
