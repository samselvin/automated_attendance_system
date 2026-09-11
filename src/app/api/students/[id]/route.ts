import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateStudentSchema } from "@/lib/validation/student";
import { getStudent, updateStudent } from "@/server/services/student.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return getStudent(session, id);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateStudentSchema.parse(await req.json());
    return updateStudent(session, id, body, requestContext(req));
  });
}
