import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { submitLeaveRequestSchema } from "@/lib/validation/leave";
import { listLeaveRequests, submitLeaveRequest } from "@/server/services/leave.service";

export async function GET(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const url = new URL(req.url);
    return listLeaveRequests(session, {
      studentId: url.searchParams.get("studentId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
  });
}

export async function POST(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = submitLeaveRequestSchema.parse(await req.json());
    return submitLeaveRequest(session, body, requestContext(req));
  });
}
