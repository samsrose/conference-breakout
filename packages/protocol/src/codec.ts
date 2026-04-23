import { EnvelopeSchema, PROTOCOL_VERSION, type Envelope } from "./envelope.ts";
import { ErrorCode, ProtocolError } from "./errors.ts";
import { CLIENT_PAYLOAD_SCHEMAS } from "./messages/client.ts";
import { SERVER_PAYLOAD_SCHEMAS } from "./messages/server.ts";

const MAX_MESSAGE_BYTES = 64 * 1024;

export function encode<T>(envelope: Envelope<T>): string {
  const json = JSON.stringify(envelope);
  if (json.length > MAX_MESSAGE_BYTES) {
    throw new ProtocolError(ErrorCode.BadPayload, "message exceeds size cap");
  }
  return json;
}

export function decodeRaw(raw: string): Envelope {
  if (raw.length > MAX_MESSAGE_BYTES) {
    throw new ProtocolError(ErrorCode.BadEnvelope, "message exceeds size cap");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProtocolError(ErrorCode.BadEnvelope, "invalid JSON");
  }
  const result = EnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    throw new ProtocolError(ErrorCode.BadEnvelope, result.error.message);
  }
  if (result.data.v !== PROTOCOL_VERSION) {
    throw new ProtocolError(
      ErrorCode.VersionMismatch,
      `expected v${PROTOCOL_VERSION}, got v${result.data.v}`,
    );
  }
  return result.data as Envelope;
}

export function decodeClient(raw: string) {
  const env = decodeRaw(raw);
  const schema = (CLIENT_PAYLOAD_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }>)[env.type];
  if (!schema) {
    throw new ProtocolError(
      ErrorCode.BadEnvelope,
      `unknown client message type: ${env.type}`,
    );
  }
  const payload = schema.safeParse(env.payload);
  if (!payload.success) {
    throw new ProtocolError(
      ErrorCode.BadPayload,
      payload.error?.message ?? "invalid payload",
    );
  }
  return { envelope: env, payload: payload.data };
}

export function decodeServer(raw: string) {
  const env = decodeRaw(raw);
  const schema = (SERVER_PAYLOAD_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean; data?: unknown; error?: { message: string } } }>)[env.type];
  if (!schema) {
    throw new ProtocolError(
      ErrorCode.BadEnvelope,
      `unknown server message type: ${env.type}`,
    );
  }
  const payload = schema.safeParse(env.payload);
  if (!payload.success) {
    throw new ProtocolError(
      ErrorCode.BadPayload,
      payload.error?.message ?? "invalid payload",
    );
  }
  return { envelope: env, payload: payload.data };
}
