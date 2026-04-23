import type {
  EventId,
  GroupId,
  Group,
  Membership,
  Participant,
} from "@app/shared-types";
import type { World } from "../world.ts";
import { all, set } from "../world.ts";
import type { EntityId } from "../entity.ts";
import { newEntityId } from "../entity.ts";

export interface PartitionResult {
  groups: Group[];
  memberships: Membership[];
}

export function partitionIntoGroups(
  world: World,
  eventId: EventId,
  size: number,
  now: number,
): PartitionResult {
  const participants = participantsOfEvent(world, eventId);
  participants.sort((a, b) => a.joinedAt - b.joinedAt);

  const groups: Group[] = [];
  const memberships: Membership[] = [];

  for (let i = 0; i < participants.length; i += size) {
    const slice = participants.slice(i, i + size);
    const groupId = newEntityId("grp") as unknown as GroupId;
    const group: Group = {
      id: groupId,
      eventId,
      index: Math.floor(i / size),
      capacity: size,
      createdAt: now,
    };
    groups.push(group);
    set(world, "Group", groupId as unknown as EntityId, group);

    for (const p of slice) {
      const m: Membership = {
        participantId: p.id,
        eventId,
        groupId,
        assignedAt: now,
      };
      memberships.push(m);
      set(world, "Membership", p.id as unknown as EntityId, m);
    }
  }

  return { groups, memberships };
}

export function mergeToPlenary(
  world: World,
  eventId: EventId,
  now: number,
): Membership[] {
  const updated: Membership[] = [];
  for (const [id, m] of all(world, "Membership")) {
    if (m.eventId !== eventId) continue;
    const next: Membership = { ...m, groupId: null, assignedAt: now };
    set(world, "Membership", id, next);
    updated.push(next);
  }

  for (const [gid, g] of all(world, "Group")) {
    if (g.eventId === eventId) world.tables.Group.delete(gid);
  }
  return updated;
}

function participantsOfEvent(world: World, eventId: EventId): Participant[] {
  const out: Participant[] = [];
  for (const p of world.tables.Participant.values()) {
    if (p.eventId === eventId) out.push(p);
  }
  return out;
}
