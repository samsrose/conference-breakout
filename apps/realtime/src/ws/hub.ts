import type { EventId } from "@app/shared-types";
import type { SocketSession } from "./session.ts";

/**
 * In-process pub/sub for a single isolate.
 * For multi-isolate horizontal scale, subscribe to a KV "doorbell" key
 * per event and fetch missed outbox entries on wake-up; the local Hub
 * shape stays identical.
 */
export class Hub {
  private readonly eventSockets = new Map<EventId, Set<SocketSession>>();
  private readonly hostSockets = new Map<EventId, Set<SocketSession>>();

  attach(session: SocketSession): void {
    const bucket = session.role === "host" ? this.hostSockets : this.eventSockets;
    let set = bucket.get(session.eventId);
    if (!set) {
      set = new Set();
      bucket.set(session.eventId, set);
    }
    set.add(session);
  }

  detach(session: SocketSession): void {
    const bucket = session.role === "host" ? this.hostSockets : this.eventSockets;
    const set = bucket.get(session.eventId);
    if (!set) return;
    set.delete(session);
    if (set.size === 0) bucket.delete(session.eventId);
  }

  participants(eventId: EventId): SocketSession[] {
    return Array.from(this.eventSockets.get(eventId) ?? []);
  }

  hosts(eventId: EventId): SocketSession[] {
    return Array.from(this.hostSockets.get(eventId) ?? []);
  }

  all(eventId: EventId): SocketSession[] {
    return [...this.participants(eventId), ...this.hosts(eventId)];
  }

  /** Close every participant WebSocket for an event (host sockets stay connected). */
  disconnectParticipants(eventId: EventId, code: number, reason: string): void {
    const list = [...this.participants(eventId)];
    for (const s of list) {
      try {
        s.socket.close(code, reason);
      } catch {
        // already closed
      }
    }
  }

  activeEventIds(): EventId[] {
    const seen = new Set<EventId>();
    for (const id of this.eventSockets.keys()) seen.add(id);
    for (const id of this.hostSockets.keys()) seen.add(id);
    return Array.from(seen);
  }
}
