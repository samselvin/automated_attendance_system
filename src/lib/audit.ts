import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Append-only audit log writer. Section 44: no one, including Admin, can
 * edit or delete entries through the app — this module only ever inserts.
 */

export interface AuditLogInput {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  reason?: string | null;
  context?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(
  input: AuditLogInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  return tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      reason: input.reason ?? null,
      context: input.context ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
