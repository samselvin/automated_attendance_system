import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/guards";
import { StudentBottomNav } from "@/components/nav/student-bottom-nav";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireRolePage("STUDENT");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1 pb-16">{children}</div>
      <StudentBottomNav />
    </div>
  );
}
