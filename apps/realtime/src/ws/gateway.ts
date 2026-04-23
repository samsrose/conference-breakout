import type { Context } from "hono";
import {
  encode,
  makeEnvelope,
  ServerMessageType,
  ProtocolError,
  ErrorCode,
} from "@app/protocol";
import type {
  DeviceId,
  HostId,
  ParticipantId,
} from "@app/shared-types";
import type { Config } from "../config.ts";
import type { Store } from "../kv/store.ts";
import type { AuthClaims } from "../auth/jwt.ts";
import { verifyToken } from "../auth/jwt.ts";
import { TokenBucket } from "../security/rateLimiter.ts";
import { dispatchClientMessage } from "./handlers.ts";
import type { Hub } from "./hub.ts";
import type { Broadcaster } from "./broadcaster.ts";
import type { SocketSession } from "./session.ts";

export interface GatewayDeps {
  config: Config;
  store: Store;
  hub: Hub;
  broadcaster: Broadcaster;
  onClose?: () => void;
}

export function upgradeWebSocket(
  c: Context,
  deps: GatewayDeps,
): Response {
  const token = c.req.query("token");
  if (!token) {
    return new Response("missing token", { status: 401 });
  }

  const { response, socket } = Deno.upgradeWebSocket(c.req.raw);

  // Attach transport-level listeners synchronously so disconnects during the
  // async JWT verify window are still observed (and not dumped as scary errors).
  let sessionBound = false;
  socket.addEventListener("error", (ev) => {
    if (sessionBound) return;
    const msg = (ev as ErrorEvent).message ?? "ws error";
    // "Unexpected EOF" is a routine transport close (browser/HMR reload,
    // React strict-mode double-invoke, etc). Demote noise to debug.
    if (msg === "Unexpected EOF") return;
    console.warn("ws transport error (pre-session):", msg);
  });

  void bindSocket(socket, token, deps, () => {
    sessionBound = true;
  }).catch((err) => {
    console.error("ws bind failed:", err);
    try {
      socket.close(1008, "unauthorized");
    } catch {
      // already closed
    }
  });

  return response;
}

async function bindSocket(
  socket: WebSocket,
  token: string,
  deps: GatewayDeps,
  markBound: () => void,
): Promise<void> {
  let claims: AuthClaims;
  try {
    claims = await verifyToken(deps.config.jwtSecret, token);
  } catch {
    try {
      socket.close(1008, "invalid token");
    } catch {
      // already closed
    }
    return;
  }

  // If the client already disconnected before verify finished, bail out.
  if (
    socket.readyState === WebSocket.CLOSED ||
    socket.readyState === WebSocket.CLOSING
  ) {
    return;
  }

  const attach = () => {
    markBound();
    void attachSession(socket, claims, deps);
  };

  if (socket.readyState === WebSocket.OPEN) {
    attach();
  } else {
    socket.addEventListener("open", attach, { once: true });
  }
}

async function attachSession(
  socket: WebSocket,
  claims: AuthClaims,
  deps: GatewayDeps,
): Promise<void> {
  try {
    const session = await createSession(socket, claims, deps);
    deps.hub.attach(session);
    registerHandlers(session, deps);
    await sendWelcome(session, deps);
  } catch (err) {
    console.error("attach failed:", err);
    sendError(socket, err);
    try {
      socket.close(1011, "attach failed");
    } catch {
      // already closed
    }
  }
}

async function createSession(
  socket: WebSocket,
  claims: AuthClaims,
  deps: GatewayDeps,
): Promise<SocketSession> {
  const id = crypto.randomUUID();
  const bucket = new TokenBucket(deps.config.msgsPerSecond, deps.config.burst);

  if (claims.role === "host") {
    const event = await deps.store.getEvent(claims.eventId);
    if (!event) {
      throw new ProtocolError(ErrorCode.NotFound, "event not found");
    }
    if (event.hostId !== claims.sub) {
      throw new ProtocolError(ErrorCode.Unauthorized, "not event host");
    }
    return {
      id,
      socket,
      role: "host",
      eventId: claims.eventId,
      participantId: claims.sub as unknown as ParticipantId,
      hostId: claims.sub as HostId,
      bucket,
      groupIdCache: null,
    };
  }

  const participant = await ensureParticipant(deps, claims);
  return {
    id,
    socket,
    role: "participant",
    eventId: claims.eventId,
    participantId: participant.id,
    deviceId: claims.deviceId as DeviceId,
    bucket,
    groupIdCache: (await deps.store.getMembership(claims.eventId, participant.id))
      ?.groupId ?? null,
  };
}

async function ensureParticipant(
  deps: GatewayDeps,
  claims: Extract<AuthClaims, { role: "participant" }>,
): Promise<{ id: ParticipantId }> {
  const existing = await deps.store.listParticipants(claims.eventId);
  const match = existing.find((p) => p.deviceId === claims.deviceId);
  if (match) return { id: match.id };
  const id = `part_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}` as ParticipantId;
  await deps.store.upsertParticipant({
    id,
    eventId: claims.eventId,
    deviceId: claims.deviceId,
    displayName: `Participant ${id.slice(-4)}`,
    joinedAt: Date.now(),
  });
  await deps.store.upsertMembership({
    participantId: id,
    eventId: claims.eventId,
    groupId: null,
    assignedAt: Date.now(),
  });
  return { id };
}

function registerHandlers(session: SocketSession, deps: GatewayDeps): void {
  const ctx = {
    store: deps.store,
    hub: deps.hub,
    broadcaster: deps.broadcaster,
  };
  session.socket.addEventListener("message", async (ev) => {
    try {
      if (typeof ev.data !== "string") {
        throw new ProtocolError(ErrorCode.BadEnvelope, "binary not supported");
      }
      await dispatchClientMessage(ctx, session, ev.data);
    } catch (err) {
      sendError(session.socket, err);
    }
  });

  session.socket.addEventListener("close", () => {
    deps.hub.detach(session);
    deps.onClose?.();
  });

  session.socket.addEventListener("error", (e) => {
    const msg = (e as ErrorEvent).message ?? "unknown";
    if (msg !== "Unexpected EOF") {
      console.warn("ws error:", msg);
    }
    deps.hub.detach(session);
    deps.onClose?.();
  });
}

async function sendWelcome(
  session: SocketSession,
  deps: GatewayDeps,
): Promise<void> {
  const event = await deps.store.getEvent(session.eventId);
  if (!event) {
    throw new ProtocolError(ErrorCode.NotFound, "event missing");
  }
  const membership = await deps.store.getMembership(
    session.eventId,
    session.participantId,
  );
  session.socket.send(
    encode(
      makeEnvelope(ServerMessageType.Welcome, {
        participantId: session.participantId,
        eventId: session.eventId,
        phase: event.phase,
        groupId: membership?.groupId ?? null,
        role: session.role,
      }),
    ),
  );
}

function sendError(socket: WebSocket, err: unknown): void {
  const protoErr =
    err instanceof ProtocolError
      ? err
      : new ProtocolError(ErrorCode.Internal, "internal error");
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    encode(
      makeEnvelope(ServerMessageType.Error, {
        code: protoErr.code,
        message: protoErr.message,
      }),
    ),
  );
}
