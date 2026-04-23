import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@app/shared-types", "@app/protocol"],
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_REALTIME_HTTP:
      process.env.NEXT_PUBLIC_REALTIME_HTTP ?? "http://localhost:8787",
    NEXT_PUBLIC_REALTIME_WS:
      process.env.NEXT_PUBLIC_REALTIME_WS ?? "ws://localhost:8787/ws",
  },
};

export default config;
