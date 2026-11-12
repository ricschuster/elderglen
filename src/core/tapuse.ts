import { isClear } from "./actions";
import { dateOf } from "./calendar";
import { cropById } from "./crops";
import { fertilizerById } from "./fertilizer";
import { cropOfSeed } from "./items";
import type { FarmMap } from "./map";
import { storeOf } from "./mapstore";
import { machineById } from "./processing";
import type { GameState } from "./save";
import { sprinklerById } from "./sprinklers";
import { mayTap, TAPPER } from "./tapper";
import type { Held } from "./toolbar";
import { MIXED_SEED } from "./weeds";

/**
 * What a tap on a tile does with the held item (note 27, "Tap uses the held
 * tool when it fits"):
 *
 * - `use`: the item has a use on this tile, so the farmer walks beside it and
 *   uses the item once.
 * - `walk`: a soil-work item that has no use here, so the tap only walks.
 * - `other`: not a soil-work item (weapon, rod, chest, furniture and so on).
 *   The scene keeps its old rule for these: a tap beside the farmer uses the
 *   item, a tap further away walks.
 */
export type TapUse = "use" | "walk" | "other";

/** True when the held thing is one the fit rule judges (note 27's "what fits"). */
export function isSoilWork(held: Held): boolean {
  if (held.kind === "tool") return held.tool === "hoe" || held.tool === "can";
  if (held.kind !== "item") return false;
  return (
    !!cropOfSeed(held.id) ||
    held.id === MIXED_SEED ||
    !!fertilizerById(held.id) ||
    !!sprinklerById(held.id) ||
    !!machineById(held.id) ||
    held.id === TAPPER
  );
}

/** Whether the held item has a use on tile (x, y), judged without using it. */
export function tapUse(
  g: GameState,
  map: FarmMap,
  held: Held,
  x: number,
  y: number,
): TapUse {
  if (!isSoilWork(held)) return "other";
  return fits(g, map, held, x, y) ? "use" : "walk";
}

function fits(
  g: GameState,
  map: FarmMap,
  held: Held,
  x: number,
  y: number,
): boolean {
  if (g.day.over) return false;
  const soil = storeOf(g, map.indoors).soil;
  const plot = soil.plotAt(x, y);
  if (held.kind === "tool") {
    if (held.tool === "hoe")
      return map.isTillable(x, y) && isClear(g, map, x, y);
    return !!plot && !plot.wateredToday;
  }
  if (held.kind !== "item") return false;
  if (cropOfSeed(held.id) || held.id === MIXED_SEED) {
    if (!plot || plot.crop || g.inventory.count(held.id) < 1) return false;
    if (!map.indoors && g.weeds.at(x, y)) return false;
    if (held.id === MIXED_SEED || map.indoors) return true;
    const def = cropById(cropOfSeed(held.id) ?? "");
    return !!def && def.seasons.includes(dateOf(g.day.clock.day).season);
  }
  // A tapper goes on a mature tree with none on it (note 92); the tree tile is blocked.
  if (held.id === TAPPER) return mayTap(g.trees.at(x, y));
  if (fertilizerById(held.id)) return !!plot && g.inventory.count(held.id) > 0;
  // A sprinkler or a machine stands on an open tile.
  return isClear(g, map, x, y);
}

/**
 * Whether tile (x, y) holds something a tap picks by hand, whatever is held
 * (note 27, "Tap makes the Action button obsolete"): a ripe crop, a forage
 * item or a fruit tree with fruit. A ripe crop is a harvest first, so a can or
 * hoe held over it does not water or dig.
 */
export function tapPick(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): boolean {
  if (g.day.over) return false;
  const here = storeOf(g, map.indoors);
  if (here.fruitTrees.ripe(x, y)) return true;
  if (here.soil.plotAt(x, y)?.crop && here.soil.isRipe(x, y)) return true;
  return !map.indoors && !!g.forage.itemAt(x, y);
}
