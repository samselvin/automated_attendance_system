"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`Reset ${name}'s password? Their current password stops working immediately, and they'll need to sign in with the new temp password.`)) {
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.message ?? "Could not reset password.");
      return;
    }
    setTempPassword(body?.tempPassword ?? null);
  }

  if (tempPassword) {
    return (
      <div className="whitespace-nowrap rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
        Temp password (shown once): <span className="font-mono font-semibold">{tempPassword}</span>
        <button type="button" onClick={() => setTempPassword(null)} className="ml-2 underline">
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={handleClick} disabled={loading}>
        {loading ? "Resetting…" : "Reset password"}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
