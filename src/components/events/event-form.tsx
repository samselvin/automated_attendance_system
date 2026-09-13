"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

const EVENT_TYPES = ["WORKSHOP", "SEMINAR", "SYMPOSIUM", "EXAM", "HOLIDAY", "SPORTS", "CULTURAL", "OTHER"];

export function EventForm({ departments, classes }: { departments: Option[]; classes: (Option & { departmentId: string })[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("WORKSHOP");
  const [audienceType, setAudienceType] = useState<"COLLEGE" | "DEPARTMENT" | "YEAR" | "CLASS" | "GROUP">("COLLEGE");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [groups, setGroups] = useState<Option[]>([]);
  const [studentGroupId, setStudentGroupId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [venue, setVenue] = useState("");
  const [affectsCalendar, setAffectsCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadGroups(forClassId: string) {
    setStudentGroupId("");
    setGroups([]);
    if (!forClassId) return;
    const res = await fetch(`/api/classes/${forClassId}/student-groups`);
    if (!res.ok) return;
    const data = await res.json();
    setGroups(data.map((g: { id: string; name: string }) => ({ id: g.id, label: g.name })));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: Record<string, unknown> = {
      title,
      description: description || undefined,
      type,
      audienceType,
      startDate,
      startTime,
      endDate,
      endTime,
      venue: venue || undefined,
      affectsCalendar,
    };
    if (audienceType === "DEPARTMENT" || audienceType === "YEAR") body.departmentId = departmentId;
    if (audienceType === "YEAR") body.yearOfStudy = yearOfStudy;
    if (audienceType === "CLASS") body.classId = classId;
    if (audienceType === "GROUP") body.studentGroupId = studentGroupId;

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(responseBody?.issues?.[0]?.message ?? responseBody?.message ?? "Could not create event.");
      return;
    }
    setTitle("");
    setDescription("");
    setVenue("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-dashed border-slate-300 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-700">Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Audience</label>
          <select
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value as typeof audienceType)}
            className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="COLLEGE">Whole college</option>
            <option value="DEPARTMENT">One department</option>
            <option value="YEAR">One year in a department</option>
            <option value="CLASS">One class</option>
            <option value="GROUP">One student group</option>
          </select>
        </div>

        {audienceType === "DEPARTMENT" || audienceType === "YEAR" ? (
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
        ) : null}
        {audienceType === "YEAR" ? (
          <div>
            <label className="block text-xs font-medium text-slate-700">Year</label>
            <select value={yearOfStudy} onChange={(e) => setYearOfStudy(Number(e.target.value))} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {audienceType === "CLASS" || audienceType === "GROUP" ? (
          <div>
            <label className="block text-xs font-medium text-slate-700">Class</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                if (audienceType === "GROUP") loadGroups(e.target.value);
              }}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {audienceType === "GROUP" ? (
          <div>
            <label className="block text-xs font-medium text-slate-700">Group</label>
            <select value={studentGroupId} onChange={(e) => setStudentGroupId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
              <option value="">Select a class first</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-medium text-slate-700">Start date</label>
          <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Start time</label>
          <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">End date</label>
          <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">End time</label>
          <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Venue</label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-slate-700">
          <input type="checkbox" checked={affectsCalendar} onChange={(e) => setAffectsCalendar(e.target.checked)} />
          Affects classes (holiday/OD)
        </label>
      </div>
      <div className="mt-2">
        <label className="block text-xs font-medium text-slate-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="mt-2 text-sm">
        {loading ? "Creating…" : "Create event (draft)"}
      </Button>
    </form>
  );
}
