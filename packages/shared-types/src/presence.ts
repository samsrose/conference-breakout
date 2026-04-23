import { z } from "zod";
import { EventIdSchema, ParticipantIdSchema } from "./ids.ts";

export const PresenceStatusSchema = z.enum(["online", "away", "offline"]);
export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

export const PresenceSchema = z.object({
  participantId: ParticipantIdSchema,
  eventId: EventIdSchema,
  status: PresenceStatusSchema,
  lastSeenAt: z.number().int().nonnegative(),
});
export type Presence = z.infer<typeof PresenceSchema>;

export const PresenceSummarySchema = z.object({
  eventId: EventIdSchema,
  online: z.number().int().nonnegative(),
  away: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
});
export type PresenceSummary = z.infer<typeof PresenceSummarySchema>;
