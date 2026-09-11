import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createTimetableVersionSchema } from "@/lib/validation/timetable";
import { listTimetableVersions, createTimetableVersion } from "@/server/services/timetable.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    await requireApiSession();
    const url = new URL(req.url);
    return listTimetableVersions({
      classId: url.searchParams.get("classId") ?? undefined,
      semesterId: url.searchParams.get("semesterId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createTimetableVersionSchema.parse(await req.json());
    return createTimetableVersion(session, body, requestContext(req));
  });
}
