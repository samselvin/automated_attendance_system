import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { changeEnrollmentSchema } from "@/lib/validation/student";
import { changeEnrollment } from "@/server/services/student.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = changeEnrollmentSchema.parse(await req.json());
    return changeEnrollment(session, id, body, requestContext(req));
  });
}
