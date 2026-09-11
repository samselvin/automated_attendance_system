import { z } from "zod";
import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { listMissingAttendance } from "@/server/services/attendance-report.service";

const querySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const { date } = querySchema.parse({ date: url.searchParams.get("date") });
    return listMissingAttendance(session, date, {
      departmentId: url.searchParams.get("departmentId") ?? undefined,
    });
  });
}
