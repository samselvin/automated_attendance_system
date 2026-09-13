"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";
import { Badge, attendanceLevelVariant } from "@/components/ui/badge";

interface Row {
  [key: string]: string | number;
  rollNumber: string;
  fullName: string;
  percentage: number;
  level: "SAFE" | "WARNING" | "CRITICAL";
}

export function LowAttendanceReport() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/reports/low-attendance")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="secondary" className="text-xs" onClick={() => downloadCsv("low-attendance.csv", rows)}>
          Download CSV
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No students currently below the safe threshold.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map((r) => (
            <li key={r.rollNumber} className="flex items-center justify-between py-1.5">
              <span>{r.rollNumber} — {r.fullName}</span>
              <span className="flex items-center gap-2">
                {r.percentage}% <Badge label={r.level} variant={attendanceLevelVariant(r.level)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
