import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { listSystemSettings } from "@/server/services/settings.service";

export async function GET() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return listSystemSettings(session);
  });
}
