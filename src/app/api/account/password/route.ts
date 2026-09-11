import { NextResponse } from "next/server";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { changePasswordSchema } from "@/lib/validation/password";
import { changeOwnPassword } from "@/server/services/account.service";

export async function PATCH(req: Request) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const body = changePasswordSchema.parse(await req.json());
    await changeOwnPassword(session, body, requestContext(req));
    return NextResponse.json({ ok: true });
  });
}
