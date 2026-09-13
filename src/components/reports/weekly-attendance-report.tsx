"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";

interface Option {
  id: string;
  label: string;
}

interface ReportRow {
  [key: string]: string | number;
  rollNumber: string;
  fullName: string;
  weekTotalHrs: number;
  weekAbsentHrs: number;
  weekAttendedHrs: number;
  weekPercentage: number;
  previousAttendedHrs: number;
  cumulativeTotalHrs: number;
  cumulativeAbsentHrs: number;
  cumulativeAttendedHrs: number;
  cumulativePercentage: number;
}

interface RawRow {
  rollNumber: string;
  fullName: string;
  daily: number[];
  weekTotalHrs: number;
  weekAbsentHrs: number;
  weekAttendedHrs: number;
  weekPercentage: number;
  previousAttendedHrs: number;
  cumulativeTotalHrs: number;
  cumulativeAbsentHrs: number;
  cumulativeAttendedHrs: number;
  cumulativePercentage: number;
}

interface ReportData {
  classLabel: string;
  departmentName: string;
  yearOfStudy: number;
  academicYearLabel: string;
  semesterNumber: number;
  semesterType: string;
  batchLabel: string | null;
  weekStart: string;
  weekEnd: string;
  weekdayDates: string[];
  rows: RawRow[];
  summary: {
    totalStudents: number;
    bandCounts: Record<string, number>;
    bandLabels: Record<string, string>;
  };
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BAND_ORDER = ["GT_80", "P75_TO_80", "P70_TO_75", "P65_TO_70", "LT_65"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** "2026-2027" -> "26-27", matching the paper form's "AY 26-27" style. */
function shortAcademicYear(label: string): string {
  const [start, end] = label.split("-");
  return `${start?.slice(-2)}-${end?.slice(-2)}`;
}

function mondayOfThisWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  return now.toISOString().slice(0, 10);
}

export function WeeklyAttendanceReport({
  classes,
  fixedClassId,
  fixedClassLabel,
}: {
  classes?: Option[];
  fixedClassId?: string;
  fixedClassLabel?: string;
}) {
  const [classId, setClassId] = useState(fixedClassId ?? classes?.[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(mondayOfThisWeek());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams({ classId, weekStart });
    const res = await fetch(`/api/reports/weekly-attendance?${params}`);
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.message ?? "Could not generate this report.");
      setData(null);
      return;
    }
    setData(body);
  }

  function csvRows(): ReportRow[] {
    if (!data) return [];
    return data.rows.map((r) => {
      const row: ReportRow = {
        rollNumber: r.rollNumber,
        fullName: r.fullName,
        weekTotalHrs: r.weekTotalHrs,
        weekAbsentHrs: r.weekAbsentHrs,
        weekAttendedHrs: r.weekAttendedHrs,
        weekPercentage: r.weekPercentage,
        previousAttendedHrs: r.previousAttendedHrs,
        cumulativeTotalHrs: r.cumulativeTotalHrs,
        cumulativeAbsentHrs: r.cumulativeAbsentHrs,
        cumulativeAttendedHrs: r.cumulativeAttendedHrs,
        cumulativePercentage: r.cumulativePercentage,
      };
      r.daily.forEach((hrs, i) => {
        row[`day${i + 1}Hrs`] = hrs;
      });
      return row;
    });
  }

