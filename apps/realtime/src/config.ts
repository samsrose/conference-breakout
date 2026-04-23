export interface Config {
  readonly port: number;
  readonly jwtSecret: string;
  readonly allowedOrigins: readonly string[];
  readonly maxConnectionsPerIp: number;
  readonly msgsPerSecond: number;
  readonly burst: number;
}

export function loadConfig(): Config {
  const port = Number(Deno.env.get("PORT") ?? "8787");
  const jwtSecret =
    Deno.env.get("JWT_SECRET") ?? "dev-secret-change-me-in-prod-32chars!!";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ??
    "http://localhost:3000,http://localhost:3001").split(",");
  return {
    port,
    jwtSecret,
    allowedOrigins: allowed,
    maxConnectionsPerIp: Number(Deno.env.get("MAX_CONN_PER_IP") ?? "50"),
    msgsPerSecond: Number(Deno.env.get("MSGS_PER_SECOND") ?? "20"),
    burst: Number(Deno.env.get("BURST") ?? "40"),
  };
}
