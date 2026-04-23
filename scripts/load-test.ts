/**
 * Load test: opens N participant WebSockets + 1 host WS against a local realtime
 * server, issues a form, measures per-participant arrival latency of the
 * form.issued broadcast, and prints p50/p95/p99.
 *
 * Usage:
 *   deno run -A --unstable-kv scripts/load-test.ts \
 *     --http=http://localhost:8787 --ws=ws://localhost:8787/ws \
 *     --participants=300
 */

import { decodeServer } from "../packages/protocol/src/index.ts";

interface Args {
  http: string;
  ws: string;
  participants: number;
  hostEmail: string;
  hostPassword: string;
  eventTitle: string;
}

function parseArgs(): Args {
  const map = new Map<string, string>();
  for (const arg of Deno.args) {
    const [k, v] = arg.replace(/^--/, "").split("=");
    if (k && v) map.set(k, v);
  }
  return {
    http: map.get("http") ?? "http://localhost:8787",
    ws: map.get("ws") ?? "ws://localhost:8787/ws",
    participants: Number(map.get("participants") ?? "300"),
    hostEmail: map.get("hostEmail") ?? "loadtest@example.com",
    hostPassword: map.get("hostPassword") ?? "loadtest-password",
    eventTitle: map.get("eventTitle") ?? "Load Test Event",
  };
}

async function registerHost(args: Args): Promise<void> {
  await fetch(`${args.http}/host/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: args.hostEmail, password: args.hostPassword }),
  }).catch(() => undefined);
}

async function createEvent(args: Args) {
  const res = await fetch(`${args.http}/host/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: args.hostEmail,
      password: args.hostPassword,
      title: args.eventTitle,
    }),
  });
  if (!res.ok) throw new Error(`create event failed: ${res.status}`);
  const body = (await res.json()) as {
    event: { id: string; code: string };
    token: string;
  };
  return body;
}

async function joinParticipant(args: Args, code: string, i: number) {
  const deviceId = `dev_load_${i}_${crypto.randomUUID().slice(0, 8)}`;
  const res = await fetch(`${args.http}/participant/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, displayName: `loader ${i}`, deviceId }),
  });
  if (!res.ok) throw new Error(`join ${i} failed: ${res.status}`);
  return (await res.json()) as { token: string };
}

function openSocket(args: Args, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const url = new URL(args.ws);
    url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());
    const timer = setTimeout(() => reject(new Error("open timeout")), 10_000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("ws open error"));
    });
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx] ?? 0;
}

async function main() {
  const args = parseArgs();
  console.log(
    `[load] participants=${args.participants} ws=${args.ws} http=${args.http}`,
  );

  await registerHost(args);
  const { event, token: hostToken } = await createEvent(args);
  console.log(`[load] event ${event.code} (${event.id}) created`);

  const hostWs = await openSocket(args, hostToken);
  console.log("[load] host connected");

  // Connect participants in small batches to avoid file descriptor pressure.
  const BATCH = 25;
  const latencies: number[] = [];
  const receivedBy = new Map<WebSocket, number>();
  const participants: WebSocket[] = [];

  for (let offset = 0; offset < args.participants; offset += BATCH) {
    const batch = Array.from(
      { length: Math.min(BATCH, args.participants - offset) },
      (_, k) => offset + k,
    );
    await Promise.all(
      batch.map(async (i) => {
        const { token } = await joinParticipant(args, event.code, i);
        const ws = await openSocket(args, token);
        ws.addEventListener("message", (ev) => {
          if (typeof ev.data !== "string") return;
          try {
            const { envelope } = decodeServer(ev.data);
            if (envelope.type === "form.issued" && !receivedBy.has(ws)) {
              receivedBy.set(ws, performance.now());
            }
          } catch {
            // ignore
          }
        });
        participants.push(ws);
      }),
    );
    console.log(`[load] connected ${participants.length}/${args.participants}`);
  }

  // Give the server a moment to settle.
  await new Promise((r) => setTimeout(r, 1500));

  const sent = performance.now();
  const form = {
    title: "Load test prompt",
    eventId: event.id,
    questions: [
      {
        kind: "single",
        prompt: "Are you receiving this?",
        required: false,
        options: ["Yes", "No"],
      },
    ],
    target: { kind: "event", eventId: event.id },
  };
  hostWs.send(
    JSON.stringify({
      v: 1,
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: "host.form.issue",
      payload: { form },
    }),
  );

  await new Promise((r) => setTimeout(r, 5000));

  for (const ws of participants) {
    const t = receivedBy.get(ws);
    if (t) latencies.push(t - sent);
  }
  latencies.sort((a, b) => a - b);

  const received = latencies.length;
  const delivery = (received / participants.length) * 100;

  console.log("---");
  console.log(`[load] delivered ${received}/${participants.length} (${delivery.toFixed(1)}%)`);
  console.log(`[load] p50 = ${percentile(latencies, 50).toFixed(1)}ms`);
  console.log(`[load] p95 = ${percentile(latencies, 95).toFixed(1)}ms`);
  console.log(`[load] p99 = ${percentile(latencies, 99).toFixed(1)}ms`);
  console.log(`[load] max = ${(latencies[latencies.length - 1] ?? 0).toFixed(1)}ms`);

  hostWs.close();
  for (const ws of participants) ws.close();
}

if (import.meta.main) {
  await main();
  Deno.exit(0);
}
