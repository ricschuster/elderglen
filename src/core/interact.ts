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
import {
  CATALOGUE_ITEM,
  furnitureById,
  pickUpFurniture,
  placeFurniture,
} from "./furniture";
import { CELLAR_MAP, isHouseMap } from "./house";
import { isLight, lightAt, pickUpLight, placeLight } from "./lights";
import { LIGHTNING_ROD, pickUpRod, placeRod, rodAt } from "./lightning";
import type { FarmMap } from "./map";
import { FACING_STEP, type Facing } from "./movement";
import { pondCovering, pondUse, takeFish } from "./pond";
import { POT_ITEM, baitPot, collectPot, pickUpPot, placePot } from "./pots";
import { rngOf } from "./rng";
import type { PlayerId } from "./players";
import type { GameState } from "./save";
import { baitById } from "./tackle";
import { heldAt, isLiftTool, type Held } from "./toolbar";
import { useHeld } from "./tools";
import { sfxForAct } from "./audio";
import { caskDone, caskStatus, collectCask } from "./cask";
import { SPIRIT_STATUE, giveToSpirit, hermitStock } from "./elderfruit";
import { festivalDayToday, isFestivalMap } from "./festivals";
import { CAMP_LINE, HERMIT_LINE } from "./forestfolk";
import { CAVE_MAP } from "./cave";
import { LEVER_KIND } from "./danger";
import { COVE_TREASURE } from "./cove";
import { CART_KIND, type Service } from "./map";
import { PIER_FLOAT_KIND, PIER_KEEPER_KIND } from "./marketpier";
import { stallOf } from "./nightmarket";
import { QUARRY_BRIDGE_LINE } from "./quarry";
import { roadNews } from "./roadnews";
import { sellerProblem } from "./courtship";
import { herbStallProblem } from "./roomrewards";
import { SHRINE_SERVICE } from "./shrine";
import { counterShopId, counterShutLine } from "./shophours";
import { DYE_POTS_SERVICE, SEWING_SERVICE, tailoringLine } from "./tailoring";
import { traderProblem } from "./trader";
import { standInLine } from "./labels";
import { itemById } from "./items";
import { packWaiting, takePack } from "./lightning";
import { NOTHING_TO_ACT_ON, act } from "./tools";

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
  if (isLight(lightAt(g, mapId, x, y)?.id))
    return report(pickUpLight(g, mapId, x, y));
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
  if (mapId === CELLAR_MAP || isFarmMap(mapId)) {
    // Casks stand on the farm or in the cellar but take goods only in the
    // cellar: a held cask is stood down, a held good goes in (the cellar only),
    // and the axe or pickaxe takes a good out, or an empty cask up.
    const cask = g.casks.at(x, y, mapId);
    if (held.kind === "item" && held.id === CASK && !cask)
      return report(placeCask(g, map, x, y, mapId));
    if (cask && held.kind === "item")
      return report(loadCask(g, x, y, held.id, mapId));
    if (cask && isLiftTool(held)) return report(handOnCask(g, x, y, mapId));
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

/** What the Action button did, for the scene to show. State rules have already run. */
export type ActionIntent =
  /** Nothing here, and nothing said. */
  | { kind: "none" }
  /** Show this line (and play `cue` first, if given). */
  | { kind: "message"; text: string; cue?: string }
  /** Open the screen `scene` with its data (`cue` plays first). */
  | {
      kind: "open";
      scene: string;
      data?: Record<string, unknown>;
      cue?: string;
    }
  /** A rule that placed or took something: the outcome's sound and line. */
  | { kind: "report"; result: Outcome }
  /** A harvest, pick or shake: `cue` is the sound; the outcome's line shows, silently otherwise. */
  | { kind: "act"; result: Outcome; cue?: string }
  /** Nothing to act on, and the held food is eaten. */
  | { kind: "eat" }
  /** Scene-owned follow-ups: they move the player, run a minigame or read the scene's own state. */
  | { kind: "ride-cart"; id: string }
  | { kind: "pier-keeper" }
  | { kind: "pier-float" }
  | { kind: "shrine" }
  | { kind: "mend-bridge" }
  | { kind: "treasure" }
  | { kind: "stonekeeper" }
  | { kind: "festival" }
  | { kind: "festival-action"; service: Service }
  | { kind: "camp-chest"; floor: number }
  | { kind: "cave"; service?: string }
  | { kind: "descend" }
  | { kind: "stairs" };

/** What Action also needs: the mine's ladder, which is scene state. */
export interface ActionContext extends UseContext {
  /** The mine ladder stands here. */
  ladderAt: (x: number, y: number) => boolean;
}

const reported = (result: Outcome): ActionIntent => ({
  kind: "report",
  result,
});
const say = (text: string): ActionIntent => ({ kind: "message", text });
const open = (
  scene: string,
  data?: Record<string, unknown>,
  cue?: string,
): ActionIntent => ({
  kind: "open",
  scene,
  ...(data ? { data } : {}),
  ...(cue ? { cue } : {}),
});
/** A line when there is a problem, else the screen. */
const gated = (
  problem: string | undefined,
  scene: string,
  data: Record<string, unknown>,
): ActionIntent => (problem ? say(problem) : open(scene, data));

/**
 * The Action button on the faced tile (note 47, 106): open a service, else shake, pick or harvest,
 * else eat the held food. Runs the rule as player `by` and returns the intent. The scene has
 * already dealt with the horse, a villager to talk to and the lantern line.
 */
export function resolveAction(
  g: GameState,
  by: PlayerId,
  ctx: ActionContext,
  held: Held,
  aim: { x: number; y: number },
): ActionIntent {
  return asPlayer(g, by, () => actOn(g, ctx, held, aim.x, aim.y));
}

function serviceAction(
  g: GameState,
  ctx: ActionContext,
  service: Service,
): ActionIntent | undefined {
  const { kind } = service;
  if (kind === CART_KIND) return { kind: "ride-cart", id: service.id };
  if (kind === "market-stall" && stallOf(service.id))
    return open("market", { stall: stallOf(service.id) });
  if (kind === SEWING_SERVICE || kind === DYE_POTS_SERVICE) {
    const line = tailoringLine(g);
    if (line) return say(line);
    return open("tailor", { mode: kind === SEWING_SERVICE ? "sew" : "dye" });
  }
  if (kind === "herb-stall")
    return gated(herbStallProblem(g), "shop", { stock: "herb" });
  if (kind === "fisher-shop") return open("shop", { stock: "fisher" });
  if (kind === "pin-stall") return open("shop", { stock: "pin" });
  if (kind === PIER_KEEPER_KIND) return { kind: "pier-keeper" };
  if (kind === PIER_FLOAT_KIND) return { kind: "pier-float" };
  if (kind === "keeper") return open("keeper");
  if (kind === "hermit")
    return hermitStock(g).length > 0
      ? open("shop", { stock: "hermit" })
      : say(HERMIT_LINE);
  if (kind === SPIRIT_STATUE) return say(giveToSpirit(g));
  if (kind === SHRINE_SERVICE) return { kind: "shrine" };
  if (kind === "camp") return say(CAMP_LINE);
  if (kind === "tide-bridge") return { kind: "mend-bridge" };
  if (kind === "quarry-bridge") return say(QUARRY_BRIDGE_LINE);
  if (kind === "board-news") return say(roadNews(g.day.clock.day, g.tomorrow));
  if (kind === "rain-seller")
    return gated(sellerProblem(g), "shop", { stock: "rain" });
  if (kind === "trader")
    return gated(traderProblem(g.day.clock.day, g.day.clock.minutes), "shop", {
      stock: "trader",
    });
  if (kind === "counter-library") return open("gallery");
  const line = standInLine(kind);
  if (line) return say(line);
  if (kind === COVE_TREASURE) return { kind: "treasure" };
  if (kind === "stonekeeper") return { kind: "stonekeeper" };
  if (kind === "festival") return { kind: "festival" };
  if (kind === "camp-chest" && ctx.floor !== undefined)
    return { kind: "camp-chest", floor: ctx.floor };
  if (kind === LEVER_KIND && ctx.floor !== undefined) {
    const on = g.mines.flipDangerous();
    return {
      kind: "message",
      cue: "mine.stairs",
      text:
        on === undefined
          ? "The lever will not move yet."
          : on
            ? "From tomorrow, the mine is dangerous: harder, with richer rewards."
            : "From tomorrow, the mine is calm.",
    };
  }
  if (kind === "ore-bin") return open("bin", { oreOnly: true });
  if (kind === "trainer") return open("trainer");
  if (kind === "wall-list") return open("walllist");
  if (kind === "lost-found") return open("lostfound");
  if (kind === "dummy")
    return say("The training dummy. Hold a weapon and swing at it.");
  if (kind === "stairs") return { kind: "stairs" };
  if (
    isFestivalMap(ctx.mapId) ||
    kind === "cake-table" ||
    (kind === "festival-counter" && festivalDayToday(g.day.clock.day))
  )
    return { kind: "festival-action", service };
  if (ctx.mapId === CAVE_MAP) return { kind: "cave", service: kind };
  if (kind === "furnace")
    return g.furnace.gifted ? open("furnace") : say("Nothing is here yet.");
  return undefined;
}

function actOn(
  g: GameState,
  ctx: ActionContext,
  held: Held,
  x: number,
  y: number,
): ActionIntent {
  const { map, mapId } = ctx;
  const service = map.serviceAt(x, y);
  const shut = service ? counterShutLine(g, mapId, service.kind) : "";
  if (shut) return say(shut);
  if (service) {
    const sid = counterShopId(mapId, service.kind);
    if (sid) g.guide.visitShop(sid);
    const done = serviceAction(g, ctx, service);
    if (done) return done;
  } else if (mapId === CAVE_MAP) return { kind: "cave" };
  if (ctx.ladderAt(x, y)) return { kind: "descend" };
  if (service)
    return open(
      service.kind,
      service.kind === "hall" ? { room: service.id } : undefined,
    );
  if (g.casks.at(x, y, mapId)) {
    // Action reads a cask and takes a gold good out. Taking one out early is
    // the axe or pickaxe's job, so a stray press never resets the ageing.
    const cask = g.casks.get(x, y, mapId)!;
    if (!cask.job) return reported({ ok: false, reason: "cask empty" });
    if (!caskDone(g, cask)) return say(caskStatus(g, x, y, mapId));
    return reported(collectCask(g, x, y, mapId));
  }
  if (isFarmMap(mapId) && packWaiting(g, x, y))
    return reported(takePack(g, x, y));
  if (g.pots.get(mapId, x, y))
    return reported(collectPot(g, mapId, x, y, rngOf(g)));
  if (g.chests.at(mapId, x, y))
    return open("chest", { mapId, x, y }, "chest.open");
  if (isHouseMap(mapId)) {
    const piece = g.furniture.at(mapId, x, y);
    if (furnitureById(piece)?.station === "workbench")
      return open("crafting", { bench: { mapId, x, y } });
    if (piece === CATALOGUE_ITEM) return open("catalogue");
    if (piece) return reported(pickUpFurniture(g, mapId, x, y));
  }
  const pond = isFarmMap(mapId) ? pondCovering(g, x, y) : undefined;
  if (pond) {
    const r = pondUse(g, pond, held.kind === "item" ? held.id : undefined);
    // Nothing to put in, take or give: the pond menu shows how it stands.
    if (r.ok && r.item === undefined)
      return open("pond", { x: pond.x, y: pond.y });
    return reported(r);
  }
  const cropHere = !!g.farm.plotAt(x, y)?.crop;
  const result = act(g, map, x, y);
  if (!result.ok && result.reason === NOTHING_TO_ACT_ON)
    return held.kind === "item" && itemById(held.id)?.energy !== undefined
      ? { kind: "eat" }
      : { kind: "none" };
  const cue = sfxForAct(result, cropHere);
  return cue ? { kind: "act", result, cue } : { kind: "act", result };
}
