import type { GameState } from "./save";

/**
 * The horse (`docs/design/59_horse.md`). Rules only, free of Phaser and the
 * DOM. The stable is a farm building the carpenter places
 * (`animals.ts`, `placement.ts`); the horse comes with it, waits beside it,
 * is named on the first ride, and goes where the player leaves it until the
 * morning. The extras (carrot, horse book, flute, hats) are parked in the note.
 */

/** Where the player left the horse outdoors. Gone each morning. */
export interface Parked {
  map: string;
  x: number;
  y: number;
}

export interface Horse {
  /** Empty until the player names it on the first ride. */
  name: string;
  /** Where it was left today, else it waits beside the stable. */
  parked: Parked | undefined;
}

/**
 * The speed of a rider against the run speed, from the saved Speed page
 * (note 59): 6.6 on the horse over 5 running, placeholder for the first
 * playtest. Our run speed is 5 tiles a second.
 */
export const HORSE_SPEED = 6.6;
export const RUN_SPEED = 5;
export const HORSE_SPEED_FACTOR = HORSE_SPEED / RUN_SPEED;

/** The longest name the player may give. */
export const NAME_MAX = 16;
/** The name used when the player gives none. */
export const DEFAULT_HORSE_NAME = "Clover";

/** Characters a name may hold besides letters and digits: a space, an apostrophe and a hyphen. */
const NAME_PUNCT = " '-";

/**
 * One key of the naming dialog (on screen or on a keyboard) applied to the text
 * so far. A letter is capitalised at the start and after a space. Anything that
 * is not a letter, digit, space, apostrophe or hyphen is ignored, a space is
 * not taken first or doubled, and the text stops growing at the limit.
 */
export function typeName(text: string, key: string): string {
  if (key === "Backspace") return text.slice(0, -1);
  if (key.length !== 1 || text.length >= NAME_MAX) return text;
  if (!/^[\p{L}\p{N}]$/u.test(key) && !NAME_PUNCT.includes(key)) return text;
  if (key === " " && (text === "" || text.endsWith(" "))) return text;
  const up = text === "" || text.endsWith(" ");
  return text + (up ? key.toUpperCase() : key);
}

export function newHorse(): Horse {
  return { name: "", parked: undefined };
}

export function saveHorse(h: Horse): Horse {
  return { name: h.name, parked: h.parked ? { ...h.parked } : undefined };
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Read a saved horse. An old save has none. Anything broken is dropped. */
export function loadHorse(raw: unknown): Horse {
  const out = newHorse();
  if (typeof raw !== "object" || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.name === "string") out.name = cleanName(r.name);
  const p = r.parked as Record<string, unknown> | undefined;
  if (
    p &&
    typeof p.map === "string" &&
    p.map !== "" &&
    isNum(p.x) &&
    isNum(p.y) &&
    p.x >= 0 &&
    p.y >= 0
  )
    out.parked = { map: p.map, x: Math.floor(p.x), y: Math.floor(p.y) };
  return out;
}

/** A name with the extra space trimmed and cut to the limit. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
}

/** True when the player has a stable and so a horse. */
export function hasHorse(g: GameState): boolean {
  return g.animals.stableBuilt;
}

/**
 * True for a map the horse can be ridden on: the map property `rideable`, set
 * on every outdoor valley map (note 71). Doors dismount.
 */
export function rideable(map: { readonly rideable: boolean }): boolean {
  return map.rideable;
}

/** Why the player cannot get on, or undefined if they can. */
export function mountProblem(
  g: GameState,
  map: { readonly rideable: boolean },
): string | undefined {
  if (!hasHorse(g)) return "You have no horse.";
  if (g.animals.mounted) return "You are already riding.";
  if (!rideable(map)) return "You can only ride outdoors.";
  return undefined;
}

/** Get on. Returns false, and changes nothing, if it cannot be done. */
export function mount(
  g: GameState,
  map: { readonly rideable: boolean },
): boolean {
  if (mountProblem(g, map) !== undefined) return false;
  g.animals.mounted = true;
  g.animals.horse.parked = undefined;
  return true;
}

/** Name the horse, once. An empty name takes the default. Returns the name it now has. */
export function nameHorse(g: GameState, raw: string): string {
  if (g.animals.horse.name === "") {
    const n = cleanName(raw);
    g.animals.horse.name = n === "" ? DEFAULT_HORSE_NAME : n;
  }
  return g.animals.horse.name;
}

/** True when the horse is still to be named: the first ride asks. */
export function needsName(g: GameState): boolean {
  return hasHorse(g) && g.animals.horse.name === "";
}

/** Get off, leaving the horse where the rider stands. */
export function dismount(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): void {
  if (!g.animals.mounted) return;
  g.animals.mounted = false;
  g.animals.horse.parked = { map: mapId, x, y };
}

/** The name for words on the screen. */
export function horseName(g: GameState): string {
  return g.animals.horse.name || "the horse";
}

/** The speed factor on the player's run speed: 1 on foot. */
export function speedFactor(g: GameState): number {
  return g.animals.mounted ? HORSE_SPEED_FACTOR : 1;
}

/**
 * The tile the horse stands on when it is not being ridden, on this map: where
 * it was left, else beside the stable (the tile in front of it). Undefined when
 * it is elsewhere or mounted.
 */
export function horseTile(
  g: GameState,
  mapId: string,
  home: { x: number; y: number } | undefined,
): { x: number; y: number } | undefined {
  if (!hasHorse(g) || g.animals.mounted) return undefined;
  const p = g.animals.horse.parked;
  if (p) return p.map === mapId ? { x: p.x, y: p.y } : undefined;
  return home;
}

/** A new morning: a horse left outside is back at the stable, and nobody is riding. Returns true if it was out. */
export function horseEndDay(g: GameState): boolean {
  const was = g.animals.horse.parked !== undefined || g.animals.mounted;
  g.animals.horse.parked = undefined;
  g.animals.mounted = false;
  return was && hasHorse(g);
}

/**
 * A parked horse blocks the tile it stands on (owner, 2026-11-07, note 59). It
 * never blocks while it is ridden or while it waits at the stable.
 */
export function horseBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  if (!hasHorse(g) || g.animals.mounted) return false;
  const p = g.animals.horse.parked;
  return p !== undefined && p.map === mapId && p.x === x && p.y === y;
}

