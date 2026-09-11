import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createClassSchema } from "@/lib/validation/class";
import { listClasses, createClass } from "@/server/services/class.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listClasses(session, {
      departmentId: url.searchParams.get("departmentId") ?? undefined,
      academicYearId: url.searchParams.get("academicYearId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createClassSchema.parse(await req.json());
    return createClass(session, body, requestContext(req));
  });
}
