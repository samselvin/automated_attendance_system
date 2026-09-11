import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createSubjectOfferingSchema } from "@/lib/validation/subject";
import { listSubjectOfferings, createSubjectOffering } from "@/server/services/subject.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listSubjectOfferings(session, {
      classId: url.searchParams.get("classId") ?? undefined,
      studentGroupId: url.searchParams.get("studentGroupId") ?? undefined,
      semesterId: url.searchParams.get("semesterId") ?? undefined,
      teacherId: url.searchParams.get("teacherId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createSubjectOfferingSchema.parse(await req.json());
    return createSubjectOffering(session, body, requestContext(req));
  });
}
