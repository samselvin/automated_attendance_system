import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { assignSubstituteSchema } from "@/lib/validation/substitution";
import { listSubstitutions, assignSubstitute } from "@/server/services/substitution.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    await requireApiSession();
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    return listSubstitutions({
      date: date ? new Date(date) : undefined,
      teacherId: url.searchParams.get("teacherId") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = assignSubstituteSchema.parse(await req.json());
    return assignSubstitute(session, body, requestContext(req));
  });
}
