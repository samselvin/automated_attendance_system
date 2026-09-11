import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { publishEvent } from "@/server/services/event.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return publishEvent(session, id, requestContext(req));
  });
}
