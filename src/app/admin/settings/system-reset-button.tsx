"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CONFIRMATION_PHRASE = "RESET EVERYTHING";

export function SystemResetButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    if (typed !== CONFIRMATION_PHRASE) return;
    if (!window.confirm("This permanently deletes every student, teacher, subject, timetable and attendance record. Continue?")) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/system-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationPhrase: typed }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.message ?? "Could not reset the system.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <p className="text-sm font-medium text-emerald-800">
          The system has been reset. All students, teachers, subjects, timetables and attendance data are gone —
          start again from Departments in the setup guide.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader title="Danger zone" subtitle="Restart the whole system for a fresh setup" />
      <div className="space-y-3">
        <p className="text-xs text-slate-600">
          Permanently deletes every department&apos;s classes, students, teachers, subjects, offerings, timetables,
          attendance, marks, leave requests, events and imports. Admin accounts, audit logs and these Settings are
          kept. This cannot be undone.
        </p>
        {!open ? (
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            Restart everything…
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-800">
              Type <span className="font-mono">{CONFIRMATION_PHRASE}</span> to confirm:
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-red-300 px-2 py-1.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              placeholder={CONFIRMATION_PHRASE}
              autoFocus
            />
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => {
                  setOpen(false);
                  setTyped("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="!px-3 !py-1.5 text-xs"
                onClick={handleConfirm}
                disabled={loading || typed !== CONFIRMATION_PHRASE}
              >
                {loading ? "Resetting…" : "Permanently reset everything"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
