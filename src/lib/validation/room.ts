import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
