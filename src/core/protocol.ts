// Message shapes between a guest and the host Room (note 53, step 2). Plain JSON, no socket,
// no Phaser, no DOM. src/net/protocol.ts re-exports these for the socket code.
import type { CreatureSave } from "./creatures";
import type { Pile } from "./ground";
import type { Rock } from "./rocks";
import type { PlayerId, PlayerSave } from "./players";
import type { Spot } from "./forage";

/** A change to the shared world, as the guest asks for it. The world adapter gives `kind` meaning. */
export interface Intent {
  kind: string;
  [key: string]: unknown;
}

/** Where a player stands: sent every tick, the only per-tick traffic. */
interface PosMsg {
  t: "pos";
  x: number;
  y: number;
  map: string;
  /** Facing, 0 to 3, optional. */
  dir?: number;
  /** Ids of players this client is passing through (the jam rule, JamTracker.isPassing). */
  pass?: PlayerId[];
  /** The guest's own clock in ms, echoed back for latency checks. */
  ts: number;
}

export type ClientMsg =
  | {
      t: "join";
      name: string;
      /** The id given on a first join; sent again to rejoin as the same player. */
      id?: PlayerId;
    }
  | PosMsg
  | { t: "intent"; seq: number; intent: Intent }
  | { t: "away"; away: boolean }
  | { t: "leave" };

/** One player in a snapshot tick: x, y, ts, map, dir, pass. */
export type PosRow = [number, number, number, string, number, PlayerId[]];

/** Protocol version shown in the game list; bump when the messages change shape. */
export const PROTOCOL_VERSION = 1;

export type ServerMsg =
  | {
      t: "hello";
      id: PlayerId;
      day: number;
      players: PlayerInfo[];
      /** Top-left tile of this player's cabin, when the world has one (they spawn beside it). */
      home?: { x: number; y: number };
    }
  /** The whole farm. Sent on join and on a day change to a guest who was away, never per tick. */
  | { t: "farm"; day: number; farm: string }
  /** Every tick: positions only. */
  | { t: "snap"; n: number; p: Record<PlayerId, PosRow>; min?: number }
  /** A world change the host applied. Sent to everyone, so all copies stay equal. */
  | { t: "applied"; seq: number; by: PlayerId; intent: Intent }
  | { t: "rejected"; seq: number; reason: string }
  /** The day rolled over for a guest who is present and not stale (the farm itself is re-sent each night). */
  | { t: "day"; day: number }
  /** The night's report for this guest alone: report lines (marriage news included) and gold lost. */
  | { t: "night"; day: number; lines: string[]; lost: number }
  /** Who is in bed and who is still up, by name, when that changes (the "who is left" notice). */
  | { t: "beds"; asleep: string[]; waiting: string[] }
  | { t: "joined"; player: PlayerInfo }
  | { t: "left"; id: PlayerId }
  /**
   * The ground piles of a map, and for a mine floor its rocks and ladder, sent when they change and when a
   * guest arrives on the map (note 109 rules 2 and 5). The guest's copy takes them as they are.
   */
  | {
      t: "mapstate";
      map: string;
      ground: Pile[];
      floor?: { rocks: Rock[]; ladder?: Spot };
    }
  /** The creatures of a mine floor or map, every tick, to the players on it (note 109 rule 7). */
  | { t: "creatures"; map: string; rows: CreatureSave[] }
  /** One player's own record after the host changed it (a hit, a kill, a catch, a faint): sent to that player. */
  | { t: "player"; id: PlayerId; rec: PlayerSave }
  /** What bit on a cast: the guest's catch screen runs it (note 109, "Fishing"). */
  | {
      t: "bite";
      kind: "none" | "fish" | "lobster" | "trash" | "find";
      /** The fish or item id. */
      item?: string;
    }
  /** The player fainted in a fight: they wake at home, and this is what it cost (note 109 rule 6). */
  | { t: "faint"; gold: number; lost: { id: string; count: number }[] }
  /** The join was turned down; the host then closes the socket. */
  | { t: "refused"; reason: "full" | "in-use" | "no-free-cabin" };

export interface PlayerInfo {
  id: PlayerId;
  name: string;
}

export function encode(msg: ClientMsg | ServerMsg): string {
  return JSON.stringify(msg);
}

/** Parse a client message. Returns undefined for anything malformed. */
export function decodeClient(text: string): ClientMsg | undefined {
  let m: unknown;
  try {
    m = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof m !== "object" || m === null) return undefined;
  const o = m as Record<string, unknown>;
  switch (o.t) {
    case "join":
      return typeof o.name === "string" &&
        (o.id === undefined || typeof o.id === "string")
        ? (m as ClientMsg)
        : undefined;
    case "pos":
      return Number.isFinite(o.x) &&
        Number.isFinite(o.y) &&
        typeof o.map === "string" &&
        Number.isFinite(o.ts)
        ? (m as ClientMsg)
        : undefined;
    case "intent":
      return Number.isInteger(o.seq) &&
        typeof o.intent === "object" &&
        o.intent !== null &&
        typeof (o.intent as Intent).kind === "string"
        ? (m as ClientMsg)
        : undefined;
    case "away":
      return typeof o.away === "boolean" ? (m as ClientMsg) : undefined;
    case "leave":
      return m as ClientMsg;
    default:
      return undefined;
  }
}
