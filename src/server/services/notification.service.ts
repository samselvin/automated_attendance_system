import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac";
import { NotFoundError } from "@/lib/api-utils";

export async function listMyNotifications(session: Session, limit = 30) {
  if (!session.user.isActive) throw new UnauthorizedError();
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { recipientUserId: session.user.id, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationRead(session: Session, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new NotFoundError("Notification not found");
  if (notification.recipientUserId !== session.user.id) throw new ForbiddenError("Not your notification");

  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(session: Session) {
  return prisma.notification.updateMany({
    where: { recipientUserId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
