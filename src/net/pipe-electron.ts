// SocketPipe over the Electron preload bridge (ADR 0015): the desktop counterpart of
// CapacitorPipe. The sockets run in the main process (pipe-electron-main.ts); the page
// only sees `window.elderHost`. Browser safe: no Node and no electron import.
import { DISCOVERY_PORT } from "./announce";
import type { ConnId, PipeEvents, PipeListening, SocketPipe } from "./pipe";

/** One event pushed from the main process to the page. */
export type BridgeEvent =
  | { kind: "open" | "close"; conn: number }
  | { kind: "message"; conn: number; text: string }
  | { kind: "game"; text: string; from: string };

/** What the preload exposes as `window.elderHost`. Nothing else crosses. */
export interface ElderHostBridge {
  listen(port: number): Promise<PipeListening>;
  send(conn: number, text: string): void;
  close(conn: number): void;
  stop(): Promise<void>;
  announce(text: string, port: number): void;
  discoverStart(port: number): void;
  discoverStop(): void;
  /** Subscribe to every event; returns an unsubscribe function. */
  onEvent(cb: (e: BridgeEvent) => void): () => void;
}

/** The bridge, when the page runs inside the Electron wrapper. */
export function findBridge(): ElderHostBridge | undefined {
  return (globalThis as { elderHost?: ElderHostBridge }).elderHost;
}

export class ElectronPipe implements SocketPipe {
  private off: (() => void) | undefined;

  constructor(private readonly bridge: ElderHostBridge) {}

  async listen(port: number, events: PipeEvents): Promise<PipeListening> {
    this.off?.();
    this.off = this.bridge.onEvent((e) => {
      if (e.kind === "open") events.onOpen?.(e.conn);
      else if (e.kind === "message") events.onMessage(e.conn, e.text);
      else if (e.kind === "close") events.onClose?.(e.conn);
    });
    return this.bridge.listen(port);
  }

  send(c: ConnId, text: string): void {
    this.bridge.send(c, text);
  }

  close(c: ConnId): void {
    this.bridge.close(c);
  }

  announce(text: string | undefined): void {
    this.bridge.announce(text ?? "", DISCOVERY_PORT);
  }

  discover(cb: (text: string, from: string) => void): () => void {
    const off = this.bridge.onEvent((e) => {
      if (e.kind === "game") cb(e.text, e.from);
    });
    this.bridge.discoverStart(DISCOVERY_PORT);
    return () => {
      off();
      this.bridge.discoverStop();
    };
  }

  async stop(): Promise<void> {
    this.off?.();
    this.off = undefined;
    await this.bridge.stop();
  }
}
