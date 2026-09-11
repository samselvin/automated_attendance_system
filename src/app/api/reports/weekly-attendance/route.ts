import { apiRoute, requireApiSession, BadRequestError } from "@/lib/api-utils";
import { getWeeklyAttendanceReport } from "@/server/services/weekly-attendance-report.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const weekStart = url.searchParams.get("weekStart");
    if (!classId || !weekStart) throw new BadRequestError("classId and weekStart are required");

    const date = new Date(`${weekStart}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestError("weekStart must be a valid date (YYYY-MM-DD)");

    return getWeeklyAttendanceReport(session, classId, date);
  });
}
