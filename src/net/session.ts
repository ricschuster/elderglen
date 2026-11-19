// The multiplayer session the farm reads (note 53, step 8). Phaser-free: the scene asks it
// where the other players are, tells it where this player is, and lets it drive the guest's
// clock. A host runs the Room over the same GameState it plays; a guest holds a GuestClient
// and a copy of the farm. One session at a time, kept at module level so it survives the
// scene restarts a map change makes.
import { DAY_START } from "../core/clock";
import { cabinSpawnTile } from "../core/cabins";
import { farmMapOf } from "../core/farmtypes";
import { LOCAL_PLAYER, type PlayerId } from "../core/players";
import type { PlayerInfo, PosRow } from "../core/protocol";
import { GameRoomWorld } from "../core/roomworld";
import { deserialize, type GameState } from "../core/save";
import type { GuestClient } from "./client";
import type { SocketPipe } from "./pipe";
import { RoomHost } from "./roomhost";

/** How often a guest reports its position, in ms (about 10 Hz). */
export const POS_INTERVAL_MS = 100;

/** Another player, as the farm draws them. x and y are pixels, as the scene keeps them. */
export interface RemotePlayer {
  id: PlayerId;
  name: string;
  x: number;
  y: number;
  map: string;
  dir: number;
}

/** Where this player stands, in the scene's pixels. */
export interface LocalPos {
  x: number;
  y: number;
  map: string;
  dir: number;
}

export interface NetSession {
  readonly role: "host" | "guest";
  readonly localId: PlayerId;
  /** False for a guest until intents exist: they can only walk and look. */
  readonly canAct: boolean;
  /** Everyone but this player. */
  remotes(): RemotePlayer[];
  /** Call every frame with `performance.now()`; the guest sends at most every POS_INTERVAL_MS. */
  reportPosition(p: LocalPos, nowMs: number): void;
  close(): void;
}

/** Turn position rows and the player list into other players, skipping `localId`. Pure. */
export function remotesFrom(
  rows: Record<PlayerId, PosRow>,
  infos: Iterable<PlayerInfo>,
  localId: PlayerId,
): RemotePlayer[] {
  const names = new Map<PlayerId, string>();
  for (const i of infos) names.set(i.id, i.name);
  const out: RemotePlayer[] = [];
  for (const [id, r] of Object.entries(rows)) {
    if (id === localId) continue;
    out.push({
      id,
      name: names.get(id) ?? id,
      x: r[0],
      y: r[1],
      map: r[3],
      dir: r[4],
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export class HostSession implements NetSession {
  readonly role = "host";
  readonly localId = LOCAL_PLAYER;
  readonly canAct = true;

  constructor(
    readonly host: RoomHost,
    readonly world: GameRoomWorld,
  ) {}

  remotes(): RemotePlayer[] {
    const room = this.host.room;
    return remotesFrom(room.positions(), room.info(), LOCAL_PLAYER);
  }

  reportPosition(p: LocalPos, nowMs: number): void {
    this.host.room.receive(LOCAL_PLAYER, {
      t: "pos",
      x: p.x,
      y: p.y,
      map: p.map,
      dir: p.dir,
      ts: nowMs,
    });
  }

  close(): void {
    void this.host.close();
  }
}

export class GuestSession implements NetSession {
  readonly role = "guest";
  readonly canAct = false;
  private lastSent = -Infinity;

  constructor(readonly client: GuestClient) {}

  get localId(): PlayerId {
    return this.client.id;
  }

  /** True once the host is gone. */
  get closed(): boolean {
    return this.client.closed;
  }

  remotes(): RemotePlayer[] {
    return remotesFrom(
      this.client.positions,
      this.client.players.values(),
      this.client.id,
    );
  }

  reportPosition(p: LocalPos, nowMs: number): void {
    if (nowMs - this.lastSent < POS_INTERVAL_MS) return;
    this.lastSent = nowMs;
    this.client.sendPos(p.x, p.y, p.map, p.dir);
  }

  /** The guest's copy of the farm from the host's `farm` message, or undefined if unreadable. */
  loadFarm(): GameState | undefined {
    const g = deserialize(this.client.farm);
    if (g && g.players.has(this.client.id)) g.players.localId = this.client.id;
    return g;
  }

  /** The tile to start on: beside the guest's cabin, else the map's entry (undefined). */
  spawnTile(): { x: number; y: number } | undefined {
    return this.client.home ? cabinSpawnTile(this.client.home) : undefined;
  }

  /**
   * Make the guest's clock follow the host's `day` message. Returns true if the day moved. The
   * guest does not run its own clock: the minutes wait at the morning until the host sends them.
   */
  followDay(clock: { day: number; minutes: number }): boolean {
    const min = this.client.minutes;
    if (this.client.day !== clock.day) {
      clock.day = this.client.day;
      clock.minutes = min ?? DAY_START;
      return true;
    }
    if (min !== undefined && min !== clock.minutes) {
      clock.minutes = min;
      return true;
    }
    return false;
  }

  /** Run `fn` once when the host is gone; at once if it already is. */
  onHostLost(fn: () => void): void {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      fn();
    };
    this.client.onClose = once;
    if (this.client.closed) once();
  }

  close(): void {
    this.client.leave();
  }
}

export interface HostSessionDeps {
  /** A fresh pipe for this hosting session. */
  makePipe: () => SocketPipe;
  /** The name shown in the game list. */
  announceName: string;
  hostName?: string;
  port?: number;
  tickHz?: number;
}

/**
 * Host the farm being played: the Room judges the same `GameState` the host walks around in.
 * Cabins are free for now (a multiplayer start): there is no screen to buy one yet.
 */
export async function startHostSession(
  state: GameState,
  deps: HostSessionDeps,
): Promise<HostSession> {
  const map = farmMapOf(state);
  const world = new GameRoomWorld(state, {
    origin: "multiplayer-start",
    cabinArea: { x: 0, y: 0, w: map.width, h: map.height },
    blocked: (x, y) => map.isBlocked(x, y),
  });
  const host = await RoomHost.start({
    world,
    pipe: deps.makePipe(),
    port: deps.port,
    tickHz: deps.tickHz,
    hostName: deps.hostName,
    announceName: deps.announceName,
  });
  return new HostSession(host, world);
}

export const HOST_LOST_NOTICE = "The host left, so the game ended.";

let lostNotice: string | undefined;

/** Leave a short note for the Title: read once by `takeLostNotice`. */
export function noteHostLost(): void {
  lostNotice = HOST_LOST_NOTICE;
}

/** The note left by `noteHostLost`, once; undefined if none. */
export function takeLostNotice(): string | undefined {
  const n = lostNotice;
  lostNotice = undefined;
  return n;
}

let current: NetSession | undefined;

export function currentSession(): NetSession | undefined {
  return current;
}

/** Make `s` the session, closing any earlier one. */
export function setSession(s: NetSession | undefined): void {
  if (current && current !== s) current.close();
  current = s;
}

/** True when this player is a guest and must not change the world (no intents yet). */
export function isGuest(): boolean {
  return current !== undefined && !current.canAct;
}
