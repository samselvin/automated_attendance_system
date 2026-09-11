import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { decideChangeRequestSchema } from "@/lib/validation/timetable-change-request";
import { decideChangeRequest } from "@/server/services/timetable-change-request.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = decideChangeRequestSchema.parse(await req.json());
    return decideChangeRequest(session, id, body, requestContext(req));
  });
}
