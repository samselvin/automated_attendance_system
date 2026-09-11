"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DecideButtons({ requestId, isOd }: { requestId: string; isOd: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setLoading(decision);
    setError(null);
    const endpoint = isOd ? `/api/leave-requests/${requestId}/decide-od` : `/api/leave-requests/${requestId}/decide`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setLoading(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "Could not record decision.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => decide("REJECTED")} disabled={!!loading}>
          {loading === "REJECTED" ? "…" : "Reject"}
        </Button>
        <Button className="px-3 py-1.5 text-xs" onClick={() => decide("APPROVED")} disabled={!!loading}>
          {loading === "APPROVED" ? "…" : "Approve"}
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
