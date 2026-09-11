import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createAcademicYearSchema } from "@/lib/validation/academic-year";
import { listAcademicYears, createAcademicYear } from "@/server/services/academic-year.service";

export async function GET() {
  return apiRoute(async () => {
    await requireApiSession();
    return listAcademicYears();
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createAcademicYearSchema.parse(await req.json());
    return createAcademicYear(session, body, requestContext(req));
  });
}
