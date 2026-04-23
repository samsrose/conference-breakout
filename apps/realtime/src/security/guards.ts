import { ErrorCode, ProtocolError } from "@app/protocol";
import type { SocketSession } from "../ws/session.ts";

export function requireHost(session: SocketSession): void {
  if (session.role !== "host") {
    throw new ProtocolError(ErrorCode.Unauthorized, "host-only action");
  }
}

export function requireParticipant(session: SocketSession): void {
  if (session.role !== "participant") {
    throw new ProtocolError(
      ErrorCode.Unauthorized,
      "participant-only action",
    );
  }
}

export function requireSameEvent(
  session: SocketSession,
  claimedEventId: string,
): void {
  if (session.eventId !== claimedEventId) {
    throw new ProtocolError(
      ErrorCode.Unauthorized,
      "cross-event action blocked",
    );
  }
}
