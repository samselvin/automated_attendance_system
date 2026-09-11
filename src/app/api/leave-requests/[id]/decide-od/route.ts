import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { decideOdApprovalSchema } from "@/lib/validation/leave";
import { decideOdApproval } from "@/server/services/leave.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = decideOdApprovalSchema.parse(await req.json());
    return decideOdApproval(session, id, body, requestContext(req));
  });
}
