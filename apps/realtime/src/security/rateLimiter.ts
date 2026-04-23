/**
 * In-memory token-bucket rate limiter per socket.
 * One isolate holds each socket's bucket; since a socket's lifetime
 * is scoped to the isolate holding it, this is correct without KV.
 */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly ratePerSecond: number,
    private readonly capacity: number,
  ) {
    this.tokens = capacity;
    this.last = Date.now();
  }

  take(now: number = Date.now(), cost: number = 1): boolean {
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerSecond);
    this.last = now;
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}
