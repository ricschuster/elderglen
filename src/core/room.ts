// The host's room: takes intents from players, steps the world, makes snapshots. No socket
// (note 53). The socket in src/net/ feeds `receive` and sends what `drain` returns.
// Free of Phaser and the DOM.
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type {
  ClientMsg,
  Intent,
  PlayerInfo,
  PosRow,
  ServerMsg,
} from "./protocol";

/** What the room needs from the shared world. `GameRoomWorld` (roomworld.ts) is the adapter over `GameState`. */
export interface RoomWorld {
  /** The current day number. */
  day(): number;
  /** Minutes since midnight on the host's clock, sent in every snapshot so guests follow it. Optional. */
  minutes?(): number;
  /** The whole farm as text (serialize). Only on join and after a day change for an away guest. */
  snapshot(): string;
  /** Apply one intent by a player. Return an error string to reject it. */
  apply(by: PlayerId, intent: Intent): string | undefined;
  /** Step the world by one tick. Optional. */
  step?(dtMs: number): void;
  /**
   * Called before a new guest gets an id: return a reason to refuse them (for example
   * "no-free-cabin"), nothing to admit. Optional.
   */
  admit?(id: PlayerId, name: string): string | undefined;
  /** A guest joined: make their player record. Optional. */
  addPlayer?(id: PlayerId, name: string): void;
  /** A guest dropped: count them as in bed and put their character in their cabin (note 53). Optional. */
  playerDropped?(id: PlayerId): void;
  /** A dropped guest came back: their record is restored by id. Optional. */
  playerRejoined?(id: PlayerId): void;
  /** Who is in bed and who is up, by name, for the "who is left" notice. Optional. */
  bedStatus?(): BedStatus;
  /** The night just ended, once, for the guests' reports. Optional. */
  takeNight?(): NightNews | undefined;
  /** Top-left tile of a player's cabin, sent in `hello` so the guest spawns there. Optional. */
  homeOf?(id: PlayerId): { x: number; y: number } | undefined;
}

/** The bed state of a session, by player name. */
export interface BedStatus {
  asleep: string[];
  waiting: string[];
}

/** What a day end tells each guest: report lines and the gold a pass-out cost them. */
export interface NightNews {
  day: number;
  forGuest(id: PlayerId): { lines: string[]; lost: number };
}

interface Member {
  id: PlayerId;
  name: string;
  connected: boolean;
  /** Not looking at the farm (loading, another screen): needs the full farm on a day change. */
  away: boolean;
  /** Last day this player holds a current farm for. */
  seenDay: number;
  x: number;
  y: number;
  ts: number;
  map: string;
  dir: number;
  pass: PlayerId[];
  out: ServerMsg[];
}

export class Room {
  private readonly members = new Map<PlayerId, Member>();
  private nextNum = 2;
  private tickNo = 0;
  private lastDay: number;
  private lastBeds = JSON.stringify({ asleep: [], waiting: [] });
  /** Why the last `join` returned undefined: "full", "in-use" or the world's `admit` reason. */
  refusal = "full";

  /** The host is player p1 and always present. */
  constructor(
    private readonly world: RoomWorld,
    hostName = "Host",
    readonly maxPlayers = 8,
  ) {
    this.lastDay = world.day();
    this.members.set(LOCAL_PLAYER, this.newMember(LOCAL_PLAYER, hostName));
  }

  private newMember(id: PlayerId, name: string): Member {
    return {
      id,
      name,
      connected: true,
      away: false,
      seenDay: this.world.day(),
      x: 0,
      y: 0,
      ts: 0,
      map: "farm",
      dir: 0,
      pass: [],
      out: [],
    };
  }

  get ids(): PlayerId[] {
    return [...this.members.keys()];
  }

  get connectedIds(): PlayerId[] {
    return [...this.members.values()]
      .filter((m) => m.connected)
      .map((m) => m.id);
  }

  position(id: PlayerId): { x: number; y: number; map: string } | undefined {
    const m = this.members.get(id);
    return m && { x: m.x, y: m.y, map: m.map };
  }

  /**
   * A guest joins, or rejoins with the id it was given. Returns the id, or undefined when the
   * room is full or the id is the host's or is in use by a connected guest.
   */
  join(rawName: string, rejoinId?: PlayerId): PlayerId | undefined {
    const name = this.uniqueName(rawName, rejoinId);
    let m = rejoinId ? this.members.get(rejoinId) : undefined;
    if (rejoinId && (rejoinId === LOCAL_PLAYER || m?.connected)) {
      this.refusal = "in-use";
      return undefined;
    }
    if (m) {
      m.connected = true;
      m.name = name || m.name;
      this.world.playerRejoined?.(m.id);
    } else {
      if (this.members.size >= this.maxPlayers) {
        this.refusal = "full";
        return undefined;
      }
      const why = this.world.admit?.(`p${this.nextNum}`, name);
      if (why !== undefined) {
        this.refusal = why;
        return undefined;
      }
      const id = `p${this.nextNum++}`;
      m = this.newMember(id, name);
      this.members.set(id, m);
      this.world.addPlayer?.(id, name);
    }
    m.away = false;
    m.seenDay = this.world.day();
    m.out.push({
      t: "hello",
      id: m.id,
      day: this.world.day(),
      players: this.info(),
      home: this.world.homeOf?.(m.id),
    });
    m.out.push({
      t: "farm",
      day: this.world.day(),
      farm: this.world.snapshot(),
    });
    this.broadcast({ t: "joined", player: { id: m.id, name: m.name } }, m.id);
    return m.id;
  }

