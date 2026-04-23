import { jwtVerify, SignJWT } from "jose";
import type {
  DeviceId,
  EventId,
  HostId,
  ParticipantId,
} from "@app/shared-types";

export type Role = "host" | "participant";

export interface HostClaims {
  role: "host";
  sub: HostId;
  email: string;
  eventId: EventId;
}

export interface ParticipantClaims {
  role: "participant";
  sub: ParticipantId;
  eventId: EventId;
  deviceId: DeviceId;
}

export type AuthClaims = HostClaims | ParticipantClaims;

const ISSUER = "conference-breakout";
const HOST_TTL = "12h";
const PARTICIPANT_TTL = "8h";

function secretKey(raw: string): Uint8Array {
  return new TextEncoder().encode(raw);
}

export async function signHostToken(
  secret: string,
  claims: Omit<HostClaims, "role">,
): Promise<string> {
  return new SignJWT({
    role: "host",
    email: claims.email,
    eventId: claims.eventId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(HOST_TTL)
    .sign(secretKey(secret));
}

export async function signParticipantToken(
  secret: string,
  claims: Omit<ParticipantClaims, "role">,
): Promise<string> {
  return new SignJWT({
    role: "participant",
    eventId: claims.eventId,
    deviceId: claims.deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(PARTICIPANT_TTL)
    .sign(secretKey(secret));
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<AuthClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    issuer: ISSUER,
  });
  const role = payload["role"];
  const sub = payload.sub;
  if (!sub) throw new Error("missing sub");
  if (role === "host") {
    const eventId = String(payload["eventId"] ?? "") as EventId;
    if (!eventId) throw new Error("host token missing eventId");
    return {
      role: "host",
      sub: sub as HostId,
      email: String(payload["email"] ?? ""),
      eventId,
    };
  }
  if (role === "participant") {
    return {
      role: "participant",
      sub: sub as ParticipantId,
      eventId: String(payload["eventId"] ?? "") as EventId,
      deviceId: String(payload["deviceId"] ?? "") as DeviceId,
    };
  }
  throw new Error("unknown role claim");
}
