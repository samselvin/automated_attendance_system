import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { submitChangeRequestSchema } from "@/lib/validation/timetable-change-request";
import {
  listChangeRequests,
  submitChangeRequest,
} from "@/server/services/timetable-change-request.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listChangeRequests(session, {
      classId: url.searchParams.get("classId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = submitChangeRequestSchema.parse(await req.json());
    return submitChangeRequest(session, body, requestContext(req));
  });
}
