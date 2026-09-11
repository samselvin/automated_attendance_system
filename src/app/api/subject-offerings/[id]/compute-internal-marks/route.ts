import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { computeAndStoreInternalMarks } from "@/server/services/marks.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return computeAndStoreInternalMarks(session, id, requestContext(req));
  });
}