/** What the rules need to know of a map to park the horse safely. */
export interface ParkWorld {
  width: number;
  height: number;
  /** True when a walker cannot stand on the tile, for any reason but the horse. */
  blocked(x: number, y: number): boolean;
  /**
   * True for a tile the horse must never stand on: a door, exit, entry, bin or
   * counter, and the tiles around them (so the way to each stays open).
   */
  reserved(x: number, y: number): boolean;
}

/** How far from the rider the horse may be parked, in tiles each way. */
export const PARK_RANGE = 8;

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** How many tiles can be walked to from `from`, four ways, with `wall` also blocked. */
function reachableCount(
  w: ParkWorld,
  from: { x: number; y: number },
  wall?: { x: number; y: number },
): number {
  const seen = new Set<number>([from.y * w.width + from.x]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    for (const [dx, dy] of STEPS) {
      const x = c.x + dx;
      const y = c.y + dy;
      if (x < 0 || y < 0 || x >= w.width || y >= w.height) continue;
      const k = y * w.width + x;
      if (seen.has(k) || w.blocked(x, y)) continue;
      if (wall && wall.x === x && wall.y === y) continue;
      seen.add(k);
      queue.push({ x, y });
    }
  }
  return seen.size;
}

/**
 * True when the horse may stand on this tile with the rider at `from`: open
 * ground, not reserved, not the rider's own tile, and blocking it cuts off no
 * other tile that could be walked to.
 */
export function parkable(
  w: ParkWorld,
  from: { x: number; y: number },
  tile: { x: number; y: number },
): boolean {
  const { x, y } = tile;
  if (x < 0 || y < 0 || x >= w.width || y >= w.height) return false;
  if (x === from.x && y === from.y) return false;
  if (w.blocked(x, y) || w.reserved(x, y)) return false;
  return reachableCount(w, from, tile) === reachableCount(w, from) - 1;
}

/**
 * Where to leave the horse when the rider gets off at `from` facing `front`:
 * the faced tile if it is parkable, else the nearest tile that is. Undefined
 * when there is none within range, and the horse then goes back to the stable.
 */
export function parkSpot(
  w: ParkWorld,
  from: { x: number; y: number },
  front: { x: number; y: number },
): { x: number; y: number } | undefined {
  const near: { x: number; y: number; d: number; f: number }[] = [];
  for (let dy = -PARK_RANGE; dy <= PARK_RANGE; dy++)
    for (let dx = -PARK_RANGE; dx <= PARK_RANGE; dx++) {
      const x = from.x + dx;
      const y = from.y + dy;
      near.push({
        x,
        y,
        d: Math.abs(dx) + Math.abs(dy),
        f: Math.abs(x - front.x) + Math.abs(y - front.y),
      });
    }
  near.sort((a, b) => a.d - b.d || a.f - b.f);
  const found = near.find((c) => parkable(w, from, c));
  return found && { x: found.x, y: found.y };
}

/**
 * Dismount, leaving the horse on a safe tile near the rider. If there is none
 * the horse goes back to the stable. Returns the tile it was left on.
 */
export function dismountSafely(
  g: GameState,
  mapId: string,
  w: ParkWorld,
  from: { x: number; y: number },
  front: { x: number; y: number },
): { x: number; y: number } | undefined {
  const spot = parkSpot(w, from, front);
  if (spot) dismount(g, mapId, spot.x, spot.y);
  else {
    g.animals.mounted = false;
    g.animals.horse.parked = undefined;
  }
  return spot;
}

/**
 * On entering a map: a horse left here on a tile that is no longer safe (a
 * chest was put there, a tree grew, the player stands on it) is moved to the
 * nearest safe tile, or back to the stable.
 */
export function settleHorse(
  g: GameState,
  mapId: string,
  w: ParkWorld,
  from: { x: number; y: number },
): void {
  const p = g.animals.horse.parked;
  if (!hasHorse(g) || g.animals.mounted || !p || p.map !== mapId) return;
  if (parkable(w, from, p)) return;
  const spot = parkSpot(w, from, p);
  g.animals.horse.parked = spot ? { map: mapId, ...spot } : undefined;
}
