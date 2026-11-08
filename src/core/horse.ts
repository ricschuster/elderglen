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

/** True for a map the horse can be ridden on: the farms and the village green. Doors dismount. */
export function rideable(mapId: string, farmMaps: readonly string[]): boolean {
  return mapId === "green" || farmMaps.includes(mapId);
}

/** Why the player cannot get on, or undefined if they can. */
export function mountProblem(
  g: GameState,
  mapId: string,
  farmMaps: readonly string[],
): string | undefined {
  if (!hasHorse(g)) return "You have no horse.";
  if (g.animals.mounted) return "You are already riding.";
  if (!rideable(mapId, farmMaps)) return "You can only ride outdoors.";
  return undefined;
}

/** Get on. Returns false, and changes nothing, if it cannot be done. */
export function mount(
  g: GameState,
  mapId: string,
  farmMaps: readonly string[],
): boolean {
  if (mountProblem(g, mapId, farmMaps) !== undefined) return false;
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
