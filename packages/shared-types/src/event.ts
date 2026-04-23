import { z } from "zod";
import { EventCodeSchema, EventIdSchema, HostIdSchema } from "./ids.ts";

export const EventPhaseSchema = z.enum([
  "lobby",
  "plenary",
  "breakout",
  "closed",
]);
export type EventPhase = z.infer<typeof EventPhaseSchema>;

export const EventMetaSchema = z.object({
  id: EventIdSchema,
  code: EventCodeSchema,
  title: z.string().min(1).max(120),
  hostId: HostIdSchema,
  phase: EventPhaseSchema,
  createdAt: z.number().int().nonnegative(),
  closedAt: z.number().int().nonnegative().optional(),
});
export type EventMeta = z.infer<typeof EventMetaSchema>;
