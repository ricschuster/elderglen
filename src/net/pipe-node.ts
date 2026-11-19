// SocketPipe on node:http, for the Node test host and the Electron main process
// (ADR 0015). Node only: never import this from a scene.
import { createSocket, type Socket } from "node:dgram";
import { ANNOUNCE_MS, DISCOVERY_PORT } from "./announce";
import type { ConnId, PipeEvents, PipeListening, SocketPipe } from "./pipe";
import { listen, type WsClient, type WsServer } from "./wsserver";

export interface NodePipeOptions {
  /** UDP discovery port (tests use a random one). */
  discoveryPort?: number;
  /** Where announcements go (tests use 127.0.0.1). */
  broadcastAddress?: string;
}

export class NodePipe implements SocketPipe {
  private announcer: { sock: Socket; timer?: NodeJS.Timeout } | undefined;
  private readonly listeners = new Set<Socket>();

  constructor(private readonly o: NodePipeOptions = {}) {}

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

  announce(text: string | undefined): void {
    const old = this.announcer;
    this.announcer = undefined;
    if (old) {
      clearInterval(old.timer);
      old.sock.close();
    }
    if (text === undefined) return;
    const sock = createSocket("udp4");
    const mine: { sock: Socket; timer?: NodeJS.Timeout } = { sock };
    this.announcer = mine;
    sock.on("error", () => {});
    sock.bind(0, () => {
      if (this.announcer !== mine) return;
      sock.setBroadcast(true);
      const send = () =>
        sock.send(
          text,
          this.o.discoveryPort ?? DISCOVERY_PORT,
          this.o.broadcastAddress ?? "255.255.255.255",
          () => {},
        );
      send();
      mine.timer = setInterval(send, ANNOUNCE_MS);
    });
  }

  discover(cb: (text: string, from: string) => void): () => void {
    const sock = createSocket({ type: "udp4", reuseAddr: true });
    sock.on("error", () => {});
    sock.on("message", (m, r) => cb(m.toString(), r.address));
    sock.bind(this.o.discoveryPort ?? DISCOVERY_PORT);
    this.listeners.add(sock);
    return () => {
      this.listeners.delete(sock);
      sock.close();
    };
  }

  async stop(): Promise<void> {
    this.announce(undefined);
    for (const l of this.listeners) l.close();
    this.listeners.clear();
    const s = this.server;
    this.server = undefined;
    await s?.close();
  }
}
