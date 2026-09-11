import { z } from "zod";
import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { idSchema } from "@/lib/validation/common";
import { getClassAttendanceReport } from "@/server/services/report.service";

const querySchema = z.object({
  classId: idSchema,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const q = querySchema.parse({
      classId: url.searchParams.get("classId"),
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return getClassAttendanceReport(session, q.classId, {
      from: q.from ? new Date(`${q.from}T00:00:00.000Z`) : undefined,
      to: q.to ? new Date(`${q.to}T00:00:00.000Z`) : undefined,
    });
  });
}
