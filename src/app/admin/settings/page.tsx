import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/guards";
import { adminDepartmentScope } from "@/lib/rbac";
import { TopBar } from "@/components/top-bar";
import { listSystemSettings } from "@/server/services/settings.service";
import { ALL_SETTINGS_SCHEMA } from "@/lib/settings-schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requireRolePage("ADMIN");
  // Section 22: these rules apply college-wide, with no per-department
  // scope — see settings.service.ts for why this is college-wide-Admin only.
  if (adminDepartmentScope(session) !== "ALL") {
    redirect("/forbidden");
  }

  const values = await listSystemSettings(session);
  const valueByKey = new Map(values.map((v) => [v.key, v]));
  const settings = ALL_SETTINGS_SCHEMA.map((def) => ({ def, ...valueByKey.get(def.key)! }));

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Settings" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <p className="text-xs text-slate-400">
          College-wide rules (Section 22) — nothing here is hard-coded in application logic. Every change is
          audit-logged.
        </p>
        <SettingsForm settings={settings} />
      </main>
    </div>
  );
}
