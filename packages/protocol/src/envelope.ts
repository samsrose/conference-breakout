import { z } from "zod";

export const PROTOCOL_VERSION = 1 as const;

export const EnvelopeSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  id: z.string().min(1).max(64),
  ts: z.number().int().nonnegative(),
  type: z.string().min(1).max(64),
  payload: z.unknown(),
});

export type Envelope<T = unknown> = {
  readonly v: typeof PROTOCOL_VERSION;
  readonly id: string;
  readonly ts: number;
  readonly type: string;
  readonly payload: T;
};

export function makeEnvelope<T>(type: string, payload: T): Envelope<T> {
  return {
    v: PROTOCOL_VERSION,
    id: cryptoRandomId(),
    ts: Date.now(),
    type,
    payload,
  };
}

function cryptoRandomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
