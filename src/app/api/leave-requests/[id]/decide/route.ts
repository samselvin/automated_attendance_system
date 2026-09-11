import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { decideSingleApprovalSchema } from "@/lib/validation/leave";
import { decideLeaveOrMedical } from "@/server/services/leave.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = decideSingleApprovalSchema.parse(await req.json());
    return decideLeaveOrMedical(session, id, body, requestContext(req));
  });
}
