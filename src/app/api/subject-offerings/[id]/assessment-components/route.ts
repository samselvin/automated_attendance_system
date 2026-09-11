import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { createAssessmentComponentSchema } from "@/lib/validation/assessment";
import { listAssessmentComponents, createAssessmentComponent } from "@/server/services/assessment.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    await requireApiSession();
    const { id } = await params;
    return listAssessmentComponents(id);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = createAssessmentComponentSchema.parse(await req.json());
    return createAssessmentComponent(session, id, body, requestContext(req));
  });
}
