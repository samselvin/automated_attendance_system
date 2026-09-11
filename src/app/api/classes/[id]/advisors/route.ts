import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { assignAdvisorSchema } from "@/lib/validation/class-advisor";
import { listPostings, assignAdvisor } from "@/server/services/class-advisor.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    return listPostings(session, id);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = assignAdvisorSchema.parse({ ...(await req.json()), classId: id });
    return assignAdvisor(session, body, requestContext(req));
  });
}