  return (
    <div className="space-y-3 print:space-y-2">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        {classes ? (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700">{fixedClassLabel}</span>
        )}
        <label className="flex flex-col text-xs text-slate-600">
          Week starting (Monday)
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </label>
        <Button onClick={handleGenerate} disabled={loading || !classId} className="text-sm">
          {loading ? "Generating…" : "Generate"}
        </Button>
        {data ? (
          <>
            <Button variant="secondary" className="text-sm" onClick={() => downloadCsv(`weekly-attendance-${data.classLabel}-${data.weekStart}.csv`, csvRows())}>
              Download CSV
            </Button>
            <Button variant="secondary" className="text-sm" onClick={() => window.print()}>
              Print
            </Button>
          </>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600 print:hidden">{error}</p> : null}

      {data ? (
        <div>
          <div className="mb-3 border-b border-slate-300 pb-2 text-xs print:text-[11px]">
            <div className="flex items-start justify-between">
              <span>
                Year / Sem: <strong>{toRoman(data.yearOfStudy)}/{toRoman(data.semesterNumber)}</strong>
              </span>
              <span>
                BATCH: <strong>{data.batchLabel ?? "—"}</strong>
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">PSN COLLEGE OF ENGINEERING AND TECHNOLOGY (AUTONOMOUS)</p>
              <p>MELATHEDIYOOR, TIRUNELVELI 627152</p>
              <p className="font-medium">DEPARTMENT OF {data.departmentName.toUpperCase()}</p>
              <p className="mt-1 text-sm font-semibold underline">WEEKLY ATTENDANCE REPORT</p>
            </div>
            <p className="mt-1">
              DATE : {formatDate(data.weekStart)} TO {formatDate(data.weekEnd)}
            </p>
          </div>
          <p className="mb-2 text-right text-xs print:text-[10px]">
            AY {shortAcademicYear(data.academicYearLabel)} {data.semesterType === "ODD" ? "Odd" : "Even"} Semester - {toRoman(data.semesterNumber)} Semester
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead className="border-b border-slate-300 text-[11px] text-slate-700">
                <tr>
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    S.No
                  </th>
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Roll No
                  </th>
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1">
                    Name
                  </th>
                  {data.weekdayDates.map((d, i) => (
                    <th key={d} rowSpan={2} className="border border-slate-200 px-1.5 py-1 text-center">
                      {WEEKDAY_NAMES[i]}
                      <br />
                      {formatDate(d)}
                    </th>
                  ))}
                  <th colSpan={4} className="border border-slate-200 px-1.5 py-1 text-center">
                    Current Week
                  </th>
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1 text-center">
                    Previous
                    <br />
                    Attended
                  </th>
                  <th colSpan={4} className="border border-slate-200 px-1.5 py-1 text-center">
                    Cumulative
                  </th>
                  <th rowSpan={2} className="border border-slate-200 px-1.5 py-1 print:table-cell">
                    Signature
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-200 px-1.5 py-1">Total</th>
                  <th className="border border-slate-200 px-1.5 py-1">Absent</th>
                  <th className="border border-slate-200 px-1.5 py-1">Attended</th>
                  <th className="border border-slate-200 px-1.5 py-1">%</th>
                  <th className="border border-slate-200 px-1.5 py-1">Total</th>
                  <th className="border border-slate-200 px-1.5 py-1">Absent</th>
                  <th className="border border-slate-200 px-1.5 py-1">Attended</th>
                  <th className="border border-slate-200 px-1.5 py-1">%</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.rollNumber} className="odd:bg-slate-50/50">
                    <td className="border border-slate-200 px-1.5 py-1">{i + 1}</td>
                    <td className="border border-slate-200 px-1.5 py-1 font-medium">{r.rollNumber}</td>
                    <td className="border border-slate-200 px-1.5 py-1">{r.fullName}</td>
                    {r.daily.map((hrs, di) => (
                      <td key={di} className="border border-slate-200 px-1.5 py-1 text-center">
                        {hrs}
                      </td>
                    ))}
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.weekTotalHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.weekAbsentHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.weekAttendedHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.weekPercentage}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.previousAttendedHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.cumulativeTotalHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.cumulativeAbsentHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.cumulativeAttendedHrs}</td>
                    <td className="border border-slate-200 px-1.5 py-1 text-center">{r.cumulativePercentage}</td>
                    <td className="border border-slate-200 px-1.5 py-1" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-4">
            <table className="text-xs">
              <tbody>
                <tr>
                  <td className="pr-3 py-0.5 font-medium">Total no of students</td>
                  <td>{data.summary.totalStudents}</td>
                </tr>
                {BAND_ORDER.map((band) => (
                  <tr key={band}>
                    <td className="pr-3 py-0.5">No of students {data.summary.bandLabels[band]?.toLowerCase()}</td>
                    <td>{data.summary.bandCounts[band] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-8 self-end text-xs">
              <div className="text-center">
                <div className="mb-6 w-32 border-b border-slate-400" />
                Class Advisor
              </div>
              <div className="text-center">
                <div className="mb-6 w-32 border-b border-slate-400" />
                HOD
              </div>
              <div className="text-center">
                <div className="mb-6 w-32 border-b border-slate-400" />
                Principal
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
