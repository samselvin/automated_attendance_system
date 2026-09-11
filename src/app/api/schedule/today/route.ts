import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { collegeDateString } from "@/lib/time";
import { getTeacherScheduleForDate } from "@/server/services/schedule.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? collegeDateString();
    return getTeacherScheduleForDate(session, date);
  });
}
