import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { markNotificationRead } from "@/server/services/notification.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return markNotificationRead(session, id);
  });
}
