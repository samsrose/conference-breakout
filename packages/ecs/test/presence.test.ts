import { describe, expect, it } from "vitest";
import type { EventId, ParticipantId } from "@app/shared-types";
import { createWorld } from "../src/world.ts";
import {
  AWAY_AFTER_MS,
  OFFLINE_AFTER_MS,
  summarize,
  sweepPresence,
  touchPresence,
} from "../src/systems/presence.ts";

describe("PresenceSystem", () => {
  const eventId = "evt_1" as unknown as EventId;

  it("touch marks participant online with lastSeenAt=now", () => {
    const w = createWorld();
    const p = touchPresence(
      w,
      "p_1" as unknown as ParticipantId,
      eventId,
      10_000,
    );
    expect(p.status).toBe("online");
    expect(p.lastSeenAt).toBe(10_000);
  });

  it("sweep transitions online -> away -> offline over time", () => {
    const w = createWorld();
    touchPresence(w, "p_1" as unknown as ParticipantId, eventId, 0);
    sweepPresence(w, AWAY_AFTER_MS);
    expect(summarize(w, eventId)).toEqual({
      eventId,
      online: 0,
      away: 1,
      offline: 0,
    });
    sweepPresence(w, OFFLINE_AFTER_MS);
    expect(summarize(w, eventId)).toEqual({
      eventId,
      online: 0,
      away: 0,
      offline: 1,
    });
  });

  it("summarize only counts participants of the given event", () => {
    const w = createWorld();
    touchPresence(w, "p_1" as unknown as ParticipantId, eventId, 0);
    touchPresence(
      w,
      "p_2" as unknown as ParticipantId,
      "evt_2" as unknown as EventId,
      0,
    );
    const s = summarize(w, eventId);
    expect(s.online + s.away + s.offline).toBe(1);
  });
});
