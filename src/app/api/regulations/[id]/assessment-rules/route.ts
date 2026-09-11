import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createAssessmentRuleSchema } from "@/lib/validation/assessment";
import { listAssessmentRules, createAssessmentRule } from "@/server/services/assessment.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    await requireApiSession();
    const { id } = await params;
    return listAssessmentRules(id);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = createAssessmentRuleSchema.parse({ ...(await req.json()), regulationId: id });
    return createAssessmentRule(session, body, requestContext(req));
  });
}
