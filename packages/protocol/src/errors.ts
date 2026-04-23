export const ErrorCode = {
  BadEnvelope: "BAD_ENVELOPE",
  BadPayload: "BAD_PAYLOAD",
  Unauthenticated: "UNAUTHENTICATED",
  Unauthorized: "UNAUTHORIZED",
  NotFound: "NOT_FOUND",
  RateLimited: "RATE_LIMITED",
  EventClosed: "EVENT_CLOSED",
  VersionMismatch: "VERSION_MISMATCH",
  Internal: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ProtocolError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ProtocolError";
  }
}
