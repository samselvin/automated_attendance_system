import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runAttendanceMissingAlerts } from "@/server/services/alerts.service";

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAttendanceMissingAlerts();
  return NextResponse.json(result);
}
