import {
  animalSlots,
  BARN_MAP,
  barnBlocks,
  COOP_MAP,
  coopBlocks,
  siloBlocks,
  stableBlocks,
} from "./animals";
import { LEVER_KIND } from "./danger";
import { potAt } from "./gardenpot";
import { gateOpen, parseGate } from "./gates";
import { horseBlocks } from "./horse";
import { logCleared } from "./logs";
import { isAreaMap } from "./areas";
import { isFarmMap } from "./farmtypes";
import { lightMapKey } from "./lights";
import type { FarmMap } from "./map";
import { storeOf } from "./mapstore";
import { pondBlocks } from "./pond";
import type { Rocks } from "./rocks";
import type { GameState } from "./save";
import { rodAt } from "./lightning";

/** What the blocking rules read: the state, the map and two scene-held facts. */
export interface BlockWorld {
  state: GameState;
  map: FarmMap;
  mapId: string;
  /** The rocks on this map: the farm's, or this mine floor's. */
  rocks: Rocks | undefined;
  /** True when this tile is shut by a festival setting up. */
  festivalShut: (x: number, y: number) => boolean;
}

/** True on a map with the farm's soil: its trees, weeds, forage and machines live here. */
export function outdoorSoil(map: FarmMap): boolean {
  return map.hasSoil && !map.indoors;
}

/** True outdoors on the farm or an area map: the map whose trees, rocks and forage are the state's. */
export function outdoorWorld(map: FarmMap, mapId: string): boolean {
  return !map.indoors && (map.hasSoil || isAreaMap(mapId));
}

/** True on a gated bedroom door the player has not earned the hearts for yet. */
export function gateShut(
  state: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const g = map.gateAt(x, y);
  if (!g) return false;
  const rule = parseGate(g.rule);
  if (!rule) return false;
  return !gateOpen(mapId, rule, (id) => state.friendship.hearts(id));
}

/** True on the furnace tile once the smith has given it. */
function furnaceAt(state: GameState, map: FarmMap, x: number, y: number) {
  return state.furnace.gifted && map.serviceAt(x, y)?.kind === "furnace";
}

/**
 * True if the farmer cannot stand on the tile: a wall, tree, rock, machine or
 * a horse left standing there (never one that is ridden or at the stable).
 */
export function tileBlocked(w: BlockWorld, x: number, y: number): boolean {
  return tileBlockedNoHorse(w, x, y) || horseBlocks(w.state, w.mapId, x, y);
}

export function tileBlockedNoHorse(
  w: BlockWorld,
  x: number,
  y: number,
): boolean {
  const { state, map, mapId } = w;
  const store = storeOf(state, map.indoors);
  const log = map.logAt(x, y);
  return (
    map.isBlocked(x, y) ||
    gateShut(state, map, mapId, x, y) ||
    w.festivalShut(x, y) ||
    (log !== undefined && !logCleared(state, log)) ||
    (outdoorWorld(map, mapId) && state.trees.blocks(x, y)) ||
    !!store.fruitTrees.at(x, y) ||
    !!store.teaBushes.at(x, y) ||
    !!w.rocks?.at(x, y) ||
    furnaceAt(state, map, x, y) ||
    coopBlocks(state, mapId, x, y) ||
    barnBlocks(state, mapId, x, y) ||
    siloBlocks(state, mapId, x, y) ||
    stableBlocks(state, mapId, x, y) ||
    pondBlocks(state, mapId, x, y) ||
    ((mapId === COOP_MAP || mapId === BARN_MAP) &&
      animalSlots(state, mapId === COOP_MAP ? "coop" : "barn").some(
        (s) => s.x === x && s.y === y,
      )) ||
    state.furniture.blocks(mapId, x, y) ||
    !!state.casks.at(x, y, mapId) ||
    !!state.chests.at(mapId, x, y) ||
    !!state.placed.covering(lightMapKey(mapId), x, y) ||
    (isFarmMap(mapId) && !!rodAt(state, x, y)) ||
    map.serviceAt(x, y)?.kind === "camp-chest" ||
    map.serviceAt(x, y)?.kind === LEVER_KIND ||
    !!store.sprinklers.at(x, y) ||
    !!potAt(state, map, x, y) ||
    (outdoorSoil(map) && !!state.machines.at(x, y)) ||
    !!state.indoorMachines.get(x, y, mapId)
  );
}
