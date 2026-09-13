import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/guards";
import { adminDepartmentScope } from "@/lib/rbac";
import { AdminSidebar } from "@/components/nav/admin-sidebar";
import { AdminMobileNav } from "@/components/nav/admin-mobile-nav";
import { RoleSwitcher } from "@/components/role-switcher";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRolePage("ADMIN");
  const isCollegeWideAdmin = adminDepartmentScope(session) === "ALL";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <AdminMobileNav showCollegeWideAdminLinks={isCollegeWideAdmin} />
      <AdminSidebar showCollegeWideAdminLinks={isCollegeWideAdmin} />
      <div className="min-w-0 flex-1">{children}</div>
      <RoleSwitcher roles={session.user.roles.map((r) => r.role)} current="ADMIN" />
    </div>
  );
}
