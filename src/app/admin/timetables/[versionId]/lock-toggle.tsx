"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LockToggle({ versionId, isLocked }: { versionId: string; isLocked: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/timetable-versions/${versionId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !isLocked }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" className="text-xs" onClick={toggle} disabled={loading}>
      {loading ? "…" : isLocked ? "Unlock" : "Lock"}
    </Button>
  );
}
