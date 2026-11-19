// The host's socket side: runs a Room over real WebSockets (note 53, step 3). Node only.
// The Room stays the judge; this file only moves messages between sockets and the Room.
import { Room, type RoomWorld } from "../core/room";
import { LOCAL_PLAYER, type PlayerId } from "../core/players";
import { decodeClient, encode, type ServerMsg } from "./protocol";
import { listen, type WsClient, type WsServer } from "./wsserver";

export interface NodeHostOptions {
  world: RoomWorld;
  hostName?: string;
  /** 0 (default) picks a free port. */
  port?: number;
  /** Ticks a second (default 10, the spike's rate). */
  tickHz?: number;
  maxPlayers?: number;
  /** Test only: delay every message in each direction by this many ms. */
  latencyMs?: number;
  /** Messages the Room queued for the host's own player (p1) each tick. */
  onHostMessages?: (msgs: ServerMsg[]) => void;
}

export class NodeHost {
  readonly room: Room;
  private readonly conns = new Map<PlayerId, WsClient>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastTick = performance.now();
  /** Sum and count of tick work in ms, for load checks. */
  busyMs = 0;
  ticks = 0;

  private constructor(
    private readonly opts: NodeHostOptions,
    private server?: WsServer,
  ) {
    this.room = new Room(opts.world, opts.hostName, opts.maxPlayers);
  }

  static async start(opts: NodeHostOptions): Promise<NodeHost> {
    const host = new NodeHost(opts);
    const ids = new Map<WsClient, PlayerId>();
    const lat = opts.latencyMs ?? 0;
    const later = (fn: () => void) => (lat > 0 ? setTimeout(fn, lat) : fn());
    host.server = await listen(opts.port ?? 0, {
      onMessage(c, text) {
        later(() => {
          const msg = decodeClient(text);
          if (!msg || !c.open) return;
          const id = ids.get(c);
          if (msg.t === "join") {
            if (id) return;
            const joined = host.room.join(msg.name, msg.id);
            if (!joined) {
              host.sendTo(
                c,
                {
                  t: "refused",
                  reason: host.room.refusal as
                    "full" | "in-use" | "no-free-cabin",
                },
                lat,
              );
              setTimeout(() => c.close(), lat + 20);
              return;
            }
            ids.set(c, joined);
            host.conns.set(joined, c);
          } else if (id) host.room.receive(id, msg);
          host.flush();
        });
      },
      onClose(c) {
        const id = ids.get(c);
        ids.delete(c);
        if (id && host.conns.get(id) === c) {
          host.conns.delete(id);
          host.room.disconnect(id);
          host.flush();
        }
      },
    });
    host.timer = setInterval(() => host.tick(), 1000 / (opts.tickHz ?? 10));
    return host;
  }

  get port(): number {
    return this.server?.port ?? 0;
  }

  private sendTo(c: WsClient, msg: ServerMsg, lat: number): void {
    const text = encode(msg);
    if (lat > 0) setTimeout(() => c.send(text), lat);
    else c.send(text);
  }

  private flush(): void {
    const lat = this.opts.latencyMs ?? 0;
    for (const [id, c] of this.conns)
      for (const m of this.room.drain(id)) this.sendTo(c, m, lat);
  }

  private tick(): void {
    const now = performance.now();
    const t0 = now;
    this.room.tick(now - this.lastTick);
    this.lastTick = now;
    this.flush();
    const mine = this.room.drain(LOCAL_PLAYER);
    if (mine.length) this.opts.onHostMessages?.(mine);
    this.busyMs += performance.now() - t0;
    this.ticks++;
  }

  /** Stop ticking and close every socket. Safe to call twice. */
  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    const s = this.server;
    this.server = undefined;
    await s?.close();
  }
}
