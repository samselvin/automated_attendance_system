import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { declareCalendarDaySchema } from "@/lib/validation/calendar";
import { listCalendarDays, declareCalendarDay } from "@/server/services/calendar.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    return listCalendarDays(session, {
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = declareCalendarDaySchema.parse(await req.json());
    return declareCalendarDay(session, body, requestContext(req));
  });
}
