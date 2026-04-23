import { z } from "zod";
import { EventIdSchema, GroupIdSchema } from "./ids.ts";

export const GROUP_CAPACITY = 8;

export const GroupSchema = z.object({
  id: GroupIdSchema,
  eventId: EventIdSchema,
  index: z.number().int().nonnegative(),
  capacity: z.number().int().positive().default(GROUP_CAPACITY),
  createdAt: z.number().int().nonnegative(),
});
export type Group = z.infer<typeof GroupSchema>;
