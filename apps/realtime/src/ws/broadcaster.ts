import type { EventId, GroupId, ParticipantId } from "@app/shared-types";
import type { Envelope } from "@app/protocol";
import { encode, makeEnvelope } from "@app/protocol";
import type { Hub } from "./hub.ts";
import type { Store } from "../kv/store.ts";

export class Broadcaster {
  constructor(
    private readonly hub: Hub,
    private readonly store: Store,
  ) {}

  async toEvent<T>(eventId: EventId, type: string, payload: T): Promise<void> {
    const env = makeEnvelope(type, payload);
    await this.persist(eventId, env);
    this.fanOut(this.hub.all(eventId), env);
  }

  async toParticipants<T>(
    eventId: EventId,
    type: string,
    payload: T,
  ): Promise<void> {
    const env = makeEnvelope(type, payload);
    await this.persist(eventId, env);
    this.fanOut(this.hub.participants(eventId), env);
  }

  async toGroup<T>(
    eventId: EventId,
    groupId: GroupId,
    type: string,
    payload: T,
  ): Promise<void> {
    const env = makeEnvelope(type, payload);
    await this.persist(eventId, env);
    const sockets = this.hub
      .participants(eventId)
      .filter((s) => s.groupIdCache === groupId);
    this.fanOut(sockets, env);
  }

  async toHosts<T>(eventId: EventId, type: string, payload: T): Promise<void> {
    const env = makeEnvelope(type, payload);
    this.fanOut(this.hub.hosts(eventId), env);
  }

  async toParticipant<T>(
    eventId: EventId,
    participantId: ParticipantId,
    type: string,
    payload: T,
  ): Promise<void> {
    const env = makeEnvelope(type, payload);
    const sockets = this.hub
      .participants(eventId)
      .filter((s) => s.participantId === participantId);
    this.fanOut(sockets, env);
  }

  private fanOut(
    sockets: ReturnType<Hub["all"]>,
    env: Envelope,
  ): void {
    const frame = encode(env);
    for (const s of sockets) {
      if (s.socket.readyState === WebSocket.OPEN) {
        try {
          s.socket.send(frame);
        } catch {
          // drop on send error; client will reconnect
        }
      }
    }
  }

  private async persist(eventId: EventId, env: Envelope): Promise<void> {
    await this.store.appendOutbox(eventId, env);
  }
}
