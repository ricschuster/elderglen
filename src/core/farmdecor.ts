import type { Outcome } from "./actions";
import { isClear } from "./actions";
import type { FarmMap } from "./map";
import { FARM_STORE } from "./mapstore";
import { mayPlaceOn, PLACEABLES, placeableById, placeTag } from "./placeables";
import type { PlacedItem } from "./placedstore";
import type { GameState } from "./save";

/**
 * Farm decoration (`docs/design/89_placement_system.md`, "Farm decoration"; the keeper's
 * list in note 23): the ornamental hay bale, doghouses, cat trees and the bird house. A
 * `decor` placeable has no behaviour. It stands on the farm, blocks walking, lifts by
 * hand and is never refused a lift (it holds nothing). A 2 by 2 piece is kept at its top
 * left tile and covers four. Pure rules.
 */
const fail = (reason: string): Outcome => ({ ok: false, reason });

/** True when the item is a farm decoration. */
export const isFarmDecor = (id: string | undefined): boolean =>
  placeableById(id)?.kind === "decor";

/** Every farm decoration id, in the data's order. */
export const farmDecorIds = (): string[] =>
  PLACEABLES.filter((p) => p.kind === "decor").map((p) => p.id);

/** The tiles a decoration at (x, y) covers. */
export function decorTiles(
  id: string,
  x: number,
  y: number,
): { x: number; y: number }[] {
  const [w, h] = placeableById(id)?.footprint ?? [1, 1];
  const out: { x: number; y: number }[] = [];
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}

/** The decoration covering a farm tile, if any. */
export function farmDecorAt(
  g: GameState,
  x: number,
  y: number,
): PlacedItem | undefined {
  const p = g.placed.covering(FARM_STORE, x, y);
  return p && isFarmDecor(p.id) ? p : undefined;
}

/**
 * Stand a decoration from the pack with its top left on the faced tile. Every tile it
 * covers must be clear farm ground (not soil, a path, a tree or anything placed) and free
 * of what the scene alone knows (`occupied`). Free of energy.
 */
export function placeFarmDecor(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  id: string,
  occupied: (x: number, y: number) => boolean = () => false,
): Outcome {
  if (!isFarmDecor(id)) return fail("not a decoration");
  if (g.inventory.count(id) < 1) return fail("no decoration");
  if (!mayPlaceOn(id, placeTag(map, mapId))) return fail("cannot place here");
  for (const t of decorTiles(id, x, y))
    if (!isClear(g, map, t.x, t.y) || occupied(t.x, t.y))
      return fail("cannot place here");
  g.inventory.remove(id);
  g.placed.add(FARM_STORE, { x, y, id });
  return { ok: true };
}

/** Take a decoration up into the pack. It stays if the pack is full. */
export function pickUpFarmDecor(g: GameState, x: number, y: number): Outcome {
  const d = farmDecorAt(g, x, y);
  if (!d) return fail("nothing to act on");
  if (g.inventory.room(d.id) < 1) return fail("backpack full");
  g.placed.remove(FARM_STORE, d.x, d.y);
  g.inventory.add(d.id);
  return { ok: true, item: d.id };
}

/** Why a decoration cannot be bought at the keeper's counter, or undefined if it can. */
export function farmDecorProblem(g: GameState, id: string): string | undefined {
  const def = placeableById(id);
  if (!def || def.kind !== "decor" || def.price === undefined)
    return "The keeper does not sell that.";
  if (g.money < def.price) return `You need ${def.price - g.money}g more.`;
  if (g.inventory.room(id) < 1) return "Your pack is full.";
  return undefined;
}

/** Buy one decoration into the pack. Returns an error line, or undefined when bought. */
export function buyFarmDecor(g: GameState, id: string): string | undefined {
  const problem = farmDecorProblem(g, id);
  if (problem) return problem;
  g.money -= placeableById(id)!.price!;
  g.inventory.add(id);
  return undefined;
}
