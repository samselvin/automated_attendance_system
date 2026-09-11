import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createTeacherSchema } from "@/lib/validation/teacher";
import { listTeachers, createTeacher } from "@/server/services/teacher.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listTeachers(session, { departmentId: url.searchParams.get("departmentId") ?? undefined });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createTeacherSchema.parse(await req.json());
    return createTeacher(session, body, requestContext(req));
  });
}
