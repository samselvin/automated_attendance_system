import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateClassSchema } from "@/lib/validation/class";
import { updateClass } from "@/server/services/class.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateClassSchema.parse(await req.json());
    return updateClass(session, id, body, requestContext(req));
  });
}
