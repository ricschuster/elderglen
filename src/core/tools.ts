import {
  chop,
  clearSeedling,
  clearTwig,
  clearWeed,
  fertilize,
  forage,
  harvest,
  pickUpSprinkler,
  placeSprinkler,
  plant,
  plantFruitTree,
  pickFruit,
  plantTree,
  shake,
  till,
  water,
  type Outcome,
} from "./actions";
import { TREE_SEED } from "./trees";
import { mine } from "./mining";
import type { FarmMap } from "./map";
import type { GameState } from "./save";
import { cropOfSeed } from "./items";
import { MIXED_SEED } from "./weeds";
import { fertilizerById } from "./fertilizer";
import { treeOfSapling } from "./fruittrees";
import { sprinklerById } from "./sprinklers";
import { handOnMachine, loadMachine, placeMachine } from "./machines";
import { machineById } from "./processing";
import type { Held } from "./toolbar";
import { toolAway } from "./upgrades";

const fail = (reason: string): Outcome => ({ ok: false, reason });

/**
 * Use what the player holds on one tile. The hoe digs soil, the can waters,
 * seeds plant, and the hand tool picks forage or harvests. Any other item does
 * nothing here: picking, shaking and harvesting belong to `act`.
 *
 * The axe fells trees, a tree seed plants one, and the hand tool shakes a loose
 * seed from a mature tree.
 *
 * Plots, forage and trees are not stored per map yet, so they only work on a map
 * with soil. Anywhere else the tools do nothing.
 */
export function useHeld(
  g: GameState,
  map: FarmMap,
  held: Held,
  x: number,
  y: number,
  /** The mine floor the player is on, if in the mine. */
  floor?: number,
): Outcome {
  if (held.kind === "empty") return fail("nothing held");
  if (held.kind === "tool" && toolAway(g, held.tool))
    return fail("at the smith");
  // Any tool, or the empty hand, lifts a placed sprinkler (SC-48).
  if (held.kind === "tool" && g.sprinklers.at(x, y))
    return pickUpSprinkler(g, x, y);
  // The axe or pickaxe takes a placed machine up, or collects from it (Stardew).
  if (
    held.kind === "tool" &&
    (held.tool === "axe" || held.tool === "pickaxe") &&
    g.machines.at(x, y)
  )
    return handOnMachine(g, x, y);
  if (held.kind === "tool" && held.tool === "pickaxe")
    return mine(g, x, y, floor);
  if (!map.hasSoil) return fail("nothing to do here");
  const weedTool =
    held.kind === "tool" &&
    (held.tool === "axe" || held.tool === "hoe" || held.tool === "can")
      ? held.tool
      : undefined;
  if (weedTool && g.weeds.at(x, y))
    return clearWeed(g, x, y, weedTool, Math.random, map);
  if (weedTool && g.twigs.at(x, y)) return clearTwig(g, x, y, weedTool, map);
  if (held.kind === "tool" && held.tool === "axe")
    return chop(g, x, y, Math.random, map);
  if (held.kind === "tool" && held.tool === "hoe") {
    if (g.trees.at(x, y)) return clearSeedling(g, x, y, "hoe", map);
    if (g.fruitTrees.at(x, y)) return fail("a tree is in the way");
    return map.isTillable(x, y) ? till(g, x, y) : fail("cannot dig here");
  }
  if (held.kind === "tool" && held.tool === "can")
    return g.trees.at(x, y)
      ? clearSeedling(g, x, y, "can", map)
      : water(g, x, y);
  if (g.machines.at(x, y)) {
    // A machine takes the held item; Action collects from it.
    if (held.kind === "item") return loadMachine(g, x, y, held.id);
    return fail("machine in the way");
  }
  if (held.kind === "item" && machineById(held.id))
    return placeMachine(g, map, x, y, held.id);
  if (held.kind === "item" && (cropOfSeed(held.id) || held.id === MIXED_SEED)) {
    return plant(g, x, y, held.id);
  }
  if (held.kind === "item" && fertilizerById(held.id))
    return fertilize(g, x, y, held.id);
  if (held.kind === "item" && sprinklerById(held.id))
    return placeSprinkler(g, map, x, y, held.id);
  if (held.kind === "item" && held.id === TREE_SEED)
    return plantTree(g, map, x, y);
  if (held.kind === "item" && treeOfSapling(held.id))
    return plantFruitTree(g, map, x, y, held.id);
  // Picking, shaking and harvesting are the Action button's job (note 47).
  return fail("nothing to do here");
}

/** The reason `act` gives when the tile holds nothing to act on. It shows no message. */
export const NOTHING_TO_ACT_ON = "nothing to act on";

/** Shake a tree, pick forage or harvest a crop: what the hand does on one tile. */
function pick(g: GameState, x: number, y: number): Outcome {
  if (g.trees.at(x, y)) return shake(g, x, y);
  if (g.fruitTrees.at(x, y)) return pickFruit(g, x, y);
  if (g.sprinklers.at(x, y)) return pickUpSprinkler(g, x, y);
  if (g.machines.at(x, y)) return handOnMachine(g, x, y);
  return g.forage.itemAt(x, y) ? forage(g, x, y) : harvest(g, x, y);
}

