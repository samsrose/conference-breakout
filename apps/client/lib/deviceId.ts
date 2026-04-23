const KEY = "breakout:deviceId";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "ssr-device";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id =
    "dev_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24);
  window.localStorage.setItem(KEY, id);
  return id;
}
