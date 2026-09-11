import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { enterSemesterResultSchema } from "@/lib/validation/semester-result";
import { enterSemesterResult } from "@/server/services/semester-result.service";

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = enterSemesterResultSchema.parse(await req.json());
    return enterSemesterResult(session, body, requestContext(req));
  });
}
