import type { HostId } from "@app/shared-types";
import { keys } from "../kv/keys.ts";

/**
 * Minimal host auth: email+password recorded in KV; production should
 * swap this for magic-link/OAuth. The surface area is small enough that
 * the ring-level guards downstream are unaffected.
 */

export interface HostRecord {
  readonly id: HostId;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: number;
}

async function hash(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function newHostId(): HostId {
  return `host_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}` as HostId;
}

export class HostAuth {
  constructor(
    private readonly kv: Deno.Kv,
    private readonly salt: string,
  ) {}

  async register(email: string, password: string): Promise<HostRecord> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.kv.get<HostId>(keys.hostByEmail(normalized));
    if (existing.value) throw new Error("email already registered");
    const id = newHostId();
    const record: HostRecord = {
      id,
      email: normalized,
      passwordHash: await hash(password, this.salt),
      createdAt: Date.now(),
    };
    const r = await this.kv
      .atomic()
      .check({ key: keys.hostByEmail(normalized), versionstamp: null })
      .set(keys.host(id), record)
      .set(keys.hostByEmail(normalized), id)
      .commit();
    if (!r.ok) throw new Error("registration race");
    return record;
  }

  async login(email: string, password: string): Promise<HostRecord | null> {
    const normalized = email.trim().toLowerCase();
    const idEntry = await this.kv.get<HostId>(keys.hostByEmail(normalized));
    if (!idEntry.value) return null;
    const rec = await this.kv.get<HostRecord>(keys.host(idEntry.value));
    if (!rec.value) return null;
    const ok = rec.value.passwordHash === (await hash(password, this.salt));
    return ok ? rec.value : null;
  }
}
