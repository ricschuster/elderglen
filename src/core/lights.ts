import { isFarmMap } from "./farmtypes";
import { canStand } from "./furniture";
import type { Outcome } from "./actions";
import { isClear } from "./actions";
import type { FarmMap } from "./map";
import { mineFloorOf } from "./mines";
import { FARM_STORE } from "./mapstore";
import { mayPlaceOn, placeableById, placeTag } from "./placeables";
import type { PlacedItem } from "./placedstore";
import type { GameState } from "./save";

/**
 * Placed lights (`docs/design/89_placement_system.md`, "Light"): torches,
 * campfires and braziers. A light is a placeable with a radius, kept in the
 * generic placed store under its map, and a glow the scene draws. The worn ring
 * feeds the same layer but is carried, not placed. A light never burns fuel and
 * never moves. Pure rules.
 */
const fail = (reason: string): Outcome => ({ ok: false, reason });

/** The key a map's lights are kept under: every farm map is the farm. */
export const lightMapKey = (mapId: string): string =>
  isFarmMap(mapId) ? FARM_STORE : mapId;

/** True when the item is a placeable light. */
export function isLight(id: string | undefined): boolean {
  return placeableById(id)?.kind === "light";
}

/** The light standing on a tile, if any. */
export function lightAt(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): PlacedItem | undefined {
  return g.placed.get(lightMapKey(mapId), x, y);
}

/**
 * Stand a torch, campfire or brazier from the backpack on the faced tile. The
 * map must allow it (the place table), and the tile must be clear ground on the
 * farm or open floor elsewhere, with nothing placed there. Free.
 * `occupied` lets a scene add what the core cannot see, such as the rocks of a
 * mine floor.
 */
export function placeLight(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
  id: string,
  occupied: (x: number, y: number) => boolean = () => false,
): Outcome {
  if (!isLight(id)) return fail("not a light");
  if (g.inventory.count(id) < 1) return fail("no light");
  const tag = placeTag(map, mapId);
  const free =
    tag === "farm" ? isClear(g, map, x, y) : canStand(g, map, mapId, x, y);
  if (
    !mayPlaceOn(id, tag) ||
    !free ||
    occupied(x, y) ||
    g.placed.get(lightMapKey(mapId), x, y)
  )
    return fail("cannot place here");
  g.inventory.remove(id);
  g.placed.add(lightMapKey(mapId), { x, y, id });
  return { ok: true };
}

/** Take a light up into the backpack. It stays if the pack is full. */
export function pickUpLight(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  const light = lightAt(g, mapId, x, y);
  if (!light || !isLight(light.id)) return fail("nothing to act on");
  if (g.inventory.room(light.id) < 1) return fail("backpack full");
  g.placed.remove(lightMapKey(mapId), x, y);
  g.inventory.add(light.id);
  return { ok: true, item: light.id };
}

/** One glow in the light layer: a centre tile and a radius in tiles. */
export interface Glow {
  x: number;
  y: number;
  radius: number;
  /** True for a light that shows only after dusk. */
  onlyAtNight: boolean;
  /** True for the worn ring, which moves with the player. */
  worn?: boolean;
}

/**
 * The light layer of a map: every placed light on it, plus the glow of the
 * worn ring around the player at `at`. The scene draws these.
 */
export function lightLayer(
  g: GameState,
  mapId: string,
  at?: { x: number; y: number },
): Glow[] {
  const out: Glow[] = [];
  for (const p of g.placed.each(lightMapKey(mapId))) {
    const light = placeableById(p.id)?.light;
    if (light) out.push({ x: p.x, y: p.y, ...light });
  }
  const ring = g.equipment.lightRadius();
  if (at && ring > 0)
    out.push({
      x: at.x,
      y: at.y,
      radius: ring,
      onlyAtNight: false,
      worn: true,
    });
  return out;
}

/** True when a tile is inside the glow of any light in the layer. Tile distance, as bombs use. */
export function isLit(glows: readonly Glow[], x: number, y: number): boolean {
  return glows.some((l) => Math.hypot(l.x - x, l.y - y) <= l.radius);
}

/**
 * Lights set down on a mine floor go with the floor, which is rebuilt each
 * day, so the night clears them. The farm's and the wilds' stay.
 */
export function clearMineLights(g: GameState): void {
  for (const id of g.placed.mapIds())
    if (mineFloorOf(id) !== undefined)
      for (const p of [...g.placed.each(id)]) g.placed.remove(id, p.x, p.y);
}
