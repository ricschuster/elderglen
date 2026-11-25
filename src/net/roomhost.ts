// The host's socket side: runs a Room over a SocketPipe (note 53, ADR 0015). Browser safe, so
// it runs in the page on desktop and tablet. The Room stays the judge; this file only moves
// messages between connections and the Room.
import { Room, type RoomWorld } from "../core/room";
import { LOCAL_PLAYER, type PlayerId } from "../core/players";
import { decodeClient, encode, type ServerMsg } from "../core/protocol";
import { encodeAnnounce } from "./announce";
import type { ConnId, PipeListening, SocketPipe } from "./pipe";

export interface RoomHostOptions {
  world: RoomWorld;
  pipe: SocketPipe;
  hostName?: string;
  /** 0 (default) picks a free port. */
  port?: number;
  /** Ticks a second (default 10, the spike's rate). */
  tickHz?: number;
  maxPlayers?: number;
  /** Announce this game on the local network under this name (needs a pipe that can). */
  announceName?: string;
  /** Test only: delay every message in each direction by this many ms. */
  latencyMs?: number;
  /** Messages the Room queued for the host's own player (p1) each tick. */
  onHostMessages?: (msgs: ServerMsg[]) => void;
}

export class RoomHost {
  readonly room: Room;
  private readonly conns = new Map<PlayerId, ConnId>();
  private listening: PipeListening = { port: 0 };
  private readonly gameId = Math.random().toString(36).slice(2, 10);
  private lastAnnounce = "";
  private closed = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastTick = performance.now();
  /** Sum and count of tick work in ms, for load checks. */
  busyMs = 0;
  ticks = 0;

  private constructor(
    private readonly opts: RoomHostOptions,
    private readonly pipe: SocketPipe = opts.pipe,
  ) {
    this.room = new Room(opts.world, opts.hostName, opts.maxPlayers);
  }

  static async start(opts: RoomHostOptions): Promise<RoomHost> {
    const host = new RoomHost(opts);
    const ids = new Map<ConnId, PlayerId>();
    const lat = opts.latencyMs ?? 0;
    const later = (fn: () => void) => (lat > 0 ? setTimeout(fn, lat) : fn());
    host.listening = await host.pipe.listen(opts.port ?? 0, {
      onMessage(c, text) {
        later(() => {
          const msg = decodeClient(text);
          if (!msg) return;
          const id = ids.get(c);
          if (msg.t === "join") {
            if (id) return;
            const joined = host.room.join(msg.name, msg.id, msg.settings);
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
              setTimeout(() => host.pipe.close(c), lat + 20);
              return;
            }
            ids.set(c, joined);
            host.conns.set(joined, c);
          } else if (id) host.room.receive(id, msg);
          host.flush();
          host.refreshAnnounce();
        });
      },
      onClose(c) {
        const id = ids.get(c);
        ids.delete(c);
        if (id && host.conns.get(id) === c) {
          host.conns.delete(id);
          host.room.disconnect(id);
          host.flush();
          host.refreshAnnounce();
        }
      },
    });
    host.refreshAnnounce();
    host.timer = setInterval(() => host.tick(), 1000 / (opts.tickHz ?? 10));
    return host;
  }

  get port(): number {
    return this.listening.port;
  }

  /** Tell the network about this game; sends again at once when the player count changed. */
  private refreshAnnounce(): void {
    const name = this.opts.announceName;
    if (this.closed || name === undefined || !this.pipe.announce) return;
    const text = encodeAnnounce({
      id: this.gameId,
      name,
      port: this.port,
      players: this.room.connectedIds.length,
      maxPlayers: this.room.maxPlayers,
    });
    if (text === this.lastAnnounce) return;
    this.lastAnnounce = text;
    this.pipe.announce(text);
  }

  /** The device's LAN address, when the pipe knows it. */
  get address(): string | undefined {
    return this.listening.address;
  }

  private sendTo(c: ConnId, msg: ServerMsg, lat: number): void {
    const text = encode(msg);
    if (lat > 0) setTimeout(() => this.pipe.send(c, text), lat);
    else this.pipe.send(c, text);
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
    this.closed = true;
    await this.pipe.stop();
  }
}
