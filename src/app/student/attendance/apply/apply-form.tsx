"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApplyLeaveForm() {
  const router = useRouter();
  const [type, setType] = useState<"LEAVE" | "MEDICAL" | "ON_DUTY">("LEAVE");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/leave-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        fromDate,
        toDate: toDate || fromDate,
        isFullDay,
        periods: [],
        reason,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not submit request.");
      return;
    }

    router.push("/student/attendance");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="LEAVE">Leave</option>
          <option value="MEDICAL">Medical</option>
          <option value="ON_DUTY">On Duty</option>
        </select>
        {type === "ON_DUTY" ? (
          <p className="mt-1 text-xs text-slate-400">On Duty requests need approval from both your Class Advisor and HOD.</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Leave/Medical requests need approval from your Class Advisor or HOD.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">From date</label>
          <input
            type="date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">To date</label>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isFullDay} onChange={(e) => setIsFullDay(e.target.checked)} />
        Full day
      </label>

      <div>
        <label className="block text-xs font-medium text-slate-600">Reason</label>
        <textarea
          required
          minLength={5}
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
