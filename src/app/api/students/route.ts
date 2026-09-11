import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createStudentSchema } from "@/lib/validation/student";
import { listStudents, createStudent } from "@/server/services/student.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listStudents(session, {
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      classId: url.searchParams.get("classId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createStudentSchema.parse(await req.json());
    return createStudent(session, body, requestContext(req));
  });
}
