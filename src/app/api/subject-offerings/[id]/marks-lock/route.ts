import { z } from "zod";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { lockSubjectOfferingMarks } from "@/server/services/assessment.service";

const bodySchema = z.object({ locked: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const { locked } = bodySchema.parse(await req.json());
    return lockSubjectOfferingMarks(session, id, locked, requestContext(req));
  });
}
