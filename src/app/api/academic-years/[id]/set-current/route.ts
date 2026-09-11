import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { setCurrentAcademicYear } from "@/server/services/academic-year.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return setCurrentAcademicYear(session, id, requestContext(req));
  });
}
