import { z } from "zod";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { publishSubjectOfferingMarks } from "@/server/services/assessment.service";

const bodySchema = z.object({ published: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const { published } = bodySchema.parse(await req.json());
    return publishSubjectOfferingMarks(session, id, published, requestContext(req));
  });
}
