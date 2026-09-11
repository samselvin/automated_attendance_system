"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}
interface ClassOption {
  id: string;
  label: string;
}

export function CreateStudentForm({
  departments,
  regulations,
  classes,
  semesters,
}: {
  departments: Option[];
  regulations: Option[];
  classes: ClassOption[];
  semesters: Option[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [regulationId, setRegulationId] = useState(regulations[0]?.id ?? "");
  const [batchLabel, setBatchLabel] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [semesterId, setSemesterId] = useState(semesters[0]?.id ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("Father");
  const [parentMobile, setParentMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        rollNumber,
        registerNumber: registerNumber || undefined,
        fullName,
        departmentId,
        regulationId,
        batchLabel,
        parentContacts: [{ name: parentName, relationship: parentRelationship, mobileNumber: parentMobile, isSmsContact: true }],
        enrollment: { classId, semesterId, effectiveFrom },
      }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create student.");
      return;
    }
    setEmail("");
    setRollNumber("");
    setRegisterNumber("");
    setFullName("");
    setBatchLabel("");
    setParentName("");
    setParentMobile("");
    if (body?.tempPassword) setTempPassword(body.tempPassword);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      {tempPassword ? (
        <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Temp password (shown once): <span className="font-mono font-semibold">{tempPassword}</span>
          <button type="button" onClick={() => setTempPassword(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input type="email" required placeholder="College email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input required placeholder="Roll number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input placeholder="Register number" value={registerNumber} onChange={(e) => setRegisterNumber(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input required placeholder="Batch (2025-2029)" value={batchLabel} onChange={(e) => setBatchLabel(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        <select value={regulationId} onChange={(e) => setRegulationId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {regulations.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input required placeholder="Parent name" value={parentName} onChange={(e) => setParentName(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <select value={parentRelationship} onChange={(e) => setParentRelationship(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option>Father</option>
          <option>Mother</option>
          <option>Guardian</option>
        </select>
        <input required placeholder="Parent mobile" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        {error ? <p className="col-span-full text-xs text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading} className="col-span-full text-sm sm:col-span-1">
          {loading ? "Adding…" : "Add student"}
        </Button>
      </form>
    </div>
  );
}
