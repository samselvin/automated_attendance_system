"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveCalendarDayButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleRemove} disabled={loading} className="text-xs text-red-500 underline disabled:opacity-50">
      {loading ? "…" : "Remove"}
    </button>
  );
}
