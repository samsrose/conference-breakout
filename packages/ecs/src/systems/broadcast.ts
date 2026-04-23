import type {
  EventId,
  GroupId,
  ParticipantId,
} from "@app/shared-types";
import type { World } from "../world.ts";

export type BroadcastTarget =
  | { kind: "event"; eventId: EventId }
  | { kind: "group"; eventId: EventId; groupId: GroupId }
  | { kind: "participant"; participantId: ParticipantId }
  | { kind: "host"; eventId: EventId };

export interface Recipient {
  participantId: ParticipantId;
}

export function resolveRecipients(
  world: World,
  target: BroadcastTarget,
): Recipient[] {
  switch (target.kind) {
    case "participant":
      return [{ participantId: target.participantId }];
    case "event":
      return participantsOfEvent(world, target.eventId);
    case "group":
      return participantsOfGroup(world, target.groupId);
    case "host":
      return [];
  }
}

function participantsOfEvent(world: World, eventId: EventId): Recipient[] {
  const out: Recipient[] = [];
  for (const p of world.tables.Participant.values()) {
    if (p.eventId === eventId) out.push({ participantId: p.id });
  }
  return out;
}

function participantsOfGroup(world: World, groupId: GroupId): Recipient[] {
  const out: Recipient[] = [];
  for (const m of world.tables.Membership.values()) {
    if (m.groupId === groupId) out.push({ participantId: m.participantId });
  }
  return out;
}
