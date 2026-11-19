// SocketPipe on node:http, for the Node test host and the Electron main process
// (ADR 0015). Node only: never import this from a scene.
import type { ConnId, PipeEvents, PipeListening, SocketPipe } from "./pipe";
import { listen, type WsClient, type WsServer } from "./wsserver";

export class NodePipe implements SocketPipe {
  private server: WsServer | undefined;
  private readonly conns = new Map<ConnId, WsClient>();
  private readonly ids = new Map<WsClient, ConnId>();
  private next = 1;

  async listen(port: number, events: PipeEvents): Promise<PipeListening> {
    const idOf = (c: WsClient): ConnId => {
      let id = this.ids.get(c);
      if (id === undefined) {
        id = this.next++;
        this.ids.set(c, id);
        this.conns.set(id, c);
      }
      return id;
    };
    this.server = await listen(port, {
      onOpen: (c) => events.onOpen?.(idOf(c)),
      onMessage: (c, text) => events.onMessage(idOf(c), text),
      onClose: (c) => {
        const id = idOf(c);
        this.conns.delete(id);
        this.ids.delete(c);
        events.onClose?.(id);
      },
    });
    return { port: this.server.port };
  }

  send(c: ConnId, text: string): void {
    this.conns.get(c)?.send(text);
  }

  close(c: ConnId): void {
    this.conns.get(c)?.close();
  }

  async stop(): Promise<void> {
    const s = this.server;
    this.server = undefined;
    await s?.close();
  }
}
