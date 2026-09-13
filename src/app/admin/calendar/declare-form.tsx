"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeclareCalendarDayForm() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [dayType, setDayType] = useState("HOLIDAY_COLLEGE");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dayType, description: description || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not declare calendar day.");
      return;
    }
    setDate("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <div>
        <label className="block text-xs font-medium text-slate-700">Date</label>
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700">Type</label>
        <select value={dayType} onChange={(e) => setDayType(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="HOLIDAY_GOVT">Government Holiday</option>
          <option value="HOLIDAY_COLLEGE">College Holiday</option>
          <option value="HOLIDAY_EMERGENCY">Emergency Holiday</option>
          <option value="SPECIAL_WORKING">Special Working Day</option>
          <option value="EXAM_DAY">Exam Day</option>
          <option value="EVENT_DAY">Event Day</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-slate-700">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Declaring…" : "Declare"}
      </Button>
    </form>
  );
}
