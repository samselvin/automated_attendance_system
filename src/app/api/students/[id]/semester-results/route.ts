import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { listStudentSemesterResults } from "@/server/services/semester-result.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const url = new URL(req.url);
    return listStudentSemesterResults(session, id, url.searchParams.get("semesterId") ?? undefined);
  });
}
