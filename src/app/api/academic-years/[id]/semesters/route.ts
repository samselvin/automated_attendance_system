import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createSemesterSchema } from "@/lib/validation/academic-year";
import { createSemester } from "@/server/services/academic-year.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = createSemesterSchema.parse(await req.json());
    return createSemester(session, id, body, requestContext(req));
  });
}
