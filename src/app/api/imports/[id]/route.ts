import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { getImportJob } from "@/server/services/import.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return getImportJob(session, id);
  });
}
