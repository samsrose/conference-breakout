import { ServerMessageType } from "@app/protocol";
import type { Broadcaster } from "../ws/broadcaster.ts";
import type { Hub } from "../ws/hub.ts";
import type { Store } from "../kv/store.ts";

const SWEEP_INTERVAL_MS = 10_000;

export function startPresenceSweeper(
  store: Store,
  broadcaster: Broadcaster,
  hub: Hub,
): number {
  return setInterval(async () => {
    for (const eventId of hub.activeEventIds()) {
      try {
        const summary = await store.summarizePresence(eventId);
        await broadcaster.toHosts(eventId, ServerMessageType.PresenceDelta, {
          eventId,
          ...summary,
        });
      } catch (err) {
        console.warn("presence sweep failed", eventId, err);
      }
    }
  }, SWEEP_INTERVAL_MS);
}
