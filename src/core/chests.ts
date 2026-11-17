import type { Outcome } from "./actions";
import { isFarmMap } from "./farmtypes";
import { HOUSE_LAYOUT, isHouseMap, legacyHouseTile } from "./house";
import { Inventory } from "./inventory";
import type { FarmMap } from "./map";
import type { GameState } from "./save";
import { canStand } from "./furniture";
import { CHEST_COLOURS, chestById } from "./chestdefs";
import { isOpenGround } from "./actions";
import { GREENHOUSE_STORE } from "./mapstore";
import { mayPlaceOn, placeTag } from "./placeables";

/**
 * Chests (`docs/design/34_crafting.md`, "Storage and signs"): wood and stone,
 * and a big version of each. A chest is a backpack item, stood on the faced
 * tile of a farm map or a house map, holding stacks like the backpack does.
 * It can be taken up only when empty, so nothing is lost. Slot counts are
 * Stardew's, from memory (note 54). Pure rules.
 */
export { CHESTS, chestById, type ChestDef } from "./chestdefs";

/** Every farm map shares one key, since the farm is one place whichever map shows it. */
const place = (map: string) => (isFarmMap(map) ? "farm" : map);
const key = (map: string, x: number, y: number) => `${place(map)}:${x},${y}`;

export interface PlacedChest {
  map: string;
  x: number;
  y: number;
  id: string;
  items: Inventory;
  /** The colour bar's pick, 1 to 20 (`CHEST_COLOURS`); none is the original. */
  colour?: number;
  /** The special order this chest is bound to (note 65, "Goods hand-in"). */
  order?: string;
  /** The order has ended; goods left inside can be taken back, and the chest goes when empty. */
  closed?: boolean;
}

export interface ChestSave {
  map: string;
  x: number;
  y: number;
  id: string;
  slots: ({ id: string; count: number } | null)[];
  colour?: number;
  order?: string;
  closed?: boolean;
}

/** The chests standing in the world. */
export class Chests {
  private placed = new Map<string, PlacedChest>();

  save(): ChestSave[] {
    return [...this.placed.values()].map((c) => ({
      map: c.map,
      x: c.x,
      y: c.y,
      id: c.id,
      slots: c.items.save(),
      ...(c.colour ? { colour: c.colour } : {}),
      ...(c.order
        ? { order: c.order, ...(c.closed ? { closed: true } : {}) }
        : {}),
    }));
  }

  /** `layout` is the save's `houseLayout`; an older frame is moved (`legacyHouseTile`). */
  load(raw: unknown, layout = HOUSE_LAYOUT): void {
    this.placed.clear();
    if (!Array.isArray(raw)) return;
    for (const c of raw as Partial<ChestSave>[]) {
      const def = chestById(c?.id);
      if (
        !def ||
        typeof c.map !== "string" ||
        !Number.isInteger(c.x) ||
        !Number.isInteger(c.y) ||
        !Array.isArray(c.slots)
      )
        continue;
      const x = c.x as number;
      const y = c.y as number;
      const to = isHouseMap(c.map) ? legacyHouseTile(c.map, x, y, layout) : c;
      // If the new tile is taken, keep the chest where it was rather than lose its stacks.
      const added =
        this.add(to.map as string, to.x as number, to.y as number, def.id) ??
        this.add(c.map, x, y, def.id);
      if (added) {
        added.items.load(c.slots);
        if (validColour(c.colour)) added.colour = c.colour;
        if (typeof c.order === "string") {
          added.order = c.order;
          if (c.closed === true) added.closed = true;
        }
      }
    }
  }

  /** Every chest in the world, whatever its map. */
  all(): IterableIterator<PlacedChest> {
    return this.placed.values();
  }

  *each(map: string): Generator<PlacedChest> {
    for (const c of this.placed.values())
      if (place(c.map) === place(map)) yield c;
  }

  get(map: string, x: number, y: number): PlacedChest | undefined {
    return this.placed.get(key(map, x, y));
  }

  at(map: string, x: number, y: number): string | undefined {
    return this.get(map, x, y)?.id;
  }

  /** True when a chest stands on the farm at a tile. */
  onFarm(x: number, y: number): boolean {
    return this.placed.has(key("farm", x, y));
  }

  get count(): number {
    return this.placed.size;
  }

  add(map: string, x: number, y: number, id: string): PlacedChest | undefined {
    const def = chestById(id);
    if (!def || this.placed.has(key(map, x, y))) return undefined;
    const chest = { map, x, y, id, items: new Inventory(def.slots, def.slots) };
    this.placed.set(key(map, x, y), chest);
    return chest;
  }

  remove(map: string, x: number, y: number): PlacedChest | undefined {
    const c = this.get(map, x, y);
    this.placed.delete(key(map, x, y));
    return c;
  }

  /** Shift a chest, stacks and all, to another tile of the same place. False if it is not there or the tile is taken. */
  move(map: string, x: number, y: number, nx: number, ny: number): boolean {
    const c = this.get(map, x, y);
    if (!c || this.placed.has(key(map, nx, ny))) return false;
    this.placed.delete(key(map, x, y));
    c.x = nx;
    c.y = ny;
    this.placed.set(key(map, nx, ny), c);
    return true;
  }

  /** The chests on the tiles touching a spot, as a workbench draws on them. */
  near(map: string, x: number, y: number): PlacedChest[] {
    const out: PlacedChest[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.get(map, x + dx, y + dy);
        if (c) out.push(c);
      }
    return out;
  }
}

/** True for a colour bar pick: a whole number from 1 to the palette's length. */
export const validColour = (n: unknown): n is number =>
  Number.isInteger(n) &&
  (n as number) >= 1 &&
  (n as number) <= CHEST_COLOURS.length;

