import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateDepartmentSchema } from "@/lib/validation/department";
import { updateDepartment } from "@/server/services/department.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateDepartmentSchema.parse(await req.json());
    return updateDepartment(session, id, body, requestContext(req));
  });
}
