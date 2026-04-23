import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  EventCodeSchema,
  EventMetaSchema,
  type EventId,
  type EventMeta,
  type HostId,
} from "@app/shared-types";
import type { Config } from "../config.ts";
import type { Store } from "../kv/store.ts";
import { HostAuth } from "../auth/hostAuth.ts";
import {
  signHostToken,
  signParticipantToken,
  verifyToken,
} from "../auth/jwt.ts";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
const LoginSchema = RegisterSchema;
const CreateEventSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  title: z.string().min(1).max(120),
});
const JoinSchema = z.object({
  code: EventCodeSchema,
  displayName: z.string().min(1).max(60),
  deviceId: z.string().min(8).max(64),
});

export function buildHttpRouter(
  config: Config,
  store: Store,
  kv: Deno.Kv,
): Hono {
  const app = new Hono();
  const auth = new HostAuth(kv, config.jwtSecret);

  app.use(
    "*",
    cors({
      origin: config.allowedOrigins as string[],
      credentials: true,
      allowHeaders: ["content-type", "authorization"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      maxAge: 600,
    }),
  );

  app.get("/healthz", (c) => c.json({ ok: true }));

  app.post("/host/register", async (c) => {
    const body = RegisterSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ error: body.error.message }, 400);
    try {
      const rec = await auth.register(body.data.email, body.data.password);
      return c.json({ id: rec.id, email: rec.email });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 409);
    }
  });

  app.post("/host/login", async (c) => {
    const body = LoginSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ error: body.error.message }, 400);
    const rec = await auth.login(body.data.email, body.data.password);
    if (!rec) return c.json({ error: "invalid credentials" }, 401);
    return c.json({ id: rec.id, email: rec.email });
  });

  app.post("/host/events", async (c) => {
    const body = CreateEventSchema.safeParse(
      await c.req.json().catch(() => ({})),
    );
    if (!body.success) return c.json({ error: body.error.message }, 400);
    const rec = await auth.login(body.data.email, body.data.password);
    if (!rec) return c.json({ error: "unauthenticated" }, 401);

    const eventId = newId("evt") as unknown as EventId;
    const code = generateEventCode();
    const meta: EventMeta = EventMetaSchema.parse({
      id: eventId,
      code,
      title: body.data.title,
      hostId: rec.id,
      phase: "lobby",
      createdAt: Date.now(),
    });
    await store.createEvent(meta);
    const token = await signHostToken(config.jwtSecret, {
      sub: rec.id as HostId,
      email: rec.email,
      eventId,
    });
    return c.json({ event: meta, token });
  });

  app.post("/participant/join", async (c) => {
    const body = JoinSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ error: body.error.message }, 400);
    const event = await store.findEventByCode(body.data.code);
    if (!event) return c.json({ error: "event not found" }, 404);
    if (event.phase === "closed") {
      return c.json({ error: "event closed" }, 410);
    }
    const participantId = `part_${body.data.deviceId}`.slice(0, 48);
    const token = await signParticipantToken(config.jwtSecret, {
      sub: participantId as never,
      eventId: event.id,
      deviceId: body.data.deviceId as never,
    });
    return c.json({ event, token, participantId });
  });

  app.get("/debug/verify", async (c) => {
    const t = c.req.query("token");
    if (!t) return c.json({ error: "missing" }, 400);
    try {
      const claims = await verifyToken(config.jwtSecret, t);
      return c.json(claims);
    } catch (e) {
      return c.json({ error: (e as Error).message }, 401);
    }
  });

  return app;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function generateEventCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => {
    let out = "";
    for (let i = 0; i < 4; i++) {
      const r = new Uint8Array(1);
      crypto.getRandomValues(r);
      const byte = r[0] ?? 0;
      out += alphabet[byte % alphabet.length];
    }
    return out;
  };
  return `${pick()}-${pick()}`;
}
