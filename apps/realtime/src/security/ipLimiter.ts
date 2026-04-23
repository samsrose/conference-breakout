export class IpLimiter {
  private readonly counts = new Map<string, number>();

  constructor(private readonly max: number) {}

  tryAcquire(ip: string): boolean {
    const current = this.counts.get(ip) ?? 0;
    if (current >= this.max) return false;
    this.counts.set(ip, current + 1);
    return true;
  }

  release(ip: string): void {
    const current = this.counts.get(ip) ?? 0;
    if (current <= 1) this.counts.delete(ip);
    else this.counts.set(ip, current - 1);
  }
}

export function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
