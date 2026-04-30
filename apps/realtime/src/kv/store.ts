import type {
  EventCode,
  EventId,
  EventMeta,
  EventPhase,
  Form,
  Group,
  Membership,
  Participant,
  ParticipantId,
  Presence,
  PresenceStatus,
  Response,
} from "@app/shared-types";
import { keys } from "./keys.ts";

export class Store {
  constructor(private readonly kv: Deno.Kv) {}

  async createEvent(meta: EventMeta): Promise<void> {
    const res = await this.kv
      .atomic()
      .check({ key: keys.event(meta.id), versionstamp: null })
      .check({ key: keys.eventByCode(meta.code), versionstamp: null })
      .set(keys.event(meta.id), meta)
      .set(keys.eventByCode(meta.code), meta.id)
      .commit();
    if (!res.ok) throw new Error("event creation conflict");
  }

  async getEvent(eventId: EventId): Promise<EventMeta | null> {
    const r = await this.kv.get<EventMeta>(keys.event(eventId));
    return r.value;
  }

  async findEventByCode(code: EventCode): Promise<EventMeta | null> {
    const idEntry = await this.kv.get<EventId>(keys.eventByCode(code));
    if (!idEntry.value) return null;
    return this.getEvent(idEntry.value);
  }

  async setEventPhase(eventId: EventId, phase: EventPhase): Promise<void> {
    const existing = await this.kv.get<EventMeta>(keys.event(eventId));
    if (!existing.value) throw new Error("event not found");
    const next: EventMeta = {
      ...existing.value,
      phase,
      ...(phase === "closed"
        ? { closedAt: existing.value.closedAt ?? Date.now() }
        : {}),
    };
    await this.kv.set(keys.event(eventId), next);
  }

  async upsertParticipant(p: Participant): Promise<void> {
    await this.kv.set(keys.participant(p.eventId, p.id), p);
  }

  async listParticipants(eventId: EventId): Promise<Participant[]> {
    const out: Participant[] = [];
    for await (const entry of this.kv.list<Participant>({
      prefix: keys.participantsByEvent(eventId),
    })) {
      out.push(entry.value);
    }
    return out;
  }

  async upsertMembership(m: Membership): Promise<void> {
    await this.kv.set(keys.membership(m.eventId, m.participantId), m);
  }

  async setMemberships(ms: readonly Membership[]): Promise<void> {
    if (ms.length === 0) return;
    let tx = this.kv.atomic();
    for (const m of ms) {
      tx = tx.set(keys.membership(m.eventId, m.participantId), m);
    }
    const r = await tx.commit();
    if (!r.ok) throw new Error("membership write failed");
  }

  async clearGroupsForEvent(eventId: EventId): Promise<void> {
    for await (const entry of this.kv.list({
      prefix: keys.groupsByEvent(eventId),
    })) {
      await this.kv.delete(entry.key);
    }
  }

  async putGroups(groups: readonly Group[]): Promise<void> {
    if (groups.length === 0) return;
    let tx = this.kv.atomic();
    for (const g of groups) tx = tx.set(keys.group(g.eventId, g.id), g);
    const r = await tx.commit();
    if (!r.ok) throw new Error("group write failed");
  }

  async listGroups(eventId: EventId): Promise<Group[]> {
    const out: Group[] = [];
    for await (const e of this.kv.list<Group>({
      prefix: keys.groupsByEvent(eventId),
    })) {
      out.push(e.value);
    }
    return out;
  }

  async getMembership(
    eventId: EventId,
    participantId: ParticipantId,
  ): Promise<Membership | null> {
    const r = await this.kv.get<Membership>(
      keys.membership(eventId, participantId),
    );
    return r.value;
  }

  async putForm(form: Form): Promise<void> {
    await this.kv.set(keys.form(form.eventId, form.id), form);
  }

  async listForms(eventId: EventId): Promise<Form[]> {
    const out: Form[] = [];
    for await (const e of this.kv.list<Form>({
      prefix: keys.formsByEvent(eventId),
    })) {
      out.push(e.value);
    }
    return out;
  }

  async putResponse(r: Response): Promise<void> {
    await this.kv.set(keys.response(r.eventId, r.id), r);
  }

  async putPresence(p: Presence): Promise<void> {
    await this.kv.set(keys.presence(p.eventId, p.participantId), p, {
      expireIn: 120_000,
    });
  }

  async listResponses(eventId: EventId): Promise<Response[]> {
    const out: Response[] = [];
    for await (const e of this.kv.list<Response>({
      prefix: keys.responsesByEvent(eventId),
    })) {
      out.push(e.value);
    }
    return out;
  }

  async listPresence(eventId: EventId): Promise<Presence[]> {
    const out: Presence[] = [];
    for await (const e of this.kv.list<Presence>({
      prefix: keys.presenceByEvent(eventId),
    })) {
      out.push(e.value);
    }
    return out;
  }

  async summarizePresence(eventId: EventId): Promise<{
    online: number;
    away: number;
    offline: number;
  }> {
    const now = Date.now();
    const presences = await this.listPresence(eventId);
    let online = 0;
    let away = 0;
    let offline = 0;
    for (const p of presences) {
      const age = now - p.lastSeenAt;
      const status: PresenceStatus =
        age >= 60_000 ? "offline" : age >= 30_000 ? "away" : "online";
      if (status === "online") online++;
      else if (status === "away") away++;
      else offline++;
    }
    return { online, away, offline };
  }

  async appendOutbox(
    eventId: EventId,
    message: unknown,
  ): Promise<{ seq: string }> {
    const seq = `${Date.now().toString(36)}_${crypto.randomUUID()}`;
    await this.kv.set(keys.outbox(eventId, seq), message, {
      expireIn: 300_000,
    });
    return { seq };
  }
}

export async function openStore(): Promise<Store> {
  const kv = await Deno.openKv();
  return new Store(kv);
}
