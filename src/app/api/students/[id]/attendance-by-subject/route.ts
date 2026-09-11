import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { getStudentSubjectWiseAttendance } from "@/server/services/attendance-report.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return getStudentSubjectWiseAttendance(session, id);
  });
}
