import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { updateAcademicYearSchema } from "@/lib/validation/academic-year";
import { updateAcademicYear } from "@/server/services/academic-year.service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = updateAcademicYearSchema.parse(await req.json());
    return updateAcademicYear(session, id, body, requestContext(req));
  });
}
