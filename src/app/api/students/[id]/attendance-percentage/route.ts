import { z } from "zod";
import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { getStudentAttendancePercentage } from "@/server/services/attendance-report.service";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subjectOfferingId: z.string().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const url = new URL(req.url);
    const q = querySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      subjectOfferingId: url.searchParams.get("subjectOfferingId") ?? undefined,
    });
    return getStudentAttendancePercentage(session, id, {
      from: q.from ? new Date(`${q.from}T00:00:00.000Z`) : undefined,
      to: q.to ? new Date(`${q.to}T00:00:00.000Z`) : undefined,
      subjectOfferingId: q.subjectOfferingId,
    });
  });
}