/** Colour a chest from the bar; 0 puts the original back. Free, any time. */
export function colourChest(c: PlacedChest, colour: number): boolean {
  if (colour === 0) {
    delete c.colour;
    return true;
  }
  if (!validColour(colour)) return false;
  c.colour = colour;
  return true;
}

/** True when a chest holds nothing. */
export function isEmpty(c: PlacedChest): boolean {
  for (let i = 0; i < c.items.size; i++) if (c.items.slot(i)) return false;
  return true;
}

/** The stacks in a chest as id and count, in slot order, merged by id. */
export function contents(c: PlacedChest): { id: string; count: number }[] {
  const out = new Map<string, number>();
  for (let i = 0; i < c.items.size; i++) {
    const s = c.items.slot(i);
    if (s) out.set(s.id, (out.get(s.id) ?? 0) + s.count);
  }
  return [...out].map(([id, count]) => ({ id, count }));
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/**
 * Stand a chest from the backpack on the faced tile: any bare open ground on
 * the farm (not only tillable), or open floor in the house. Free.
 */
export function placeChest(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (!chestById(id)) return fail("not a chest");
  if (g.inventory.count(id) < 1) return fail("no chest");
  const there = g.chests.get(mapId, x, y);
  if (there) return upgradeChest(g, there, id);
  const tag = placeTag(map, mapId);
  const ok =
    mayPlaceOn(id, tag) &&
    !g.chests.get(mapId, x, y) &&
    (tag === "house"
      ? canStand(g, map, mapId, x, y)
      : isOpenGround(g, map, x, y));
  if (!ok) return fail("cannot place here");
  g.inventory.remove(id);
  g.chests.add(mapId, x, y, id);
  return { ok: true };
}

/**
 * A big chest used on a regular or stone chest replaces it, stacks and colour
 * kept, and the old chest goes to the backpack (Stardew, SC-194). Not on a
 * chest bound to an order, and not when the backpack has no room for it.
 */
function upgradeChest(g: GameState, old: PlacedChest, id: string): Outcome {
  const big = chestById(id)!;
  const was = chestById(old.id)!;
  if (big.slots <= was.slots || old.order) return fail("cannot place here");
  // The new chest is out of the pack first, so its slot is free for the old one.
  g.inventory.remove(id);
  if (g.inventory.room(old.id) < 1) {
    g.inventory.add(id);
    return fail("backpack full");
  }
  g.chests.remove(old.map, old.x, old.y);
  const fresh = g.chests.add(old.map, old.x, old.y, id)!;
  fresh.items.load(old.items.save());
  fresh.items.grow(big.slots);
  if (old.colour) fresh.colour = old.colour;
  g.inventory.add(old.id);
  return { ok: true };
}

/**
 * True when a tap on the placed chest at (x, y) with `heldId` selected should
 * swap it (a bigger chest over a smaller one) instead of opening it: the touch
 * schemes have no Use button, so the tap is the use (note 27).
 */
export function swapsOnTap(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  heldId: string,
): boolean {
  const big = chestById(heldId);
  const old = g.chests.get(mapId, x, y);
  if (!big || !old || old.order) return false;
  const was = chestById(old.id);
  return !!was && big.slots > was.slots;
}

/** Take an empty chest up into the backpack. */
export function pickUpChest(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  const c = g.chests.get(mapId, x, y);
  if (!c) return fail("nothing to act on");
  if (c.order && !c.closed) return fail("chest bound to an order");
  if (!isEmpty(c)) return fail("chest not empty");
  if (g.inventory.room(c.id) < 1) return fail("backpack full");
  g.chests.remove(mapId, x, y);
  g.inventory.add(c.id);
  return { ok: true, item: c.id };
}

/**
 * Push a chest one tile with the axe or pickaxe (SC-56), on the farm or in the
 * house. The tile ahead must be open, as for placing. Taking it up needs it
 * empty, so a chest with items in it is moved this way. Free of energy.
 */
export function pushChest(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  dx: number,
  dy: number,
): Outcome {
  const c = g.chests.get(mapId, x, y);
  if (!c) return fail("nothing to act on");
  if (g.day.over) return fail("exhausted");
  if (c.order) return fail("chest bound to an order");
  const nx = x + dx;
  const ny = y + dy;
  const ok = isHouseMap(mapId)
    ? canStand(g, map, mapId, nx, ny) && !g.chests.get(mapId, nx, ny)
    : (isFarmMap(mapId) || mapId === GREENHOUSE_STORE) &&
      isOpenGround(g, map, nx, ny) &&
      !g.chests.get(mapId, nx, ny);
  if (!ok) return fail("chest will not move");
  g.chests.move(mapId, x, y, nx, ny);
  return { ok: true };
}

/** Move up to `n` of a stack from the backpack into a chest. Returns how many moved. */
export function putIn(
  g: GameState,
  c: PlacedChest,
  id: string,
  n: number,
): number {
  const moved = Math.min(n, g.inventory.count(id), c.items.room(id));
  if (moved <= 0) return 0;
  g.inventory.remove(id, moved);
  c.items.add(id, moved);
  return moved;
}

/** Move up to `n` of a stack from a chest into the backpack. Returns how many moved. */
export function takeOut(
  g: GameState,
  c: PlacedChest,
  id: string,
  n: number,
): number {
  const moved = Math.min(n, c.items.count(id), g.inventory.room(id));
  if (moved <= 0) return 0;
  c.items.remove(id, moved);
  g.inventory.add(id, moved);
  return moved;
}
