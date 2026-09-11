import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { listAuditLogs } from "@/server/services/audit-log.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    return listAuditLogs(session, {
      entityType: url.searchParams.get("entityType") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      actorUserId: url.searchParams.get("actorUserId") ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    });
  });
}
