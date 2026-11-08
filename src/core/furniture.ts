import furnitureData from "../content/furniture.json";
import type { Outcome } from "./actions";
import { isHouseMap, legacyHouseTile } from "./house";
import type { FarmMap } from "./map";
import type { GameState } from "./save";

/**
 * Furniture (`docs/design/10_customisation.md`): one tile pieces placed in the
 * house. A piece is a backpack item (its id is the item id) that is stood on
 * the faced tile with the Use button and taken up with Action or the hand.
 * Furniture is bought from the carpenter, cannot be sold, and snaps to the
 * tile grid with no stacking. Rugs lie flat and can be walked on. Content is
 * `src/content/furniture.json`. Pure rules.
 */
export interface FurnitureDef {
  id: string;
  name: string;
  /** The carpenter's price, a placeholder. */
  price: number;
  /** Placeholder colour as `#rrggbb`. */
  color: string;
  /** A rug is walked on and does not block. */
  rug?: boolean;
  /** Sold only at a festival counter, never by the carpenter. */
  festival?: boolean;
  /** A crafting station: Action on it opens crafting with the chests beside it (note 34). Always sold, never in the daily pick. */
  station?: "workbench";
}

export const FURNITURE = furnitureData as FurnitureDef[];

export function furnitureById(
  id: string | undefined,
): FurnitureDef | undefined {
  return FURNITURE.find((f) => f.id === id);
}

export interface PlacedFurniture {
  map: string;
  x: number;
  y: number;
  id: string;
}

const key = (map: string, x: number, y: number) => `${map}:${x},${y}`;

/** What the carpenter shows each day. */
export const DAILY_STOCK = 4;

/** Furniture placed in the house maps, and pieces that had nowhere to go. */
export class Furniture {
  private placed = new Map<string, PlacedFurniture>();
  /** Pieces waiting for room in the backpack after a house upgrade. */
  stash: string[] = [];

  save(): FurnitureSave {
    return {
      placed: [...this.placed.values()].map((p) => ({ ...p })),
      stash: [...this.stash],
    };
  }

  /** `legacy` is true for a save from before the merged house map (`legacyHouseTile`). */
  load(raw: unknown, legacy = false): void {
    this.placed.clear();
    this.stash = [];
    if (typeof raw !== "object" || raw === null) return;
    const data = raw as Partial<FurnitureSave>;
    if (Array.isArray(data.placed))
      for (const p of data.placed) {
        const ok =
          typeof p === "object" &&
          p !== null &&
          typeof p.map === "string" &&
          isHouseMap(p.map) &&
          Number.isInteger(p.x) &&
          Number.isInteger(p.y) &&
          furnitureById(p.id);
        if (!ok) continue;
        const at = legacy ? legacyHouseTile(p.map, p.x, p.y) : p;
        this.add(at.map, at.x, at.y, p.id);
      }
    if (Array.isArray(data.stash))
      this.stash = data.stash.filter((id) => furnitureById(id));
  }

  *each(map: string): Generator<PlacedFurniture> {
    for (const p of this.placed.values()) if (p.map === map) yield p;
  }

  /** The piece id on a tile, if any. */
  at(map: string, x: number, y: number): string | undefined {
    return this.placed.get(key(map, x, y))?.id;
  }

  /** True if a piece that blocks movement stands on the tile. */
  blocks(map: string, x: number, y: number): boolean {
    return (
      !furnitureById(this.at(map, x, y))?.rug &&
      this.at(map, x, y) !== undefined
    );
  }

  get count(): number {
    return this.placed.size;
  }

  add(map: string, x: number, y: number, id: string): boolean {
    if (!furnitureById(id) || this.placed.has(key(map, x, y))) return false;
    this.placed.set(key(map, x, y), { map, x, y, id });
    return true;
  }

  remove(map: string, x: number, y: number): string | undefined {
    const id = this.at(map, x, y);
    this.placed.delete(key(map, x, y));
    return id;
  }

  /** Every piece standing on a map other than `map`, with its tile. */
  elsewhere(map: string): PlacedFurniture[] {
    return [...this.placed.values()].filter((p) => p.map !== map);
  }
}

export interface FurnitureSave {
  placed: PlacedFurniture[];
  stash: string[];
}

/** True when the tile can hold a piece: open floor, not a door, entry or service. */
export function canStand(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): boolean {
  return (
    !map.isBlocked(x, y) &&
    !map.exitAt(x, y) &&
    !map.entries.some((e) => e.x === x && e.y === y) &&
    !map.serviceAt(x, y) &&
    g.furniture.at(mapId, x, y) === undefined
  );
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** Stand a piece from the backpack on the faced tile of a house map. Free. */
export function placeFurniture(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (!isHouseMap(mapId)) return fail("furniture needs the house");
  if (!furnitureById(id)) return fail("not furniture");
  if (g.inventory.count(id) < 1) return fail("no furniture");
  if (!canStand(g, map, mapId, x, y)) return fail("cannot place here");
  g.inventory.remove(id);
  g.furniture.add(mapId, x, y, id);
  return { ok: true };
}

/** Take a piece up into the backpack. If the pack is full it stays. */
export function pickUpFurniture(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  const id = g.furniture.at(mapId, x, y);
  if (!id) return fail("nothing to act on");
  if (g.inventory.room(id) < 1) return fail("backpack full");
  g.furniture.remove(mapId, x, y);
  g.inventory.add(id);
  return { ok: true, item: id };
}

/**
 * Move furniture from other house maps onto this one after an upgrade. A piece
 * keeps its tile if it fits, else goes to the backpack, else waits in the
 * stash. Also tries to empty the stash into the backpack. Safe to repeat.
 */
export function carryFurniture(
  g: GameState,
  map: FarmMap,
  mapId: string,
): void {
  for (const p of g.furniture.elsewhere(mapId)) {
    g.furniture.remove(p.map, p.x, p.y);
    if (canStand(g, map, mapId, p.x, p.y))
      g.furniture.add(mapId, p.x, p.y, p.id);
    else g.furniture.stash.push(p.id);
  }
  g.furniture.stash = g.furniture.stash.filter((id) => !g.inventory.add(id));
}

/**
 * The carpenter's pieces for a day: the same for the whole day, a different
 * pick on other days. `DAILY_STOCK` of the pool, chosen by a hash of the day.
 */
export function dailyStock(day: number): FurnitureDef[] {
  const scored = FURNITURE.filter((f) => !f.festival && !f.station).map(
    (f, i) => ({
      f,
      score: Math.imul(day * 7919 + i * 104729 + 13, 2654435761) >>> 0,
    }),
  );
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, DAILY_STOCK).map((s) => s.f);
}

/** Crafting stations the carpenter always sells, whatever the day. */
export const stationStock = (): FurnitureDef[] =>
  FURNITURE.filter((f) => f.station);

/** Why a piece cannot be bought today, or undefined if it can. */
export function furnitureProblem(g: GameState, id: string): string | undefined {
  const def = [...stationStock(), ...dailyStock(g.day.clock.day)].find(
    (f) => f.id === id,
  );
  if (!def) return "The carpenter does not have that today.";
  if (g.money < def.price) return `You need ${def.price - g.money}g more.`;
  if (g.inventory.room(id) < 1) return "Your pack is full.";
  return undefined;
}

/** Buy a piece from today's stock into the backpack. */
export function buyFurniture(g: GameState, id: string): boolean {
  if (furnitureProblem(g, id) !== undefined) return false;
  g.money -= furnitureById(id)!.price;
  return g.inventory.add(id);
}
