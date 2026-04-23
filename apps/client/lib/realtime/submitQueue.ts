import type { RealtimeClient } from "./client.ts";

interface QueuedMessage<T = unknown> {
  type: string;
  payload: T;
  queuedAt: number;
}

const STORAGE_KEY = "breakout:queue";

export class SubmitQueue {
  private queue: QueuedMessage[] = [];

  constructor(private readonly client: RealtimeClient) {
    this.queue = readFromStorage();
  }

  enqueue<T>(type: string, payload: T): void {
    this.queue.push({ type, payload, queuedAt: Date.now() });
    persist(this.queue);
    this.drain();
  }

  drain(): void {
    while (this.queue.length > 0) {
      const [next] = this.queue;
      if (!next) break;
      if (!this.client.send(next.type, next.payload)) break;
      this.queue.shift();
    }
    persist(this.queue);
  }

  pending(): number {
    return this.queue.length;
  }
}

function readFromStorage(): QueuedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMessage[];
  } catch {
    return [];
  }
}

function persist(q: QueuedMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch {
    // storage full - drop oldest
  }
}
