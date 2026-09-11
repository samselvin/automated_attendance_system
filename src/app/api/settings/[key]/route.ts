import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateSystemSetting } from "@/server/services/settings.service";

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { key } = await params;
    const body = await req.json();
    return updateSystemSetting(session, key, body?.value, requestContext(req));
  });
}
