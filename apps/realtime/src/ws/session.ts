import type {
  DeviceId,
  EventId,
  ParticipantId,
  HostId,
} from "@app/shared-types";
import type { Envelope } from "@app/protocol";
import { encode, makeEnvelope } from "@app/protocol";
import { TokenBucket } from "../security/rateLimiter.ts";

export interface SocketSession {
  readonly id: string;
  readonly socket: WebSocket;
  readonly role: "host" | "participant";
  readonly eventId: EventId;
  readonly participantId: ParticipantId;
  readonly deviceId?: DeviceId;
  readonly hostId?: HostId;
  readonly bucket: TokenBucket;
  groupIdCache: string | null;
}

export function sendEnvelope<T>(
  session: SocketSession,
  type: string,
  payload: T,
): void {
  if (session.socket.readyState !== WebSocket.OPEN) return;
  session.socket.send(encode(makeEnvelope(type, payload)));
}

export function sendRaw(
  session: SocketSession,
  env: Envelope,
): void {
  if (session.socket.readyState !== WebSocket.OPEN) return;
  session.socket.send(encode(env));
}
