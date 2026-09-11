import { NextResponse } from "next/server";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { removeCalendarDay } from "@/server/services/calendar.service";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    await removeCalendarDay(session, id, requestContext(req));
    return NextResponse.json({ ok: true });
  });
}
