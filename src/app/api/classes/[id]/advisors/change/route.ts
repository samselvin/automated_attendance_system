import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { changeAdvisorSchema } from "@/lib/validation/class-advisor";
import { changeAdvisor } from "@/server/services/class-advisor.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = changeAdvisorSchema.parse({ ...(await req.json()), classId: id });
    return changeAdvisor(session, body, requestContext(req));
  });
}
