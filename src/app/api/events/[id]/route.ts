import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { deleteEvent } from "@/server/services/event.service";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    await deleteEvent(session, id, requestContext(req));
    return { ok: true };
  });
}
