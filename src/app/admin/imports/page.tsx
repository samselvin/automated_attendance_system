import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { ImportWizard } from "./import-wizard";

export default async function ImportsPage() {
  await requireRolePage("ADMIN");
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Imports" showNotifications={false} />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Card>
          <ImportWizard />
        </Card>

        {jobs.length === 0 ? (
          <EmptyState title="No imports yet" />
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Rows</th>
                    <th className="px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="px-4 py-2">{j.entityType}</td>
                      <td className="px-4 py-2">
                        <Badge label={j.status} variant={j.status === "CONFIRMED" ? "safe" : "neutral"} />
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {j.validRows}/{j.totalRows}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{j.createdAt.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
