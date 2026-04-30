import {
  decodeServer,
  encode,
  makeEnvelope,
  ServerMessageType,
  type Envelope,
} from "@app/protocol";

export type ServerHandler = (type: string, payload: unknown) => void;

// Error codes from the server that mean "don't bother reconnecting": the
// credentials or referenced resources are invalid and retrying would loop
// forever.
const TERMINAL_ERROR_CODES = new Set([
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "VERSION_MISMATCH",
  "EVENT_CLOSED",
]);

export interface RealtimeClientOptions {
  url: string;
  token: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Error) => void;
  onMessage: ServerHandler;
  onTerminal?: (reason: string) => void;
  heartbeatIntervalMs?: number;
  maxReconnectAttempts?: number;
  /** When true, `phase: closed` ends the socket without reconnect (participant clients). */
  endConnectionWhenEventClosed?: boolean;
}

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private heartbeat: number | null = null;
  private reconnectTimer: number | null = null;
  private closedByUser = false;
  private terminalStop = false;
  private reconnectAttempts = 0;

  constructor(private readonly opts: RealtimeClientOptions) {}

  connect(): void {
    if (this.socket) return;
    const url = new URL(this.opts.url);
    url.searchParams.set("token", this.opts.token);
    const ws = new WebSocket(url.toString());
    this.socket = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.opts.onOpen?.();
      this.startHeartbeat();
    });
    ws.addEventListener("message", (ev) => {
      if (typeof ev.data !== "string") return;
      try {
        const { envelope, payload } = decodeServer(ev.data);
        if (envelope.type === ServerMessageType.Error) {
          const code = (payload as { code?: string } | null)?.code;
          if (code && TERMINAL_ERROR_CODES.has(code)) {
            this.terminalStop = true;
            this.opts.onTerminal?.(code);
          }
        }
        this.opts.onMessage(envelope.type, payload);
        if (
          this.opts.endConnectionWhenEventClosed &&
          envelope.type === ServerMessageType.PhaseChanged &&
          (payload as { phase?: string }).phase === "closed"
        ) {
          this.conclude();
        }
      } catch (err) {
        this.opts.onError?.(err as Error);
      }
    });
    ws.addEventListener("close", (ev) => {
      this.stopHeartbeat();
      this.socket = null;
      this.opts.onClose?.();
      // 1008 (policy violation) → token rejected; don't retry.
      if (ev.code === 1008) {
        this.terminalStop = true;
        this.opts.onTerminal?.("token rejected");
      }
      if (!this.closedByUser && !this.terminalStop) this.scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      this.opts.onError?.(new Error("websocket error"));
    });
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send<T>(type: string, payload: T): boolean {
    const env: Envelope<T> = makeEnvelope(type, payload);
    if (this.isOpen()) {
      this.socket!.send(encode(env));
      return true;
    }
    return false;
  }

  close(): void {
    this.closedByUser = true;
    this.stopHeartbeat();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.socket?.close(1000, "client closing");
    } catch {
      // already closed
    }
    this.socket = null;
  }

  /** Stop reconnects and close (e.g. host ended the event). */
  conclude(): void {
    this.terminalStop = true;
    this.close();
  }

  private startHeartbeat(): void {
    const interval = this.opts.heartbeatIntervalMs ?? 15_000;
    this.heartbeat = Number(
      setInterval(() => this.send("heartbeat", {}), interval),
    );
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private scheduleReconnect(): void {
    const max = this.opts.maxReconnectAttempts ?? 20;
    if (this.reconnectAttempts >= max) {
      this.terminalStop = true;
      this.opts.onTerminal?.("max reconnect attempts reached");
      return;
    }
    this.reconnectAttempts += 1;
    // Exponential backoff with jitter, capped at 15s.
    const base = Math.min(15_000, 500 * 2 ** (this.reconnectAttempts - 1));
    const jitter = Math.random() * 300;
    this.reconnectTimer = Number(
      setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.closedByUser && !this.terminalStop) this.connect();
      }, base + jitter),
    );
  }
}
