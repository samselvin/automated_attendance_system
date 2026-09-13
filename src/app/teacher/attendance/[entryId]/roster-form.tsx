"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Status = "PRESENT" | "ABSENT" | "APPROVED_LEAVE" | "ON_DUTY";

interface RosterStudent {
  studentId: string;
  rollNumber: string;
  fullName: string;
  suggestedStatus: Status;
  isPreFilledFromLeave: boolean;
}

const STATUS_LABELS: Record<Status, string> = {
  PRESENT: "P",
  ABSENT: "A",
  APPROVED_LEAVE: "L",
  ON_DUTY: "OD",
};

export function RosterForm({
  timetableEntryId,
  date,
  students,
  alreadySubmitted,
}: {
  timetableEntryId: string;
  date: string;
  students: RosterStudent[];
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(students.map((s) => [s.studentId, s.suggestedStatus]))
  );
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
          s.fullName.toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, APPROVED_LEAVE: 0, ON_DUTY: 0 } as Record<Status, number>;
    for (const s of Object.values(statuses)) c[s]++;
    return c;
  }, [statuses]);

  function setAll(status: Status) {
    setStatuses(Object.fromEntries(students.map((s) => [s.studentId, status])));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/attendance/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timetableEntryId,
        date,
        records: Object.entries(statuses).map(([studentId, status]) => ({ studentId, status })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not submit attendance.");
      return;
    }
    router.push("/teacher");
    router.refresh();
  }

  if (alreadySubmitted) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-700">
        Attendance for this session has already been submitted.
      </div>
    );
  }

  if (reviewing) {
    const absentees = students.filter((s) => statuses[s.studentId] === "ABSENT");
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Review before submitting</p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="font-semibold text-slate-900">{students.length}</p>
              <p className="text-xs text-slate-600">Total</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-600">{counts.PRESENT}</p>
              <p className="text-xs text-slate-600">Present</p>
            </div>
            <div>
              <p className="font-semibold text-red-600">{counts.ABSENT}</p>
              <p className="text-xs text-slate-600">Absent</p>
            </div>
            <div>
              <p className="font-semibold text-blue-600">{counts.APPROVED_LEAVE + counts.ON_DUTY}</p>
              <p className="text-xs text-slate-600">Leave/OD</p>
            </div>
          </div>
          {absentees.length > 0 ? (
            <p className="mt-3 text-xs text-slate-600">
              Absentees: {absentees.map((a) => a.rollNumber).join(", ")}
            </p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setReviewing(false)} disabled={submitting}>
            Back
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Confirm Attendance"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search roll no / name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 text-xs" onClick={() => setAll("PRESENT")}>
          Mark all present
        </Button>
        <Button variant="secondary" className="flex-1 text-xs" onClick={() => setAll("ABSENT")}>
          Mark all absent
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {filtered.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.rollNumber}</p>
                <p className="text-xs text-slate-600">
                  {s.fullName}
                  {s.isPreFilledFromLeave ? " · pre-filled from approved leave" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatuses((prev) => ({ ...prev, [s.studentId]: status }))}
                    className={`h-8 w-8 rounded-md text-xs font-semibold ${
                      statuses[s.studentId] === status
                        ? status === "PRESENT"
                          ? "bg-emerald-600 text-white"
                          : status === "ABSENT"
                            ? "bg-red-600 text-white"
                            : "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button className="w-full" onClick={() => setReviewing(true)}>
        Review ({students.length} students)
      </Button>
    </div>
  );
}
