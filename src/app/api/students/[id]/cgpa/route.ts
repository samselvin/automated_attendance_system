import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { getStudentCgpa } from "@/server/services/semester-result.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return getStudentCgpa(session, id);
  });
}
