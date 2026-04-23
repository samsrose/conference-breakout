import { Hono } from "hono";
import { logger } from "hono/logger";
import { loadConfig } from "./config.ts";
import { Store } from "./kv/store.ts";
import { Hub } from "./ws/hub.ts";
import { Broadcaster } from "./ws/broadcaster.ts";
import { buildHttpRouter } from "./http/routes.ts";
import { upgradeWebSocket } from "./ws/gateway.ts";
import { startPresenceSweeper } from "./systems/presenceSweeper.ts";
import { securityHeaders } from "./security/headers.ts";
import { IpLimiter, extractIp } from "./security/ipLimiter.ts";

const config = loadConfig();
const kv = await Deno.openKv();
const store = new Store(kv);
const hub = new Hub();
const broadcaster = new Broadcaster(hub, store);
const ipLimiter = new IpLimiter(config.maxConnectionsPerIp);

const app = new Hono();
app.use("*", logger());
app.use("*", securityHeaders());

app.route("/", buildHttpRouter(config, store, kv));

app.get("/ws", (c) => {
  const upgrade = c.req.header("upgrade");
  if (upgrade?.toLowerCase() !== "websocket") {
    return c.text("expected websocket upgrade", 426);
  }
  const ip = extractIp(c.req.raw);
  if (!ipLimiter.tryAcquire(ip)) {
    return c.text("too many connections", 429);
  }
  return upgradeWebSocket(c, {
    config,
    store,
    hub,
    broadcaster,
    onClose: () => ipLimiter.release(ip),
  });
});

startPresenceSweeper(store, broadcaster, hub);

console.log(`[realtime] listening on :${config.port}`);
Deno.serve({ port: config.port }, app.fetch);
