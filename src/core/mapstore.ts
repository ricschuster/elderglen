import type { Farm } from "./farm";
import type { FruitTrees } from "./fruittrees";
import type { Sprinklers } from "./sprinklers";
import type { GameState } from "./save";

/**
 * The per-map store (`docs/design/31_farm_growth.md`, issue #634). Sprinklers
 * and fruit trees are kept by tile, and the farm and the greenhouse share tile
 * numbers, so each map has its own set. Today there are two: the open farm
 * (whichever farm type) and the greenhouse. The rules ask for the set of the
 * map they work on, never for the farm's by habit.
 */
export interface MapStore {
  /** The soil dug on this map. */
  soil: Farm;
  sprinklers: Sprinklers;
  fruitTrees: FruitTrees;
}

/** The ids a store is saved under. */
export const FARM_STORE = "farm";
export const GREENHOUSE_STORE = "greenhouse";

/** The store of the open farm, or of the greenhouse when `indoors`. */
export function storeOf(g: GameState, indoors: boolean): MapStore {
  return indoors
    ? {
        soil: g.greenhouse,
        sprinklers: g.greenhouseSprinklers,
        fruitTrees: g.greenhouseFruitTrees,
      }
    : { soil: g.farm, sprinklers: g.sprinklers, fruitTrees: g.fruitTrees };
}
