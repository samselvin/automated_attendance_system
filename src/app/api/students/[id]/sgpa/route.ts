import { z } from "zod";
import { apiRoute, requireApiSession } from "@/lib/api-utils";
import { idSchema } from "@/lib/validation/common";
import { getStudentSgpa } from "@/server/services/semester-result.service";

const querySchema = z.object({ semesterId: idSchema });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const url = new URL(req.url);
    const { semesterId } = querySchema.parse({ semesterId: url.searchParams.get("semesterId") });
    return getStudentSgpa(session, id, semesterId);
  });
}
