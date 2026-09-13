"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  label: string;
}

export function CreateOfferingForm({
  subjects,
  classes,
  academicYears,
  semesters,
  teachers,
}: {
  subjects: Option[];
  classes: Option[];
  academicYears: Option[];
  semesters: Option[];
  teachers: Option[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");
  const [semesterId, setSemesterId] = useState(semesters[0]?.id ?? "");
  const [teacherIds, setTeacherIds] = useState<string[]>(teachers[0] ? [teachers[0].id] : []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/subject-offerings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, classId, academicYearId, semesterId, teacherIds }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.issues?.[0]?.message ?? body?.message ?? "Could not create offering.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-5">
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
      </select>
      <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
        {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select
        multiple
        value={teacherIds}
        onChange={(e) => setTeacherIds(Array.from(e.target.selectedOptions, (o) => o.value))}
        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      >
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      {error ? <p className="col-span-full text-xs text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="text-sm">
        {loading ? "Adding…" : "Add offering"}
      </Button>
    </form>
  );
}
