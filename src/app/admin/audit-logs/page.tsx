import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/guards";
import { adminDepartmentScope } from "@/lib/rbac";
import { TopBar } from "@/components/top-bar";
import { listAuditLogFacets } from "@/server/services/audit-log.service";
import { AuditLogViewer } from "./audit-log-viewer";

export default async function AuditLogsPage() {
  const session = await requireRolePage("ADMIN");
  // Section 44: audit logs cross every department, so only a college-wide
  // Admin (no departmentId scope) can search them — see audit-log.service.ts.
  if (adminDepartmentScope(session) !== "ALL") {
    redirect("/forbidden");
  }

  const facets = await listAuditLogFacets();

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Audit Logs" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <p className="text-xs text-slate-400">
          Append-only record of every sensitive action (Section 44). Nothing here can be edited or deleted through the app.
        </p>
        <AuditLogViewer actions={facets.actions} entityTypes={facets.entityTypes} />
      </main>
    </div>
  );
}
