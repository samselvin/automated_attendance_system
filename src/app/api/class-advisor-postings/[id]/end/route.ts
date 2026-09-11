import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { endPostingSchema } from "@/lib/validation/class-advisor";
import { endPosting } from "@/server/services/class-advisor.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = endPostingSchema.parse(await req.json());
    return endPosting(session, id, body, requestContext(req));
  });
}
