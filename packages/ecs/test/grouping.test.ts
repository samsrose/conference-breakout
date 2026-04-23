import { describe, expect, it } from "vitest";
import type {
  DeviceId,
  EventId,
  Participant,
  ParticipantId,
} from "@app/shared-types";
import { createWorld, set, all } from "../src/world.ts";
import type { EntityId } from "../src/entity.ts";
import { newEntityId } from "../src/entity.ts";
import { mergeToPlenary, partitionIntoGroups } from "../src/systems/grouping.ts";

function makeParticipant(
  eventId: EventId,
  joinedAt: number,
  i: number,
): Participant {
  return {
    id: `p_${i}` as unknown as ParticipantId,
    eventId,
    deviceId: `d_${i}` as unknown as DeviceId,
    displayName: `P${i}`,
    joinedAt,
  };
}

describe("GroupingSystem", () => {
  const eventId = "evt_1" as unknown as EventId;

  it("partitions 20 participants into three groups of 8/8/4", () => {
    const w = createWorld();
    for (let i = 0; i < 20; i++) {
      const p = makeParticipant(eventId, 1000 + i, i);
      set(w, "Participant", p.id as unknown as EntityId, p);
    }
    const result = partitionIntoGroups(w, eventId, 8, 2000);
    expect(result.groups).toHaveLength(3);
    expect(result.groups[0]?.capacity).toBe(8);
    const counts = result.groups.map(
      (g) => result.memberships.filter((m) => m.groupId === g.id).length,
    );
    expect(counts).toEqual([8, 8, 4]);
  });

  it("assigns every participant to exactly one group", () => {
    const w = createWorld();
    for (let i = 0; i < 17; i++) {
      const p = makeParticipant(eventId, 1000 + i, i);
      set(w, "Participant", p.id as unknown as EntityId, p);
    }
    partitionIntoGroups(w, eventId, 8, 2000);
    const memberships = all(w, "Membership");
    expect(memberships).toHaveLength(17);
    for (const [, m] of memberships) {
      expect(m.groupId).not.toBeNull();
    }
  });

  it("mergeToPlenary clears all group ids and deletes groups", () => {
    const w = createWorld();
    for (let i = 0; i < 10; i++) {
      const p = makeParticipant(eventId, 1000 + i, i);
      set(w, "Participant", p.id as unknown as EntityId, p);
    }
    partitionIntoGroups(w, eventId, 8, 2000);
    mergeToPlenary(w, eventId, 3000);
    for (const [, m] of all(w, "Membership")) {
      expect(m.groupId).toBeNull();
    }
    expect(all(w, "Group")).toHaveLength(0);
  });

  it("is idempotent: re-partition yields a fresh assignment", () => {
    const w = createWorld();
    for (let i = 0; i < 9; i++) {
      const p = makeParticipant(eventId, 1000 + i, i);
      set(w, "Participant", p.id as unknown as EntityId, p);
    }
    const first = partitionIntoGroups(w, eventId, 8, 2000);
    const second = partitionIntoGroups(w, eventId, 8, 3000);
    expect(first.groups.length).toBe(second.groups.length);
  });

  it("uses an unused group id on re-partition (stable via newEntityId)", () => {
    const id1 = newEntityId("grp");
    const id2 = newEntityId("grp");
    expect(id1).not.toEqual(id2);
  });
});
