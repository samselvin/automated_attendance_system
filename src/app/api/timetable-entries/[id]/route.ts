import { NextResponse } from "next/server";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { deleteTimetableEntry } from "@/server/services/timetable.service";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    await deleteTimetableEntry(session, id, requestContext(req));
    return NextResponse.json({ ok: true });
  });
}
