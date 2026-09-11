import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createImportJobSchema } from "@/lib/validation/import";
import { createImportJob } from "@/server/services/import.service";

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createImportJobSchema.parse(await req.json());
    return createImportJob(session, body, requestContext(req));
  });
}
