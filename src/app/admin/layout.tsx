import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/guards";
import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { AdminMobileNav } from "@/components/nav/admin-mobile-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRolePage("ADMIN");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <AdminMobileNav />
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
