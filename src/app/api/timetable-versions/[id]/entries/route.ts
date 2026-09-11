import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createTimetableEntrySchema } from "@/lib/validation/timetable";
import { listTimetableEntries, createTimetableEntry } from "@/server/services/timetable.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    await requireApiSession();
    const { id } = await params;
    return listTimetableEntries(id);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = createTimetableEntrySchema.parse(await req.json());
    return createTimetableEntry(session, id, body, requestContext(req));
  });
}
