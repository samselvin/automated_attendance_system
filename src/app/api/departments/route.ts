import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createDepartmentSchema } from "@/lib/validation/department";
import { listDepartments, createDepartment } from "@/server/services/department.service";

export async function GET() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return listDepartments(session);
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createDepartmentSchema.parse(await req.json());
    return createDepartment(session, body, requestContext(req));
  });
}
