"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateTeacherForm({ departments }: { departments: Option[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, employeeId, fullName, designation: designation || undefined, departmentId }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create teacher.");
      return;
    }
    setEmail("");
    setEmployeeId("");
    setFullName("");
    setDesignation("");
    if (body?.tempPassword) setTempPassword(body.tempPassword);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      {tempPassword ? (
        <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Temp password (shown once — share it securely): <span className="font-mono font-semibold">{tempPassword}</span>
          <button type="button" onClick={() => setTempPassword(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">College email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Employee ID</label>
          <input required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Full name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Designation</label>
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Department</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading} className="text-sm">
          {loading ? "Adding…" : "Add teacher"}
        </Button>
      </form>
    </div>
  );
}
