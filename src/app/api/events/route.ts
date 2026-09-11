import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { isStudent } from "@/lib/rbac";
import { createEventSchema } from "@/lib/validation/event";
import { createEvent, listEvents, listEventsForStudent } from "@/server/services/event.service";

export async function GET() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return isStudent(session) ? listEventsForStudent(session) : listEvents(session);
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createEventSchema.parse(await req.json());
    return createEvent(session, body, requestContext(req));
  });
}
