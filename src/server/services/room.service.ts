import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { ConflictError } from "@/lib/api-utils";
import type { CreateRoomInput } from "@/lib/validation/room";

export async function listRooms() {
  return prisma.room.findMany({ orderBy: { name: "asc" } });
}

export async function createRoom(
  session: Session,
  input: CreateRoomInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireRole(session, "ADMIN");

  const existing = await prisma.room.findUnique({ where: { name: input.name } });
  if (existing) throw new ConflictError(`Room ${input.name} already exists`);

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "ROOM_CREATED",
        entityType: "Room",
        entityId: room.id,
        newValue: toAuditJson(room),
        ...ctx,
      },
      tx
    );
    return room;
  });
}
