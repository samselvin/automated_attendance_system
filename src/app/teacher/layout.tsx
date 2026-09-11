import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/guards";
import { TeacherBottomNav } from "@/components/nav/teacher-bottom-nav";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  await requireRolePage("TEACHER");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1 pb-16">{children}</div>
      <TeacherBottomNav />
    </div>
  );
}
