import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { ApplyLeaveForm } from "./apply-form";

export default async function ApplyLeavePage() {
  await requireRolePage("STUDENT");

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Apply for Leave / OD" showNotifications={false} />
      <main className="flex-1 p-4">
        <ApplyLeaveForm />
      </main>
    </div>
  );
}
