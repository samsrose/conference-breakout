# Conference Breakout

A real-time live-event engagement platform. One **host dashboard** authors and broadcasts forms to an audience of **mobile participants**, shuffles them into breakout groups of 8 and back to plenary, and watches live response rollups — all over a single WebSocket per device.

```
┌──────────────────────┐          ┌───────────────────────────────┐
│  apps/host (Next.js) │ ◀──WSS──▶│  apps/realtime (Deno + Hono)  │
│  apps/client (PWA)   │          │  • WebSocket gateway          │
└──────────────────────┘          │  • ECS world + systems        │
                                  │  • Deno KV (state + fanout)   │
                                  └───────────────────────────────┘
```

## Prerequisites

- Node >= 20
- pnpm >= 9 (`npm i -g pnpm`)
- Deno >= 2 (`brew install deno` or https://deno.com)

## One-time install

```bash
pnpm install
```

Deno has no separate install step; `deno task dev` will fetch remote deps on first run.

## Run the full stack (3 processes)

```bash
pnpm dev
```

This starts, in parallel:

- `apps/host` on http://localhost:3000
- `apps/client` on http://localhost:3001
- `apps/realtime` on http://localhost:8787 (WebSocket at `ws://localhost:8787/ws`)

If you prefer separate terminals:

```bash
pnpm --filter @app/host dev          # terminal 1
pnpm --filter @app/client dev        # terminal 2
cd apps/realtime && deno task dev    # terminal 3
```

## Quick walk-through

1. Open http://localhost:3000 (host) and register/login with any email + 8+ char password.
2. Create an event; you'll see a short `ABCD-1234` code.
3. Open http://localhost:3001 on your phone (or a second browser) and enter the code.
4. Back on the host: author a form and **Issue to event**. Responses stream in live.
5. Click **Partition into groups of 8** to break into breakouts; **Merge** to return to plenary. Each participant's screen updates instantly.

## Running tests

```bash
pnpm --filter @app/ecs test     # ECS system unit tests
cd apps/realtime && deno task typecheck
```

## Load test (300 concurrent sockets)

Start the realtime server, then:

```bash
deno task load-test --participants=300
```

It registers a host, creates an event, opens N participant sockets, fires a `host.form.issue`, and prints p50/p95/p99 arrival latency for the broadcast.

## Architecture in one screen

- **Transport:** plain WebSockets (WSS in production). Broad mobile support, bi-directional, enough for 300 sockets per event per isolate. SSE is one-way; WebTransport lacks iOS support.
- **State:** Deno KV. Keys are strictly namespaced per event (`["event", eventId, ...]`), which encodes least-privilege per-event isolation at the storage layer.
- **Fanout:** in-process `Hub` per isolate (see [apps/realtime/src/ws/hub.ts](apps/realtime/src/ws/hub.ts)). For horizontal scale, subscribe to a per-event KV doorbell key and replay the outbox on wake-up; the `Hub` surface stays the same.
- **Domain model (ECS):** [packages/ecs](packages/ecs) exposes a `World` of component tables plus pure-function systems (`Grouping`, `Broadcast`, `Aggregation`, `Presence`). Handlers build an in-memory world, run systems, and persist the resulting components.
- **Wire contract:** [packages/shared-types](packages/shared-types) owns all Zod schemas; [packages/protocol](packages/protocol) owns the versioned envelope and per-direction message codecs. Both clients and the server validate every payload through the same schemas.

## Security rings

1. **Transport:** WSS + HSTS + CSP `default-src 'none'` + strict CORS allowlist ([apps/realtime/src/security/headers.ts](apps/realtime/src/security/headers.ts))
2. **AuthN:** host email/password → JWT; participant event-code → JWT bound to `eventId` + `deviceId` ([apps/realtime/src/auth](apps/realtime/src/auth))
3. **AuthZ:** role + same-event guards on every message ([apps/realtime/src/security/guards.ts](apps/realtime/src/security/guards.ts))
4. **Input:** every payload Zod-parsed; 64 KB message cap in the codec
5. **Abuse:** token-bucket per socket (20 msg/s default, burst 40) + per-IP connection cap
6. **Data:** per-event KV key prefix + least-privilege store slices

## Environment

Realtime (Deno) reads at startup:

| var | default | notes |
|---|---|---|
| `PORT` | `8787` | HTTP/WS port |
| `JWT_SECRET` | dev placeholder | use a 32-byte random secret in prod |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | comma-separated CORS allowlist |
| `MAX_CONN_PER_IP` | `50` | concurrent WS per IP |
| `MSGS_PER_SECOND` | `20` | per-socket rate-limiter refill |
| `BURST` | `40` | per-socket rate-limiter bucket size |

Next apps read:

- `NEXT_PUBLIC_REALTIME_HTTP` (default `http://localhost:8787`)
- `NEXT_PUBLIC_REALTIME_WS` (default `ws://localhost:8787/ws`)

## Project layout

```
apps/
  host/            Next.js 15 host dashboard (:3000)
  client/          Next.js 15 participant PWA (:3001)
  realtime/        Deno + Hono WS gateway + ECS + KV (:8787)
packages/
  shared-types/    Zod schemas, branded IDs (source-only; TS)
  protocol/        Versioned envelope + message schemas
  ecs/             World, components, systems + Vitest tests
scripts/
  load-test.ts     300-socket broadcast benchmark
changes/changes.txt  Required change log
prompt.txt           Required prompt log
```

## User rules observed

- Every prompt appended to [prompt.txt](prompt.txt)
- Every change appended to [changes/changes.txt](changes/changes.txt)
- Strict TypeScript throughout (`tsconfig.base.json`)
- Ring-level security + ECS domain model as described above
- React code is 100% functional components, split into small, well-named files
