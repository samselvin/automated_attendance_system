import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createSubjectSchema } from "@/lib/validation/subject";
import { listSubjects, createSubject } from "@/server/services/subject.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listSubjects(session, {
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      regulationId: url.searchParams.get("regulationId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createSubjectSchema.parse(await req.json());
    return createSubject(session, body, requestContext(req));
  });
}
