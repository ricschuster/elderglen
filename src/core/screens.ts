// The host's book of open screens (note 108, group 1): which screen each player has open, the
// one-at-a-time locks, and the "where the player stands" check. Held on the host, never saved.
// Free of Phaser and the DOM.
import { maps } from "../content/maps";
import { resolveMapId, farmMapOf, isFarmMap } from "./farmtypes";
import { furnitureById } from "./furniture";
import { isCampFloor, mineMapId } from "./mines";
import type { PlayerId } from "./players";
import type { GameState } from "./save";
import { pondAt } from "./pond";
import { POND_FOOTPRINT } from "./pondsite";
import { isShopStock } from "./shopoffers";
import { marketHolds, stallOf } from "./nightmarket";

/** A screen a player opened: the kind of screen and the service tile it opened from. */
export interface ScreenRef {
  /**
   * "shop", "market", "bin", "chest", "camp-chest", "crafting" (a workbench), "cooking", "furnace", "keeper",
   * "coop-bench", "barn-bench" or "pond" (x and y are then the pond's top left tile).
   */
  kind: string;
  map: string;
  x: number;
  y: number;
  /** A shop's special counter (`ShopStock`), or a market stall's id. */
  stock?: string;
  /** The ore bin (kind "bin" only). */
  ore?: boolean;
  /** The mine floor of a camp chest. */
  floor?: number;
}

/** Screens only one player may use at a time (note 108 rule 2). */
export const LOCKED_KINDS: readonly string[] = [
  "chest",
  "camp-chest",
  "furnace",
  "pond",
];

/** The service kinds a screen kind may open from, on a registered map. */
const SERVICES: Record<string, string[]> = {
  shop: [
    "shop",
    "fisher-shop",
    "pin-stall",
    "herb-stall",
    "hermit",
    "trader",
    "rain-seller",
  ],
  market: ["market-stall"],
  bin: ["bin", "ore-bin"],
  cooking: ["cooking"],
  furnace: ["furnace"],
  keeper: ["keeper"],
  "coop-bench": ["coop-bench"],
  "barn-bench": ["barn-bench"],
};

/** How near, in tiles, a player must be to a service tile to open or use it (the host's Use reach, with a step of slack for lag). */
export const REACH_TILES = 2;

export const LOCKED_LINE = "Someone is using this chest.";

/** What a refused open says for a locked screen of this kind. */
export const lockedLine = (kind: string): string =>
  kind === "furnace"
    ? "Someone is using the furnace."
    : kind === "pond"
      ? "Someone is using the pond."
      : LOCKED_LINE;

export interface Standing {
  x: number;
  y: number;
  map: string;
}

const isInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v);

/** A well-formed ref from untrusted JSON, or undefined. */
export function parseRef(raw: unknown): ScreenRef | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.kind !== "string" || typeof o.map !== "string") return undefined;
  if (!isInt(o.x) || !isInt(o.y)) return undefined;
  const ref: ScreenRef = { kind: o.kind, map: o.map, x: o.x, y: o.y };
  if (o.stock !== undefined) {
    if (typeof o.stock !== "string") return undefined;
    ref.stock = o.stock;
  }
  if (o.ore !== undefined) {
    if (typeof o.ore !== "boolean") return undefined;
    ref.ore = o.ore;
  }
  if (o.floor !== undefined) {
    if (!isInt(o.floor)) return undefined;
    ref.floor = o.floor;
  }
  return ref;
}

/** Why a screen cannot be opened from this tile, or undefined if it can. */
export function refProblem(g: GameState, ref: ScreenRef): string | undefined {
  switch (ref.kind) {
    case "chest":
      return g.chests.get(ref.map, ref.x, ref.y) ? undefined : "no chest there";
    case "camp-chest":
      return ref.floor !== undefined &&
        isCampFloor(ref.floor) &&
        ref.map === mineMapId(ref.floor)
        ? undefined
        : "no camp chest there";
    case "pond":
      // The ref names the pond's top left tile on the farm map.
      return isFarmMap(ref.map) && pondAt(g, ref.x, ref.y)
        ? undefined
        : "no pond there";
    case "crafting": {
      // A workbench: the furniture piece on a house tile (the pause menu's crafting has no screen to open).
      const piece = g.furniture.at(ref.map, ref.x, ref.y);
      return furnitureById(piece)?.station === "workbench"
        ? undefined
        : "no workbench there";
    }
    case "shop":
    case "market":
    case "cooking":
    case "furnace":
    case "keeper":
    case "coop-bench":
    case "barn-bench":
    case "bin": {
      let svc: { kind: string; id: string } | undefined;
      try {
        svc = serviceOn(g, ref.map, ref.x, ref.y);
        if (ref.kind === "market") {
          const id = svc?.id;
          if (!id || !stallOf(id) || stallOf(id) !== ref.stock)
            return "no stall there";
        }
      } catch {
        // A map the registry lacks (a mine floor): only the ore bin stands on one.
        return ref.kind === "bin" && ref.ore === true && mineFloorMap(ref.map)
          ? undefined
          : "no service there";
      }
      const kind = svc?.kind;
      if (!kind || !SERVICES[ref.kind]!.includes(kind))
        return "no service there";
      if (ref.kind === "bin" && (kind === "ore-bin") !== (ref.ore === true))
        return "no service there";
      if (ref.kind === "shop" && ref.stock !== undefined) {
        if (!isShopStock(ref.stock)) return "no service there";
      }
      return undefined;
    }
    default:
      return "unknown screen";
  }
}

