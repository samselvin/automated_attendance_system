import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { listMyNotifications, markAllNotificationsRead } from "@/server/services/notification.service";

export async function GET() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return listMyNotifications(session);
  });
}

export async function POST() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return markAllNotificationsRead(session);
  });
}
