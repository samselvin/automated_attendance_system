import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { bulkEnterMarksSchema } from "@/lib/validation/marks";
import { listMarksForComponent, bulkEnterMarks } from "@/server/services/marks.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return listMarksForComponent(session, id);
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = bulkEnterMarksSchema.parse({ ...(await req.json()), assessmentComponentId: id });
    return bulkEnterMarks(session, body, requestContext(req));
  });
}
