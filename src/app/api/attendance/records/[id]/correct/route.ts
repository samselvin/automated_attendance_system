import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { correctAttendanceSchema } from "@/lib/validation/attendance";
import { correctAttendance } from "@/server/services/attendance.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = correctAttendanceSchema.parse(await req.json());
    return correctAttendance(session, id, body, requestContext(req));
  });
}
