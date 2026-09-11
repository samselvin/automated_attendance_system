import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { setGroupMembersSchema } from "@/lib/validation/student-group";
import { setGroupMembers } from "@/server/services/student-group.service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const body = setGroupMembersSchema.parse(await req.json());
    return setGroupMembers(session, id, body, requestContext(req));
  });
}
