import type { Outcome } from "./actions";
import { asPlayer } from "./asplayer";
import { depositHay, HAY, siloBlocks, siloCapacity } from "./animals";
import { sfxForUse } from "./audio";
import { isBomb, placeBomb, type LitBomb } from "./bombs";
import { CASK, handOnCask, loadCask, placeCask } from "./cask";
import { chestById, pickUpChest, placeChest, pushChest } from "./chests";
import { isWeapon, weaponById, type WeaponDef } from "./combat";
import { applyDecor, decorById } from "./decor";
import {
  farmDecorAt,
  isFarmDecor,
  pickUpFarmDecor,
  placeFarmDecor,
} from "./farmdecor";
import { isFarmMap } from "./farmtypes";
import { rodById } from "./fishing";
import { furnitureById, pickUpFurniture, placeFurniture } from "./furniture";
import { CELLAR_MAP, isHouseMap } from "./house";
import { isLight, lightAt, pickUpLight, placeLight } from "./lights";
import { LIGHTNING_ROD, pickUpRod, placeRod, rodAt } from "./lightning";
import type { FarmMap } from "./map";
import { FACING_STEP, type Facing } from "./movement";
import { pondCovering, takeFish } from "./pond";
import { POT_ITEM, baitPot, pickUpPot, placePot } from "./pots";
import type { PlayerId } from "./players";
import type { GameState } from "./save";
import { baitById } from "./tackle";
import { heldAt, isLiftTool, type Held } from "./toolbar";
import { useHeld } from "./tools";

/**
 * Rules for what the Use button does, free of Phaser (note 106). Each function
 * returns an intent for the scene to act on: a message to show, or undefined
 * when the tile is not this rule's business.
 */

/**
 * Facing the silo: tip the held hay in, or read how full it is.
 * Returns the message, or undefined if the tile is not the silo.
 */
export function useSiloIntent(
  state: GameState,
  mapId: string,
  tx: number,
  ty: number,
  selected: number,
): string | undefined {
  return useSiloAt(state, mapId, tx, ty, heldAt(state, selected));
}

/** What the scene tells the resolvers about the place: the map, the floor, the facing and what stands where. */
export interface UseContext {
  mapId: string;
  map: FarmMap;
  /** The mine floor, if in the mine. */
  floor?: number;
  facing: Facing;
  /** A rock or boulder stands here (the mine's rocks are scene state). */
  rockAt: (x: number, y: number) => boolean;
  /** A lit bomb sits here. */
  litBombAt: (x: number, y: number) => boolean;
  /** A villager stands here (a person is talked to, never worked on). */
  personAt: (x: number, y: number) => boolean;
}

/**
 * What the Use button did, for the scene to show. The rule has already run on the game state
 * (a placed pot, a till, a chopped tree); the intent says what is left to do: a message, a sound,
 * a swing or a cast, a bomb to tick.
 */
export type UseIntent =
  /** The tile is not Use's business: say nothing. */
  | { kind: "none" }
  /** Show this line. */
  | { kind: "message"; text: string }
  /** Swing the held weapon (the scene runs the attack). */
  | { kind: "swing"; weapon: WeaponDef }
  /** Cast the held rod (the scene opens the fishing bar). */
  | { kind: "cast"; rod: string }
  /** A placement or a pick up: play the outcome's sound and show its line. A lit bomb joins the fuse list. */
  | { kind: "report"; result: Outcome; bomb?: LitBomb }
  /** A tool or item worked the tile: `cue` is the sound, and the world's holds may have changed. */
  | { kind: "tool"; result: Outcome; cue?: string };

const report = (result: Outcome, bomb?: LitBomb): UseIntent =>
  bomb ? { kind: "report", result, bomb } : { kind: "report", result };

/**
 * The Use button on the faced tile (note 47, 106): the held weapon, the rod, placing and lifting
 * things, then the held tool on the soil. Runs the rule as player `by` and returns the intent.
 * The one copy of each tool's rule: the host's own Use and a guest's intents both come here.
 */
export function resolveUse(
  g: GameState,
  by: PlayerId,
  ctx: UseContext,
  held: Held,
  aim: { x: number; y: number },
): UseIntent {
  return asPlayer(g, by, () => useOn(g, ctx, held, aim.x, aim.y));
}

