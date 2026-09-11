import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateSubjectSchema } from "@/lib/validation/subject";
import { updateSubject } from "@/server/services/subject.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateSubjectSchema.parse(await req.json());
    return updateSubject(session, id, body, requestContext(req));
  });
}
