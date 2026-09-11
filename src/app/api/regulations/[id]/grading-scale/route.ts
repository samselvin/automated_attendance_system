import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { setGradingScaleSchema } from "@/lib/validation/regulation";
import { setGradingScale } from "@/server/services/regulation.service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = setGradingScaleSchema.parse(await req.json());
    return setGradingScale(session, id, body, requestContext(req));
  });
}
