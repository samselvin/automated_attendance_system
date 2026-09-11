import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createRegulationSchema } from "@/lib/validation/regulation";
import { listRegulations, createRegulation } from "@/server/services/regulation.service";

export async function GET() {
  return apiRoute(async () => {
    const session = await requireApiSession();
    return listRegulations(session);
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = createRegulationSchema.parse(await req.json());
    return createRegulation(session, body, requestContext(req));
  });
}
