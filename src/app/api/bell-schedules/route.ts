import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createBellScheduleSchema } from "@/lib/validation/bell-schedule";
import { listBellSchedules, createBellSchedule } from "@/server/services/bell-schedule.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listBellSchedules(session, { departmentId: url.searchParams.get("departmentId") ?? undefined });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createBellScheduleSchema.parse(await req.json());
    return createBellSchedule(session, body, requestContext(req));
  });
}
