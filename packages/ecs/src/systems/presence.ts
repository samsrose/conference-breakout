import type {
  EventId,
  ParticipantId,
  Presence,
  PresenceStatus,
  PresenceSummary,
} from "@app/shared-types";
import type { World } from "../world.ts";
import { set } from "../world.ts";
import type { EntityId } from "../entity.ts";

export const AWAY_AFTER_MS = 30_000;
export const OFFLINE_AFTER_MS = 60_000;

export function touchPresence(
  world: World,
  participantId: ParticipantId,
  eventId: EventId,
  now: number,
): Presence {
  const next: Presence = {
    participantId,
    eventId,
    status: "online",
    lastSeenAt: now,
  };
  set(world, "Presence", participantId as unknown as EntityId, next);
  return next;
}

export function sweepPresence(world: World, now: number): Presence[] {
  const updated: Presence[] = [];
  for (const [id, p] of world.tables.Presence.entries()) {
    const age = now - p.lastSeenAt;
    const next = statusFromAge(age);
    if (next !== p.status) {
      const updatedP: Presence = { ...p, status: next };
      world.tables.Presence.set(id, updatedP);
      updated.push(updatedP);
    }
  }
  return updated;
}

export function summarize(world: World, eventId: EventId): PresenceSummary {
  let online = 0;
  let away = 0;
  let offline = 0;
  for (const p of world.tables.Presence.values()) {
    if (p.eventId !== eventId) continue;
    if (p.status === "online") online++;
    else if (p.status === "away") away++;
    else offline++;
  }
  return { eventId, online, away, offline };
}

function statusFromAge(ageMs: number): PresenceStatus {
  if (ageMs >= OFFLINE_AFTER_MS) return "offline";
  if (ageMs >= AWAY_AFTER_MS) return "away";
  return "online";
}
