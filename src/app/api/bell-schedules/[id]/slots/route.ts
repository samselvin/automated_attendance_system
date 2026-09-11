import { z } from "zod";
import { apiRoute, requireApiSession, requestContext } from "@/lib/api-utils";
import { bellScheduleSlotSchema } from "@/lib/validation/bell-schedule";
import { replaceBellScheduleSlots } from "@/server/services/bell-schedule.service";

const bodySchema = z.object({ slots: z.array(bellScheduleSlotSchema).min(1) });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiRoute(async () => {
    const session = await requireApiSession();
    const { id } = await params;
    const { slots } = bodySchema.parse(await req.json());
    return replaceBellScheduleSlots(session, id, slots, requestContext(req));
  });
}
