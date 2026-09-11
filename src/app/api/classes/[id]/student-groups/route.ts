import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createStudentGroupSchema } from "@/lib/validation/student-group";
import { listStudentGroups, createStudentGroup } from "@/server/services/student-group.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return listStudentGroups(session, id);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = createStudentGroupSchema.parse({ ...(await req.json()), classId: id });
    return createStudentGroup(session, body, requestContext(req));
  });
}
