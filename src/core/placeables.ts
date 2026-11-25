import placeableData from "../content/placeables.json";
import { isFarmMap } from "./farmtypes";
import { isHouseMap } from "./house";
import { isCampFloor, mineFloorOf } from "./mines";
import type { FarmMap } from "./map";

/**
 * The shared placing rules (`docs/design/89_placement_system.md`). A placeable
 * is an item with one data row in `src/content/placeables.json`; the row says
 * what kind it is and which kinds of place it may stand in. The tile checks
 * (clear ground, open floor) stay with each kind's own module for now. Pure
 * rules.
 */
export type PlaceableKind =
  | "sprinkler"
  | "machine"
  | "tapper"
  | "chest"
  | "light"
  | "rod"
  | "heater"
  | "bomb"
  | "pond"
  | "decor"
  | "pot";

/** The kinds of place the table reads. A map says which it is (`placeTag`). */
export type PlaceTag =
  | "farm"
  | "greenhouse"
  | "house"
  | "shed"
  | "cellar"
  | "mine"
  | "camp"
  | "wild";

export interface PlaceableDef {
  id: string;
  kind: PlaceableKind;
  /** Where it may stand. A map not listed is a no. */
  places: readonly PlaceTag[];
  /** Tiles, 1 by 1 for everything in ring 1. */
  footprint: readonly [number, number];
  blocksWalking: boolean;
  /** `hand`: any tool or the empty hand lifts it. `none`: it cannot be lifted (a bomb). */
  pickUp: "hand" | "none";
  /** Lights only: the glow radius in tiles, and whether it shows only after dusk. */
  light?: { radius: number; onlyAtNight: boolean };
  /** Decor only: the keeper's price in gold (note 23, placeholder where Stardew is unchecked, SC-164). */
  price?: number;
}

export const PLACEABLES = placeableData as unknown as readonly PlaceableDef[];

export function placeableById(
  id: string | undefined,
): PlaceableDef | undefined {
  return PLACEABLES.find((p) => p.id === id);
}

/**
 * True for a shed interior map. There is no shed map yet; the id `shed`, `shed-...` or `shed@...` is reserved
 * so a shed floor takes machines the moment one is built (owner 2026-11-25).
 */
export function isShedMap(id: string): boolean {
  return id === "shed" || id.startsWith("shed-") || id.startsWith("shed@");
}

/** True for the maps whose machines live in the indoor list: house and shed floors. */
export function isIndoorMachineMap(id: string): boolean {
  return isHouseMap(id) || isShedMap(id);
}

/**
 * Which kind of place a map is. The greenhouse is the indoor growing room, a
 * house map is a home interior, and any other farm map is the farm. A map
 * outside these has no tag, so nothing may be placed there yet. A mine floor is
 * `mine`, or `camp` on the rest floors, and an outdoor map with no soil is `wild`.
 */
export function placeTag(map: FarmMap, mapId?: string): PlaceTag | undefined {
  if (mapId !== undefined && isHouseMap(mapId)) return "house";
  if (mapId !== undefined && isShedMap(mapId)) return "shed";
  if (map.indoors) return "greenhouse";
  if (mapId === undefined || isFarmMap(mapId)) return "farm";
  const floor = mineFloorOf(mapId);
  if (floor !== undefined) return isCampFloor(floor) ? "camp" : "mine";
  return map.wild ? "wild" : undefined;
}

/** May this placeable stand on this kind of place? Says nothing of the tile. */
export function mayPlaceOn(id: string, tag: PlaceTag | undefined): boolean {
  return tag !== undefined && !!placeableById(id)?.places.includes(tag);
}
