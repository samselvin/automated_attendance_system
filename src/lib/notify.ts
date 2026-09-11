import type { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * In-app notification only (Section 37: in-app is "always" on). Web push
 * and parent SMS are separate delivery channels wired up in Phase 5 — this
 * does not attempt either.
 */
export async function notifyUser(
  recipientUserId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  tx: Tx = prisma
) {
  return tx.notification.create({
    data: { recipientUserId, type, title, message, link, deliveryStatus: "DELIVERED" },
  });
}
