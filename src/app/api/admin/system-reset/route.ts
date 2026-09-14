import { apiRoute, requireApiSession, requestContext, BadRequestError } from "@/lib/api-utils";
import { resetSystem } from "@/server/services/system.service";

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = await req.json().catch(() => null);
    if (typeof body?.confirmationPhrase !== "string") {
      throw new BadRequestError("confirmationPhrase is required");
    }
    return resetSystem(session, body.confirmationPhrase, requestContext(req));
  });
}
