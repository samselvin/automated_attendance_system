import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateTeacherSchema } from "@/lib/validation/teacher";
import { updateTeacher } from "@/server/services/teacher.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateTeacherSchema.parse(await req.json());
    return updateTeacher(session, id, body, requestContext(req));
  });
}
