import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { getLowAttendanceReport } from "@/server/services/report.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return getLowAttendanceReport(session, url.searchParams.get("departmentId") ?? undefined);
  });
}
