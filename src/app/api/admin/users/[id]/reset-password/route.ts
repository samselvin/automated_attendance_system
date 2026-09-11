import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { resetUserPassword } from "@/server/services/account.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return resetUserPassword(session, id, requestContext(req));
  });
}
