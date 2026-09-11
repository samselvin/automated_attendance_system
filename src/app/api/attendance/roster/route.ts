import { z } from "zod";
import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { idSchema } from "@/lib/validation/common";
import { getRoster } from "@/server/services/attendance.service";

const querySchema = z.object({
  timetableEntryId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    const { timetableEntryId, date } = querySchema.parse({
      timetableEntryId: url.searchParams.get("timetableEntryId"),
      date: url.searchParams.get("date"),
    });
    return getRoster(session, timetableEntryId, date);
  });
}
