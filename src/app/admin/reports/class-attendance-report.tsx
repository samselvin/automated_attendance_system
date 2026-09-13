"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";

interface Option {
  id: string;
  label: string;
}
interface Row {
  [key: string]: string | number;
  rollNumber: string;
  fullName: string;
  applicableHours: number;
  attendedHours: number;
  percentage: number;
  level: string;
}

export function ClassAttendanceReport({ classes }: { classes: Option[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const params = new URLSearchParams({ classId, ...(from ? { from } : {}), ...(to ? { to } : {}) });
    const res = await fetch(`/api/reports/class-attendance?${params}`);
    const body = await res.json();
    setLoading(false);
    setRows(body.rows);
    setClassName(body.className);
  }

  return (
    <div className="space-y-3 print:space-y-2">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        <Button onClick={handleGenerate} disabled={loading} className="text-sm">
          {loading ? "Generating…" : "Generate"}
        </Button>
        {rows ? (
          <>
            <Button variant="secondary" className="text-sm" onClick={() => downloadCsv(`attendance-${className}.csv`, rows)}>
              Download CSV
            </Button>
            <Button variant="secondary" className="text-sm" onClick={() => window.print()}>
              Print
            </Button>
          </>
        ) : null}
      </div>

      {rows ? (
        <div>
          <p className="mb-2 hidden text-sm font-semibold print:block">Attendance Report — {className}</p>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="py-1.5 pr-2">Roll No</th>
                <th className="py-1.5 pr-2">Name</th>
                <th className="py-1.5 pr-2">Hours</th>
                <th className="py-1.5 pr-2">%</th>
                <th className="py-1.5">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.rollNumber}>
                  <td className="py-1.5 pr-2 font-medium">{r.rollNumber}</td>
                  <td className="py-1.5 pr-2">{r.fullName}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{r.attendedHours}/{r.applicableHours}</td>
                  <td className="py-1.5 pr-2">{r.percentage}%</td>
                  <td className="py-1.5">{r.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