  /** The guest's socket closed. Their record stays so they can rejoin. */
  disconnect(id: PlayerId): void {
    const m = this.members.get(id);
    if (!m || id === LOCAL_PLAYER || !m.connected) return;
    m.connected = false;
    m.pass = [];
    this.world.playerDropped?.(id);
    this.broadcast({ t: "left", id }, id);
  }

  /** Handle one message from a connected player. */
  receive(id: PlayerId, msg: ClientMsg): void {
    const m = this.members.get(id);
    if (!m?.connected) return;
    switch (msg.t) {
      case "pos":
        m.x = msg.x;
        m.y = msg.y;
        m.ts = msg.ts;
        m.map = msg.map;
        m.dir = msg.dir ?? 0;
        // Only known other players can be passed through.
        m.pass = (msg.pass ?? []).filter(
          (p) => p !== id && this.members.has(p),
        );
        break;
      case "intent": {
        const err = this.world.apply(id, msg.intent);
        if (err !== undefined)
          m.out.push({ t: "rejected", seq: msg.seq, reason: err });
        else
          this.broadcast({
            t: "applied",
            seq: msg.seq,
            by: id,
            intent: msg.intent,
          });
        break;
      }
      case "away":
        m.away = msg.away;
        break;
      case "leave":
        this.disconnect(id);
        break;
      case "join":
        break; // joining is done by `join`, before the player has an id
    }
  }

  /** The host's own intent, applied like a guest's. */
  hostIntent(intent: Intent, seq = 0): string | undefined {
    const before = this.members.get(LOCAL_PLAYER)?.out.length ?? 0;
    this.receive(LOCAL_PLAYER, { t: "intent", seq, intent });
    const out = this.members.get(LOCAL_PLAYER)?.out ?? [];
    const rej = out.slice(before).find((o) => o.t === "rejected");
    return rej?.t === "rejected" ? rej.reason : undefined;
  }

  /**
   * One tick: step the world, handle a day change, queue positions for everyone. Positions
   * are the only per-tick traffic; the farm is never sent per tick.
   */
  tick(dtMs: number): void {
    this.world.step?.(dtMs);
    const night = this.world.takeNight?.();
    if (night)
      for (const m of this.members.values())
        if (m.connected && m.id !== LOCAL_PLAYER)
          m.out.push({ t: "night", day: night.day, ...night.forGuest(m.id) });
    const day = this.world.day();
    if (day !== this.lastDay) {
      this.lastDay = day;
      let farm: string | undefined;
      // Every guest gets the farm after a night, so random rolls cannot leave the copies apart.
      for (const m of this.members.values()) {
        if (!m.connected || m.id === LOCAL_PLAYER) continue;
        farm ??= this.world.snapshot();
        m.out.push({ t: "farm", day, farm });
        m.seenDay = day;
      }
    }
    const beds = this.world.bedStatus?.();
    if (beds) {
      const key = JSON.stringify(beds);
      if (key !== this.lastBeds) {
        this.lastBeds = key;
        for (const m of this.members.values())
          if (m.connected && m.id !== LOCAL_PLAYER)
            m.out.push({ t: "beds", ...beds });
      }
    }
    const snap: ServerMsg = {
      t: "snap",
      n: this.tickNo++,
      p: this.positions(),
    };
    const min = this.world.minutes?.();
    if (min !== undefined) snap.min = min;
    this.broadcast(snap);
  }

  /** Messages queued for a player since the last drain, in order. */
  drain(id: PlayerId): ServerMsg[] {
    const m = this.members.get(id);
    if (!m) return [];
    const out = m.out;
    m.out = [];
    return out;
  }

  /** The latest position row of every connected player (the host's own included). */
  positions(): Record<PlayerId, PosRow> {
    const p: Record<PlayerId, PosRow> = {};
    for (const m of this.members.values())
      if (m.connected) p[m.id] = [m.x, m.y, m.ts, m.map, m.dir, m.pass];
    return p;
  }

  /** A name no one else in the room has: a second "Guest" becomes "Guest 2" (the host counts too). */
  private uniqueName(raw: string, selfId?: PlayerId): string {
    const base = raw.trim() || "Guest";
    const taken = new Set<string>();
    for (const m of this.members.values())
      if (m.id !== selfId) taken.add(m.name);
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
    return name;
  }

  /** Connected players, for name labels. */
  info(): PlayerInfo[] {
    return [...this.members.values()]
      .filter((m) => m.connected)
      .map((m) => ({ id: m.id, name: m.name }));
  }

  private broadcast(msg: ServerMsg, except?: PlayerId): void {
    for (const m of this.members.values())
      if (m.connected && m.id !== except) m.out.push(msg);
  }
}
