import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { requestUnlockSchema } from "@/lib/validation/attendance";
import { listUnlockRequests, requestUnlock } from "@/server/services/unlock.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    await requireApiSession();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null;
    return listUnlockRequests({ status: status ?? undefined });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = requestUnlockSchema.parse(await req.json());
    return requestUnlock(session, body, requestContext(req));
  });
}
