import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { submitAttendanceSchema } from "@/lib/validation/attendance";
import { submitAttendance } from "@/server/services/attendance.service";

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = submitAttendanceSchema.parse(await req.json());
    return submitAttendance(session, body, requestContext(req));
  });
}
