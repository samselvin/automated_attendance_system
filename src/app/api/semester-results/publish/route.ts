import { z } from "zod";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { idSchema } from "@/lib/validation/common";
import { publishSemesterResults } from "@/server/services/semester-result.service";

const bodySchema = z.object({ studentId: idSchema.optional(), semesterId: idSchema.optional() });

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = bodySchema.parse(await req.json());
    return publishSemesterResults(session, body, requestContext(req));
  });
}