/**
 * The service on a tile of a registered map, at any building tier, with the Night Market's stalls
 * standing when it is a market day. Throws when the registry has no such map.
 */
function serviceOn(
  g: GameState,
  map: string,
  x: number,
  y: number,
): { kind: string; id: string } | undefined {
  const id = resolveMapId(map, g.farmType);
  const holds = new Set(marketHolds(g.day.clock.day));
  for (let tier = 0; tier <= maps.maxTier(id); tier++) {
    const s = maps.getWith(id, holds, tier).serviceAt(x, y);
    if (s) return s;
  }
  return undefined;
}

const mineFloorMap = (map: string): boolean => /^mine-\d+$/.test(map);

/** True when the player stands within reach of the ref's tile, on its map. */
export function inReach(g: GameState, at: Standing, ref: ScreenRef): boolean {
  const same = (a: string, b: string) =>
    resolveMapId(a, g.farmType) === resolveMapId(b, g.farmType);
  if (!same(at.map, ref.map)) return false;
  // A camp chest's tile is made with the floor, so only the floor is checked.
  if (ref.kind === "camp-chest") return true;
  let ts = farmMapOf(g).tileSize;
  try {
    ts = maps.get(resolveMapId(ref.map, g.farmType)).tileSize;
  } catch {
    // keep the farm's tile size
  }
  const tx = Math.floor(at.x / ts);
  const ty = Math.floor(at.y / ts);
  // A pond is the whole of its footprint: the nearest of its tiles counts.
  const w = ref.kind === "pond" ? POND_FOOTPRINT.w : 1;
  const h = ref.kind === "pond" ? POND_FOOTPRINT.h : 1;
  const dx = Math.max(ref.x - tx, 0, tx - (ref.x + w - 1));
  const dy = Math.max(ref.y - ty, 0, ty - (ref.y + h - 1));
  return Math.max(dx, dy) <= REACH_TILES;
}

const lockKey = (g: GameState, ref: ScreenRef): string =>
  ref.kind === "camp-chest"
    ? `camp:${ref.floor}`
    : `${resolveMapId(ref.map, g.farmType)}:${ref.x},${ref.y}`;

/** Open screens and their locks. */
export class Screens {
  private readonly opened = new Map<PlayerId, ScreenRef>();
  private readonly locks = new Map<string, PlayerId>();

  /** The screen a player has open, if any. */
  current(by: PlayerId): ScreenRef | undefined {
    return this.opened.get(by);
  }

  /** Who holds the lock on this screen, if anyone. */
  holder(g: GameState, ref: ScreenRef): PlayerId | undefined {
    return this.locks.get(lockKey(g, ref));
  }

  /**
   * Open a screen for a player: check the service and the reach (when `at` is known), take the
   * lock if the screen has one. An earlier screen of theirs is closed first. Returns a refusal.
   */
  open(
    g: GameState,
    by: PlayerId,
    ref: ScreenRef,
    at: Standing | undefined,
  ): string | undefined {
    const bad = refProblem(g, ref);
    if (bad) return bad;
    if (at && !inReach(g, at, ref)) return "too far away";
    if (LOCKED_KINDS.includes(ref.kind)) {
      const key = lockKey(g, ref);
      const held = this.locks.get(key);
      if (held !== undefined && held !== by) return lockedLine(ref.kind);
      this.close(by);
      this.locks.set(key, by);
    } else this.close(by);
    this.opened.set(by, ref);
    return undefined;
  }

  /** Close a player's screen and free its lock. */
  close(by: PlayerId): void {
    this.opened.delete(by);
    for (const [k, v] of this.locks) if (v === by) this.locks.delete(k);
  }

  /** A player left or dropped: every lock they held is freed (note 108 rule 2). */
  release(by: PlayerId): void {
    this.close(by);
  }
}
