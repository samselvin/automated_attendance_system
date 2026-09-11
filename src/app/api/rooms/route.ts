import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createRoomSchema } from "@/lib/validation/room";
import { listRooms, createRoom } from "@/server/services/room.service";

export async function GET() {
  return apiRoute(async () => {
    await requireApiSession();
    return listRooms();
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createRoomSchema.parse(await req.json());
    return createRoom(session, body, requestContext(req));
  });
}