/**
 * The Action button on one tile (note 47): shake a tree, pick forage or harvest
 * a ripe crop. It never reads the held slot. A tile with nothing to act on gives
 * `NOTHING_TO_ACT_ON`, which shows no message and costs no energy. Other refusals,
 * such as a full backpack, still explain themselves.
 *
 * Services and eating are the scene's to do; this covers the farm tiles only.
 */
export function act(g: GameState, map: FarmMap, x: number, y: number): Outcome {
  if (!map.hasSoil) return fail(NOTHING_TO_ACT_ON);
  const result = pick(g, x, y);
  if (result.ok) return result;
  return QUIET.has(result.reason) ? fail(NOTHING_TO_ACT_ON) : result;
}

/** Misses that mean "nothing here" rather than "you could not". */
const QUIET = new Set(["nothing ripe", "nothing to shake", "nothing here"]);

const REASONS: Record<string, string> = {
  exhausted: "You are too tired.",
  "already tilled": "Already dug.",
  "nothing to water": "Dig the soil first.",
  "already watered": "Already watered.",
  "not a seed": "That cannot be planted.",
  "no seeds": "Out of seeds.",
  "cannot plant here": "Cannot plant here. Dig first, or wrong season.",
  "nothing ripe": "Nothing to pick here.",
  "backpack full": "Your backpack is full.",
  "cannot dig here": "The ground is too hard here.",
  "nothing to do here": "Nothing to do here.",
  "nothing held": "Select a tool or item.",
  "nothing to chop": "Nothing to chop here.",
  "a weed is in the way": "Clear the weed first.",
  "no weed": "No weed here.",
  "not a fertilizer": "That cannot be mixed into soil.",
  "no fertilizer": "Out of fertilizer.",
  "nothing to fertilize": "Dig the soil first.",
  "already fertilized": "This soil already has fertilizer.",
  "too late to fertilize": "Too late. Use it before the seed sprouts.",
  "a sprinkler is in the way": "A sprinkler is there. Pick it up first.",
  "not a sprinkler": "That is not a sprinkler.",
  "no sprinkler": "Out of sprinklers.",
  "cannot place here": "Place it on clear, diggable ground.",
  "furniture needs the house": "Furniture goes in the house.",
  "not furniture": "That is not furniture.",
  "no furniture": "Out of furniture.",
  "a machine is in the way": "A machine is there. Pick it up first.",
  "machine in the way": "A machine is there.",
  "a chest is in the way": "A chest is there. Empty it and pick it up first.",
  "not a chest": "That is not a chest.",
  "no chest": "Out of chests.",
  "chest not empty": "Empty the chest before picking it up.",
  "chest will not move": "The chest will not budge that way.",
  "camp chest empty": "The lamp-keepers have left nothing more today.",
  "not a machine": "That is not a machine.",
  "no machine": "Out of machines.",
  "no machine here": "No machine here.",
  "takes nothing": "It works on its own.",
  "machine busy": "It is still working.",
  "machine empty": "It is empty.",
  "cellar only": "Casks stand in the cellar.",
  "cask busy": "The cask is already ageing something.",
  "cask empty": "The cask is empty.",
  "cask not empty": "Take the good out of the cask first.",
  "cask will not take that": "A cask takes wine, mead and cheese.",
  "cellar full": "The cellar has no room for another cask.",
  "no cask": "Out of casks.",
  "no cask here": "No cask here.",
  "machine will not take that": "It cannot use that.",
  "not enough input": "You need more of that.",
  "no such recipe": "There is no such recipe.",
  "recipe not known": "You do not know that recipe yet.",
  "missing ingredients": "You are missing ingredients.",
  "a tree is in the way": "A tree is in the way.",
  "nothing to mine": "Nothing to break here.",
  "no furnace": "There is no furnace yet.",
  "furnace busy": "The furnace is busy.",
  "not enough ore": "You need 5 ore.",
  "not enough coal": "You need 1 coal.",
  "nothing smelting": "Nothing is smelting.",
  "not done": "It is not done yet.",
  "nothing to shake": "Nothing falls from there.",
  "cannot plant tree here": "A tree cannot grow there.",
  "too close to another tree":
    "Too close to another tree. Fruit trees need a clear 3x3.",
  "not a sapling": "That is not a sapling.",
  "no sapling": "Out of saplings.",
  "no kitchen": "You need a kitchen to cook.",
  "not food": "That cannot be eaten.",
  "nothing to eat": "Select food to eat.",
  "not hungry": "You are not tired.",
  [NOTHING_TO_ACT_ON]: "",
};

/** Words for a refused action, for the player. */
export function reasonText(reason: string): string {
  return REASONS[reason] ?? reason;
}
