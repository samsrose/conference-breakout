import { describe, expect, it } from "vitest";
import type {
  DeviceId,
  EventId,
  GroupId,
  Membership,
  Participant,
  ParticipantId,
} from "@app/shared-types";
import { createWorld, set } from "../src/world.ts";
import type { EntityId } from "../src/entity.ts";
import { resolveRecipients } from "../src/systems/broadcast.ts";

describe("BroadcastSystem", () => {
  const eventId = "evt_1" as unknown as EventId;

  it("event target returns all participants of that event", () => {
    const w = createWorld();
    for (let i = 0; i < 5; i++) {
      const p: Participant = {
        id: `p_${i}` as unknown as ParticipantId,
        eventId,
        deviceId: `d_${i}` as unknown as DeviceId,
        displayName: `P${i}`,
        joinedAt: i,
      };
      set(w, "Participant", p.id as unknown as EntityId, p);
    }
    const r = resolveRecipients(w, { kind: "event", eventId });
    expect(r).toHaveLength(5);
  });

  it("group target returns only members of that group", () => {
    const w = createWorld();
    const groupId = "grp_a" as unknown as GroupId;
    for (let i = 0; i < 6; i++) {
      const p: Participant = {
        id: `p_${i}` as unknown as ParticipantId,
        eventId,
        deviceId: `d_${i}` as unknown as DeviceId,
        displayName: `P${i}`,
        joinedAt: i,
      };
      set(w, "Participant", p.id as unknown as EntityId, p);
      const m: Membership = {
        participantId: p.id,
        eventId,
        groupId: i < 3 ? groupId : null,
        assignedAt: 0,
      };
      set(w, "Membership", p.id as unknown as EntityId, m);
    }
    const r = resolveRecipients(w, { kind: "group", eventId, groupId });
    expect(r).toHaveLength(3);
  });

  it("participant target returns a single recipient", () => {
    const w = createWorld();
    const r = resolveRecipients(w, {
      kind: "participant",
      participantId: "p_1" as unknown as ParticipantId,
    });
    expect(r).toHaveLength(1);
  });
});
