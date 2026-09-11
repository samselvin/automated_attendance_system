"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/timetable-entries/${entryId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleDelete} disabled={loading} className="text-xs text-red-500 underline disabled:opacity-50">
      {loading ? "…" : "Remove"}
    </button>
  );
}
