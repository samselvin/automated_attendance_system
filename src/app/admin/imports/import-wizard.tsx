"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const STUDENT_FIELDS = [
  "email", "rollNumber", "registerNumber", "fullName", "dateOfBirth",
  "departmentCode", "regulationCode", "batchLabel", "admissionType",
  "academicYearLabel", "yearOfStudy", "section", "semesterNumber",
  "effectiveFrom", "parentName", "parentRelationship", "parentMobile",
];
const TEACHER_FIELDS = ["email", "employeeId", "fullName", "designation", "departmentCode", "mobileNumber"];
const SUBJECT_FIELDS = ["code", "name", "departmentCode", "regulationCode", "semesterNumber", "credits", "type"];

interface ImportRow {
  id: string;
  rowNumber: number;
  status: string;
  errors: string[];
}
interface ImportJob {
  id: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  rows: ImportRow[];
}

export function ImportWizard() {
  const router = useRouter();
  const [entityType, setEntityType] = useState<"STUDENT" | "TEACHER" | "SUBJECT">("STUDENT");
  const [csvText, setCsvText] = useState("");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ imported: number; credentials: { email: string; tempPassword: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fields = entityType === "STUDENT" ? STUDENT_FIELDS : entityType === "TEACHER" ? TEACHER_FIELDS : SUBJECT_FIELDS;

  async function handlePreview() {
    setError(null);
    setLoading(true);
    const headerLine = csvText.split("\n")[0]?.trim();
    const headers = headerLine ? headerLine.split(",").map((h) => h.trim()) : [];
    const columnMapping: Record<string, string> = {};
    for (const field of fields) {
      if (headers.includes(field)) columnMapping[field] = field;
    }

    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, csvText, columnMapping }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not process CSV.");
      return;
    }
    setJob(body);
  }

  async function handleConfirm() {
    if (!job) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/imports/${job.id}/confirm`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.message ?? "Could not confirm import.");
      return;
    }
    setConfirmResult({ imported: body.job.validRows, credentials: body.issuedCredentials });
    router.refresh();
  }

  if (confirmResult) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">Imported {confirmResult.imported} row(s).</p>
        {confirmResult.credentials.length > 0 ? (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-white p-2 text-xs">
            <p className="mb-1 font-semibold text-slate-700">Temp passwords (shown once — share securely):</p>
            {confirmResult.credentials.map((c) => (
              <p key={c.email} className="font-mono">
                {c.email}: {c.tempPassword}
              </p>
            ))}
          </div>
        ) : null}
        <Button
          className="mt-3"
          onClick={() => {
            setJob(null);
            setConfirmResult(null);
            setCsvText("");
          }}
        >
          Start another import
        </Button>
      </div>
    );
  }

  if (job) {
    const errorRows = job.rows.filter((r) => r.status === "ERROR" || r.status === "DUPLICATE");
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="rounded-lg bg-slate-100 p-2">
            <p className="font-semibold">{job.totalRows}</p>
            <p className="text-xs text-slate-600">Total</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <p className="font-semibold text-emerald-700">{job.validRows}</p>
            <p className="text-xs text-slate-600">Valid</p>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <p className="font-semibold text-red-700">{job.errorRows}</p>
            <p className="text-xs text-slate-600">Errors</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-2">
            <p className="font-semibold text-amber-700">{job.duplicateRows}</p>
            <p className="text-xs text-slate-600">Duplicates</p>
          </div>
        </div>
        {errorRows.length > 0 ? (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 text-xs">
            {errorRows.map((r) => (
              <p key={r.id}>
                Row {r.rowNumber}: {r.errors.join("; ")}
              </p>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setJob(null)}>
            Back
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={loading || job.validRows === 0}>
            {loading ? "Confirming…" : `Confirm import (${job.validRows} rows)`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <select
        value={entityType}
        onChange={(e) => setEntityType(e.target.value as "STUDENT" | "TEACHER" | "SUBJECT")}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      >
        <option value="STUDENT">Students</option>
        <option value="TEACHER">Teachers</option>
        <option value="SUBJECT">Subjects</option>
      </select>
      <p className="text-xs text-slate-600">
        Paste CSV with a header row using exactly these column names: <span className="font-mono">{fields.join(", ")}</span>
      </p>
      <textarea
        rows={8}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={fields.join(",")}
        className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={handlePreview} disabled={loading || !csvText.trim()}>
        {loading ? "Validating…" : "Preview"}
      </Button>
    </div>
  );
}