function useOn(
  g: GameState,
  ctx: UseContext,
  held: Held,
  x: number,
  y: number,
): UseIntent {
  const { map, mapId } = ctx;
  const weapon =
    held.kind === "item" && isWeapon(held.id) ? weaponById(held.id) : undefined;
  if (weapon) return { kind: "swing", weapon };
  if (map.serviceAt(x, y)) return { kind: "none" };
  if (ctx.personAt(x, y)) return { kind: "none" };
  const silo = useSiloAt(g, mapId, x, y, held);
  if (silo !== undefined) return { kind: "message", text: silo };
  // The rod lifts a fish out of a pond: no bar, no bait (note 93).
  const pond = isFarmMap(mapId) ? pondCovering(g, x, y) : undefined;
  if (pond && held.kind === "item" && rodById(held.id))
    return report(takeFish(g, pond.x, pond.y));
  if (held.kind === "item" && rodById(held.id))
    return { kind: "cast", rod: held.id };
  // A pot goes on the water, bait goes in a pot, and the axe or pickaxe takes an empty one up.
  if (held.kind === "item" && held.id === POT_ITEM)
    return report(placePot(g, map, mapId, x, y));
  if (held.kind === "item" && baitById(held.id) && g.pots.get(mapId, x, y))
    return report(baitPot(g, mapId, x, y, held.id));
  if (isLiftTool(held) && g.pots.get(mapId, x, y))
    return report(pickUpPot(g, mapId, x, y));
  // A bomb is lit from the backpack and cannot be lifted (note 89).
  if (held.kind === "item" && isBomb(held.id)) {
    const lit = placeBomb(
      g,
      map,
      mapId,
      x,
      y,
      held.id,
      (bx, by) => ctx.rockAt(bx, by) || ctx.litBombAt(bx, by),
    );
    return lit.ok ? report({ ok: true }, lit.bomb) : report(lit);
  }
  // A farm decoration is stood down from the pack and lifted by hand, like a light (note 89).
  if (held.kind === "item" && isFarmDecor(held.id))
    return report(
      placeFarmDecor(g, map, mapId, x, y, held.id, (px, py) =>
        ctx.rockAt(px, py),
      ),
    );
  if (isFarmMap(mapId) && farmDecorAt(g, x, y))
    return report(pickUpFarmDecor(g, x, y));
  // A light is stood down from the backpack, and any tool or the empty hand lifts one.
  if (held.kind === "item" && isLight(held.id))
    return report(
      placeLight(g, map, mapId, x, y, held.id, (px, py) => ctx.rockAt(px, py)),
    );
  if (lightAt(g, mapId, x, y)) return report(pickUpLight(g, mapId, x, y));
  // A lightning rod is stood down from the backpack, and any tool or the empty hand lifts one.
  if (held.kind === "item" && held.id === LIGHTNING_ROD)
    return report(placeRod(g, map, mapId, x, y));
  if (isFarmMap(mapId) && rodAt(g, x, y)) return report(pickUpRod(g, x, y));
  // A chest is stood down from the backpack (a big one on a small one swaps it in).
  if (held.kind === "item" && chestById(held.id))
    return report(placeChest(g, map, mapId, x, y, held.id));
  // Any tool takes an empty chest up, and pushes one with items in it one
  // tile along (SC-56; the Chest wiki page says any tool).
  if (held.kind === "tool" && g.chests.at(mapId, x, y)) {
    const taken = pickUpChest(g, mapId, x, y);
    if (taken.ok || taken.reason !== "chest not empty") return report(taken);
    const step = FACING_STEP[ctx.facing];
    return report(pushChest(g, map, mapId, x, y, step.x, step.y));
  }
  if (mapId === CELLAR_MAP) {
    // Casks stand in the cellar: a held cask is stood down, a held good goes in,
    // and the axe or pickaxe takes a good out, or an empty cask up.
    const cask = g.casks.at(x, y);
    if (held.kind === "item" && held.id === CASK && !cask)
      return report(placeCask(g, map, x, y));
    if (cask && held.kind === "item") return report(loadCask(g, x, y, held.id));
    if (cask && isLiftTool(held)) return report(handOnCask(g, x, y));
  }
  if (isHouseMap(mapId)) {
    // In the house the held piece is stood down, and the axe or pickaxe takes one up.
    if (held.kind === "item" && decorById(held.id))
      return report(applyDecor(g, mapId, x, y, held.id));
    if (held.kind === "item" && furnitureById(held.id))
      return report(placeFurniture(g, map, mapId, x, y, held.id));
    if (isLiftTool(held) && g.furniture.at(mapId, x, y))
      return report(pickUpFurniture(g, mapId, x, y));
  }
  const treeBefore = g.trees.at(x, y)?.stump === false;
  const machineBefore = !!g.machines.at(x, y);
  const result = useHeld(g, map, held, x, y, ctx.floor);
  const cue = sfxForUse(held, result, ctx.floor !== undefined, {
    treeHere: treeBefore,
    machineHere: machineBefore,
  });
  return cue ? { kind: "tool", result, cue } : { kind: "tool", result };
}

/** The silo rule for an already-read held thing (`useSiloIntent` reads the slot itself). */
function useSiloAt(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  held: Held,
): string | undefined {
  if (!siloBlocks(g, mapId, x, y)) return undefined;
  const cap = siloCapacity(g);
  if (held.kind === "item" && held.id === HAY) {
    const n = depositHay(g);
    return n > 0
      ? `${n} hay into the silo (${g.animals.hay}/${cap}).`
      : "The silo is full.";
  }
  return `The silo holds ${g.animals.hay} of ${cap} hay. Hold hay to fill it.`;
}
