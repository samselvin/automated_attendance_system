import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { confirmImportJob } from "@/server/services/import.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return confirmImportJob(session, id, requestContext(req));
  });
}
