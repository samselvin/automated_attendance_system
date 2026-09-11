import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/guards";
import { adminDepartmentScope } from "@/lib/rbac";
import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { AdminMobileNav } from "@/components/nav/admin-mobile-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRolePage("ADMIN");
  const isCollegeWideAdmin = adminDepartmentScope(session) === "ALL";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <AdminMobileNav showAuditLogs={isCollegeWideAdmin} />
      <AdminSidebar showAuditLogs={isCollegeWideAdmin} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
