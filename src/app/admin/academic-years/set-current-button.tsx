"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SetCurrentButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/academic-years/${id}/set-current`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" className="px-2 py-1 text-xs" onClick={handleClick} disabled={loading}>
      {loading ? "…" : "Set current"}
    </Button>
  );
}
