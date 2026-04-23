import { z } from "zod";
import {
  DeviceIdSchema,
  EventIdSchema,
  GroupIdSchema,
  ParticipantIdSchema,
} from "./ids.ts";

export const ParticipantSchema = z.object({
  id: ParticipantIdSchema,
  eventId: EventIdSchema,
  deviceId: DeviceIdSchema,
  displayName: z.string().min(1).max(60),
  joinedAt: z.number().int().nonnegative(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const MembershipSchema = z.object({
  participantId: ParticipantIdSchema,
  eventId: EventIdSchema,
  groupId: GroupIdSchema.nullable(),
  assignedAt: z.number().int().nonnegative(),
});
export type Membership = z.infer<typeof MembershipSchema>;
