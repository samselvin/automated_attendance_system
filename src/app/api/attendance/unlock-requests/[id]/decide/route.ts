import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { decideUnlockSchema } from "@/lib/validation/attendance";
import { decideUnlock } from "@/server/services/unlock.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = decideUnlockSchema.parse(await req.json());
    return decideUnlock(session, id, body, requestContext(req));
  });
}
