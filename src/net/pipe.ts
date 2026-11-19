// The one interface between the host's Room and the native socket code (ADR 0015).
// Browser safe: no Node imports. The Room and the world stay in the page; a pipe only
// listens, moves text, and (later) announces the game on the local network.
export type ConnId = number;

export interface PipeEvents {
  onOpen?(c: ConnId): void;
  onMessage(c: ConnId, text: string): void;
  onClose?(c: ConnId): void;
}

export interface PipeListening {
  port: number;
  /** The device's LAN address, when the pipe knows it (the Host screen shows it). */
  address?: string;
}

export interface SocketPipe {
  /** Listen on `port` (0 picks a free one). Events arrive until `stop`. */
  listen(port: number, events: PipeEvents): Promise<PipeListening>;
  send(c: ConnId, text: string): void;
  close(c: ConnId): void;
  /** Broadcast this text every ANNOUNCE_MS until called with undefined (or `stop`). Optional. */
  announce?(text: string | undefined): void;
  /** Listen for announcements: `cb(text, sender ip)`. Returns a stop function. Optional. */
  discover?(cb: (text: string, from: string) => void): () => void;
  /** Close every connection and the listener. Safe to call twice. */
  stop(): Promise<void>;
}
