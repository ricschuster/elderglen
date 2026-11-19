// SocketPipe over the ElderHost Capacitor plugin (ADR 0015): the tablet's native WebSocket
// server. Browser safe; it only exists inside the installed Android app.
import { registerPlugin } from "@capacitor/core";
import type { ConnId, PipeEvents, PipeListening, SocketPipe } from "./pipe";

interface ElderHostPlugin {
  listen(o: { port: number }): Promise<PipeListening>;
  send(o: { conn: number; text: string }): Promise<void>;
  close(o: { conn: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: "open" | "message" | "close",
    cb: (e: { conn: number; text?: string }) => void,
  ): Promise<{ remove(): Promise<void> }>;
}

const ElderHost = registerPlugin<ElderHostPlugin>("ElderHost");

export class CapacitorPipe implements SocketPipe {
  private handles: { remove(): Promise<void> }[] = [];

  async listen(port: number, events: PipeEvents): Promise<PipeListening> {
    this.handles = await Promise.all([
      ElderHost.addListener("open", (e) => events.onOpen?.(e.conn)),
      ElderHost.addListener("message", (e) =>
        events.onMessage(e.conn, e.text ?? ""),
      ),
      ElderHost.addListener("close", (e) => events.onClose?.(e.conn)),
    ]);
    return ElderHost.listen({ port });
  }

  send(c: ConnId, text: string): void {
    void ElderHost.send({ conn: c, text });
  }

  close(c: ConnId): void {
    void ElderHost.close({ conn: c });
  }

  async stop(): Promise<void> {
    const hs = this.handles;
    this.handles = [];
    await Promise.all(hs.map((h) => h.remove()));
    await ElderHost.stop();
  }
}
