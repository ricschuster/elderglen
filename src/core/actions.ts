import { dateOf } from "./calendar";
import { CROPS, FLOWER_CROPS, cropById } from "./crops";
import { farmTypeById } from "./farmtypes";
import { ELDERFRUIT, HARDWOOD, cropOfSeed, itemById, seedId } from "./items";
import { eatElderfruit } from "./elderfruit";
import { fertilizerById, qualityLevelOf } from "./fertilizer";
import { HEALTH_PER_ENERGY } from "./combat";
import { doubleForageChance, forageFloor } from "./professions";
import { cropQuality, forageQuality, withQuality } from "./quality";
import { FORAGE_XP, harvestXp, type Skill } from "./skills";
import type { GameState } from "./save";
import {
  TEA_CHOP_AXE_TIER,
  TEA_CHOP_HITS,
  TEA_LEAF,
  TEA_SAPLING,
  isTeaMature,
  type TeaBushes,
} from "./teabush";
import type { FarmMap, TreeKind } from "./map";
import type { Farm } from "./farm";
import {
  MATURE_STAGE,
  SEED_STAGE,
  TREE_SEED,
  MOSS_MIN,
  MOSS_MAX,
  YOUNG_STAGE,
  swingsToFell,
  swingsToUproot,
} from "./trees";
import { swingCost, type Upgradable } from "./upgrades";
import { sprinklerById, type Sprinklers } from "./sprinklers";
import { FARM_STORE, GREENHOUSE_STORE, storeOf } from "./mapstore";
import {
  isMature,
  saplingId,
  treeOfSapling,
  type FruitTrees,
} from "./fruittrees";
import { FIBER, FIBER_CHANCE, MIXED_SEED } from "./weeds";
import { TWIG_WOOD } from "./debris";
import { isRaining } from "./weather";
import { noteGathered } from "./quests";
import { goodOfTree, HEAVY_TAPPER, tapReady, TAPPER } from "./tapper";
import { mayPlaceOn, placeTag } from "./placeables";
import {
  MAHOGANY_HARDWOOD,
  MAHOGANY_SEED,
  MAHOGANY_SEED_CHANCE,
  STUMP_SEED_AREA,
  STUMP_SEED_CHANCE,
  fruitTreeNear,
  kindOfSeed,
  isMahogany,
  seedOfKind,
} from "./mahogany";

/** Energy per tool swing (hoe, watering can), as in Stardew. Seeds, picking and harvesting are free. */
export const TOOL_ENERGY = 2;

export type Outcome =
  | { ok: false; reason: string }
  | {
      ok: true;
      levelUp?: { skill: Skill; level: number };
      item?: string;
      /** A line to show the player, such as what a machine will make. */
      note?: string;
      /** A ladder was revealed under the broken rock. */
      ladder?: boolean;
    };

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** Spend tool energy. The clock runs in real time, so actions take no game minutes. */
function swing(g: GameState, tool: Upgradable): void {
  const cost = swingCost(
    TOOL_ENERGY,
    g.toolTiers[tool],
    g.skills.level("farming"),
  );
  g.day.act(cost, 0);
}

function award(g: GameState, skill: Skill, xp: number, item?: string): Outcome {
  const level = g.skills.gain(skill, xp);
  return { ok: true, item, levelUp: level ? { skill, level } : undefined };
}

/** Every action is refused once the day is over, so the scene must sleep first. */
/** Chance that tilling winter soil turns something up, and the share of finds that are frost root. Placeholders (note 07). */
export const WINTER_DIG_CHANCE = 0.03;
export const FROST_ROOT_SHARE = 2 / 3;
/** Chance that tilling soil in any season turns up clay. Stardew's chance is not in the saved page: placeholder (note 23). */
export const CLAY_CHANCE = 0.03;

export function till(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
  /** The soil dug: the farm's, or the greenhouse's. */
  soil: Farm = g.farm,
): Outcome {
  if (g.day.over) return fail("exhausted");
  // Each map has its own fruit trees and sprinklers (`mapstore.ts`).
  const here = storeOf(g, soil.indoors);
  if (here.fruitTrees.at(x, y)) return fail("a tree is in the way");
  if (here.teaBushes.at(x, y)) return fail("a tea bush is in the way");
  if (here.sprinklers.at(x, y)) return fail("a sprinkler is in the way");
  // Trees, weeds and the rest stand on the farm's tiles, not the greenhouse's.
  if (soil.indoors && g.placed.covering(GREENHOUSE_STORE, x, y))
    return fail("garden pot in the way");
  if (!soil.indoors) {
    if (g.trees.at(x, y)) return fail("a tree is in the way");
    if (g.weeds.at(x, y)) return fail("a weed is in the way");
    if (g.twigs.at(x, y)) return fail("a twig is in the way");
    if (g.machines.at(x, y)) return fail("a machine is in the way");
    if (g.chests.onFarm(x, y)) return fail("a chest is in the way");
    if (g.placed.covering(FARM_STORE, x, y))
      return fail("a light is in the way");
  }
  if (!soil.till(x, y)) return fail("already tilled");
  if (!soil.indoors && isRaining(g.weather)) soil.water(x, y);
  swing(g, "hoe");
  if (
    dateOf(g.day.clock.day).season === "winter" &&
    random() < WINTER_DIG_CHANCE
  ) {
    const found = random() < FROST_ROOT_SHARE ? "frost-root" : "snow-tuber";
    if (!g.inventory.add(found)) g.ground.drop(x, y, found, 1);
    return { ok: true, item: found };
  }
  if (random() < CLAY_CHANCE) {
    if (!g.inventory.add("clay")) g.ground.drop(x, y, "clay", 1);
    return { ok: true, item: "clay" };
  }
  return { ok: true };
}

export function water(
  g: GameState,
  x: number,
  y: number,
  soil: Farm = g.farm,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const plot = soil.plotAt(x, y);
  if (!plot) return fail("nothing to water");
  if (plot.wateredToday) return fail("already watered");
  soil.water(x, y);
  swing(g, "can");
  return { ok: true };
}

/** Plant a seed item from the backpack in the current season. */
export function plant(
  g: GameState,
  x: number,
  y: number,
  seed: string,
  random: () => number = Math.random,
  soil: Farm = g.farm,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const season = dateOf(g.day.clock.day).season;
  // A mixed seed grows a random crop that suits the season (any, indoors).
  const fits = CROPS.filter((c) => soil.indoors || c.seasons.includes(season));
  const cropId =
    seed === MIXED_SEED
      ? fits[Math.floor(random() * fits.length)]?.id
      : cropOfSeed(seed);
  if (!cropId) return fail("not a seed");
  if (g.inventory.count(seed) < 1) return fail("no seeds");
  if (!soil.indoors && g.weeds.at(x, y)) return fail("a weed is in the way");
  if (!soil.plant(x, y, cropId, season)) return fail("cannot plant here");
  g.inventory.remove(seed);
  return { ok: true };
}

/** Mix a fertilizer from the backpack into tilled soil. Free, like planting. */
export function fertilize(
  g: GameState,
  x: number,
  y: number,
  id: string,
  soil: Farm = g.farm,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!fertilizerById(id)) return fail("not a fertilizer");
  if (g.inventory.count(id) < 1) return fail("no fertilizer");
  const why = soil.fertilize(x, y, id);
  if (why) return fail(why);
  g.inventory.remove(id);
  return { ok: true };
}

export function harvest(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
  soil: Farm = g.farm,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const cropId = soil.plotAt(x, y)?.crop?.id;
  if (!cropId || !soil.isRipe(x, y)) return fail("nothing ripe");
  const item = withQuality(
    cropId,
    cropQuality(
      g.skills.level("farming"),
      random(),
      qualityLevelOf(soil.plotAt(x, y)?.fertilizer),
    ),
  );
  const count = cropById(cropId)?.yield ?? 1;
  if (g.inventory.room(item) < count) return fail("backpack full");
  soil.harvest(x, y);
  g.inventory.add(item, count);
  noteGathered(g, item, count);
  const price = cropById(cropId)?.sellPrice ?? 0;
  return award(g, "farming", harvestXp(price), item);
}

export function forage(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const id = g.forage.itemAt(x, y);
  if (!id) return fail("nothing here");
  const item = withQuality(
    id,
    forageFloor(g.skills, forageQuality(g.skills.level("foraging"), random())),
  );
  if (g.inventory.room(item) < 1) return fail("backpack full");
  g.forage.collect(x, y);
  g.inventory.add(item);
  noteGathered(g, item);
  // Gatherers sometimes find a second one, if it fits.
  if (random() < doubleForageChance(g.skills) && g.inventory.add(item))
    noteGathered(g, item);
  // A wild flower seed packet now and then (note 91), if it fits.
  const season = dateOf(g.day.clock.day).season;
  const flowers = FLOWER_CROPS.filter((c) => c.seasons.includes(season));
  if (
    flowers.length > 0 &&
    random() < WILD_FLOWER_SEED_CHANCE &&
    g.inventory.room(seedId(flowers[0]!.id)) > 0
  ) {
    const pick = flowers[Math.floor(random() * flowers.length)] ?? flowers[0]!;
    g.inventory.add(seedId(pick.id));
  }
  return award(g, "foraging", FORAGE_XP, item);
}

/** Chance a forage pickup also turns up a flower seed packet (note 91, placeholder). */
export const WILD_FLOWER_SEED_CHANCE = 0.02;

/** Eat one of an item from the backpack to restore energy. Takes no game time. */
export function eat(g: GameState, itemId: string): Outcome {
  if (itemId === ELDERFRUIT) {
    // Eaten at once, no health restored (note 39).
    const r = eatElderfruit(g);
    return r.ok ? { ok: true, item: itemId } : fail(r.reason);
  }
  const gain = itemById(itemId)?.energy;
  if (gain === undefined) return fail("not food");
  if (g.inventory.count(itemId) < 1) return fail("nothing to eat");
  if (g.day.energy.current >= g.day.energy.max && g.combat.health.full)
    return fail("not hungry");
  g.inventory.remove(itemId);
  g.day.energy.restore(gain);
  // Food heals too, a share of its energy value (note 22).
  g.combat.health.heal(Math.round(gain * HEALTH_PER_ENERGY));
  return { ok: true, item: itemId };
}

/** Wood from a young tree, as Stardew. */
const YOUNG_WOOD = 4;
/** Chance per foraging level that a seedling drops 1 wood. As Stardew. */
const SEEDLING_WOOD = 0.1;
/** Wood from a mature tree: 12, plus 1 per foraging level up to 4 (ours). */
const TREE_WOOD = 12;
const TREE_WOOD_BONUS_MAX = 4;
const TREE_SAP = 5;
const TREE_XP = 12;
/** A stump gives 4 to 9 wood, 1 sap and 1 XP. As Stardew. */
const STUMP_SAP = 1;
const STUMP_XP = 1;
/**
 * A large stump takes 3 more swings than a stump (ours), gives 2 hardwood (the
 * saved Hardwood page) and 3 XP (ours), and needs a copper axe or better
 * (`docs/design/44_tool_upgrades.md`).
 */
const LARGE_STUMP_EXTRA_SWINGS = 3;
const LARGE_STUMP_HARDWOOD = 2;
const LARGE_STUMP_XP = 3;
/** The axe tier that clears a large stump: copper. */
export const LARGE_STUMP_TIER = 1;

/** What a finished chop gives: goods for the backpack and foraging XP. */
interface Chop {
  swings: number;
  goods: [string, number][];
  xp: number;
}

function planChop(
  g: GameState,
  x: number,
  y: number,
  random: () => number,
): Chop | undefined {
  const t = g.trees.at(x, y);
  if (!t) return undefined;
  const level = g.skills.level("foraging");
  const goods = (...list: [string, number][]) => list.filter(([, n]) => n > 0);
  if (t.large) {
    if (t.regrow !== undefined) return undefined;
    // The Secret Woods daily stumps may give a Mahogany Seed (note 36).
    const seed =
      g.away?.mapId === STUMP_SEED_AREA && random() < STUMP_SEED_CHANCE ? 1 : 0;
    return {
      swings: swingsToUproot(g.toolTiers.axe) + LARGE_STUMP_EXTRA_SWINGS,
      goods: goods([HARDWOOD, LARGE_STUMP_HARDWOOD], [MAHOGANY_SEED, seed]),
      xp: LARGE_STUMP_XP,
    };
  }
  if (t.stump)
    return {
      swings: swingsToUproot(g.toolTiers.axe),
      goods: goods(["wood", 4 + Math.floor(random() * 6)], ["sap", STUMP_SAP]),
      xp: STUMP_XP,
    };
  if (t.stage === SEED_STAGE)
    return {
      swings: 1,
      goods: goods([seedOfKind(t.kind) ?? TREE_SEED, level >= 1 ? 1 : 0]),
      xp: 0,
    };
  if (t.stage < YOUNG_STAGE)
    return {
      swings: 1,
      goods: goods(["wood", random() < SEEDLING_WOOD * level ? 1 : 0]),
      xp: 0,
    };
  if (t.stage === YOUNG_STAGE)
    return { swings: 1, goods: goods(["wood", YOUNG_WOOD]), xp: 0 };
  if (isMahogany(t))
    // Hardwood and no wood; 0 to 1 seed back, so a grove is self-seeding.
    return {
      swings: swingsToFell(g.toolTiers.axe),
      goods: goods(
        [HARDWOOD, MAHOGANY_HARDWOOD],
        ["sap", TREE_SAP],
        [MAHOGANY_SEED, random() < MAHOGANY_SEED_CHANCE ? 1 : 0],
      ),
      xp: TREE_XP,
    };
  return {
    swings: swingsToFell(g.toolTiers.axe),
    goods: goods(
      ["wood", TREE_WOOD + Math.min(level, TREE_WOOD_BONUS_MAX)],
      ["sap", TREE_SAP],
      [
        seedOfKind(t.kind) ?? TREE_SEED,
        level >= 1 ? Math.floor(random() * 3) : 0,
      ],
    ),
    xp: TREE_XP,
  };
}

/**
 * The nearest open tile to a tree for goods that did not fit the backpack:
 * within 3 tiles, not blocked, not a tree. With no map, the tree's own tile.
 */
function dropSpot(
  g: GameState,
  map: FarmMap | undefined,
  x: number,
  y: number,
): { x: number; y: number } {
  if (!map) return { x, y };
  for (let r = 1; r <= 3; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const [tx, ty] = [x + dx, y + dy];
        if (!map.isBlocked(tx, ty) && !g.trees.blocks(tx, ty))
          return { x: tx, y: ty };
      }
  return { x, y };
}

/**
 * One swing of the axe at a tree, stump, young tree, seedling or seed. A tree
 * takes several swings, each costing energy, and falls on the last. Goods go
 * to the backpack; any that do not fit land on the ground nearby and are
 * pulled in by walking over them (`GroundItems`), so none are lost.
 */
export function chop(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
  map?: FarmMap,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (storeOf(g, !!map?.indoors).fruitTrees.at(x, y))
    return chopFruitTree(g, x, y, map);
  if (storeOf(g, !!map?.indoors).teaBushes.at(x, y))
    return chopTeaBush(g, x, y, map);
  const plan = planChop(g, x, y, random);
  const t = g.trees.at(x, y);
  if (!plan || !t) return fail("nothing to chop");
  if (t.cosmetic) return fail("cosmetic tree");
  if (t.large && g.toolTiers.axe < LARGE_STUMP_TIER)
    return fail("needs a better axe");
  g.day.act(
    swingCost(TOOL_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
    0,
  );
  if (t.hits + 1 < plan.swings) {
    t.hits += 1;
    return { ok: true };
  }
  for (const [id, n] of plan.goods) {
    const fits = Math.min(n, g.inventory.room(id));
    if (fits > 0 && g.inventory.add(id, fits)) noteGathered(g, id, fits);
    if (fits < n) {
      const spot = dropSpot(g, map, x, y);
      g.ground.drop(spot.x, spot.y, id, n - fits);
    }
  }
  if (t.large) {
    // A farm with no regrow days (Standard) loses the stump for good.
    // A map may set its own days (the Secret Woods); else the farm type decides.
    const days =
      map?.stumpRegrowDays ?? farmTypeById(g.farmType).stumpRegrowDays;
    if (days > 0) {
      t.regrow = days;
      t.hits = 0;
    } else g.trees.remove(x, y);
  } else if (!t.stump && t.stage === MATURE_STAGE) {
    // A tapper on a felled tree comes back to the player, with any good ready.
    if (t.tap) {
      const back = [
        t.tap.heavy ? HEAVY_TAPPER : TAPPER,
        ...(tapReady(g, t) ? [goodOfTree(t).item] : []),
      ];
      for (const id of back)
        if (!g.inventory.add(id, 1)) {
          const spot = dropSpot(g, map, x, y);
          g.ground.drop(spot.x, spot.y, id, 1);
        }
      delete t.tap;
    }
    t.stump = true;
    t.hits = 0;
  } else g.trees.remove(x, y);
  return plan.xp > 0
    ? award(g, "foraging", plan.xp, plan.goods[0]?.[0])
    : { ok: true, item: plan.goods[0]?.[0] };
}

/**
 * One swing of the axe at a fruit tree. A young tree falls in one swing, a
 * mature one takes as many as a common tree. It gives wood and returns its
 * sapling (`docs/design/31_farm_growth.md`); fruit on it is lost. Goods that do
 * not fit the backpack land on the ground nearby.
 */
function chopFruitTree(
  g: GameState,
  x: number,
  y: number,
  map?: FarmMap,
): Outcome {
  const trees = storeOf(g, !!map?.indoors).fruitTrees;
  const t = trees.at(x, y);
  if (!t) return fail("nothing to chop");
  const mature = isMature(t);
  const falls = !mature || t.hits + 1 >= swingsToFell(g.toolTiers.axe);
  const woodNow = mature
    ? TREE_WOOD + Math.min(g.skills.level("foraging"), TREE_WOOD_BONUS_MAX)
    : YOUNG_WOOD;
  // Nothing may be left on the ground indoors: the pile would land on the farm.
  if (
    falls &&
    map?.indoors &&
    (g.inventory.room("wood") < woodNow ||
      g.inventory.room(saplingId(t.id)) < 1)
  )
    return fail("backpack full");
  g.day.act(
    swingCost(TOOL_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
    0,
  );
  if (!falls) {
    t.hits += 1;
    return { ok: true };
  }
  const wood = woodNow;
  const sapling = saplingId(t.id);
  for (const [id, n] of [
    ["wood", wood],
    [sapling, 1],
  ] as const) {
    const fits = Math.min(n, g.inventory.room(id));
    if (fits > 0 && g.inventory.add(id, fits)) noteGathered(g, id, fits);
    if (fits < n) {
      const spot = dropSpot(g, map, x, y);
      g.ground.drop(spot.x, spot.y, id, n - fits);
    }
  }
  trees.remove(x, y);
  return mature
    ? award(g, "foraging", TREE_XP, "wood")
    : { ok: true, item: "wood" };
}

/**
 * Plant a fruit tree sapling on open ground. The 3x3 around it must hold no
 * other tree, fruit or common; weeds and objects only stop it growing
 * afterwards (`docs/design/29_weeds.md`).
 */
export function plantFruitTree(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const def = treeOfSapling(id);
  if (!def) return fail("not a sapling");
  if (g.inventory.count(id) < 1) return fail("no sapling");
  if (!map.canPlantTree(x, y) || !isClear(g, map, x, y))
    return fail("cannot plant tree here");
  const { fruitTrees } = storeOf(g, map.indoors);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (
        fruitTrees.at(x + dx, y + dy) ||
        (!map.indoors && g.trees.blocks(x + dx, y + dy))
      )
        return fail("too close to another tree");
  g.inventory.remove(id);
  fruitTrees.add(x, y, def.id);
  return { ok: true };
}

/**
 * Plant a tea sapling (note 97). It needs open ground like a fruit tree, but no
 * clear 3x3: bushes may stand side by side, as a fence. Not planted in areas.
 */
export function plantTeaBush(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (g.inventory.count(TEA_SAPLING) < 1) return fail("no sapling");
  if (g.away) return fail("cannot plant tree here");
  if (!map.canPlantTree(x, y) || !isClear(g, map, x, y))
    return fail("cannot plant tree here");
  g.inventory.remove(TEA_SAPLING);
  storeOf(g, map.indoors).teaBushes.add(x, y);
  return { ok: true };
}

/**
 * One swing of the axe at a tea bush. A young bush comes up in one swing; a
 * mature one takes two swings and a gold or iridium axe. The sapling comes
 * back (note 97). Refused when the backpack has no room, so it is never lost.
 */
function chopTeaBush(
  g: GameState,
  x: number,
  y: number,
  map?: FarmMap,
): Outcome {
  const bushes = storeOf(g, !!map?.indoors).teaBushes;
  const b = bushes.at(x, y);
  if (!b) return fail("nothing to chop");
  const mature = isTeaMature(b);
  if (mature && g.toolTiers.axe < TEA_CHOP_AXE_TIER)
    return fail("needs a better axe");
  const falls = !mature || b.hits + 1 >= TEA_CHOP_HITS;
  if (falls && g.inventory.room(TEA_SAPLING) < 1) return fail("backpack full");
  g.day.act(
    swingCost(TOOL_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
    0,
  );
  if (!falls) {
    b.hits += 1;
    return { ok: true };
  }
  g.inventory.add(TEA_SAPLING, 1);
  noteGathered(g, TEA_SAPLING, 1);
  bushes.remove(x, y);
  return { ok: true, item: TEA_SAPLING };
}

/** Pick the waiting tea leaf by hand. */
export function pickTeaLeaves(
  g: GameState,
  x: number,
  y: number,
  bushes: TeaBushes = g.teaBushes,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const b = bushes.at(x, y);
  if (!b || b.leaves < 1) return fail("nothing ripe");
  const take = Math.min(b.leaves, g.inventory.room(TEA_LEAF));
  if (take < 1) return fail("backpack full");
  g.inventory.add(TEA_LEAF, take);
  noteGathered(g, TEA_LEAF, take);
  b.leaves -= take;
  return { ok: true, item: TEA_LEAF };
}

/** Shake the fruit off a mature tree by hand, all of it, at the tree's grade. */
export function pickFruit(
  g: GameState,
  x: number,
  y: number,
  trees: FruitTrees = g.fruitTrees,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const ripe = trees.ripe(x, y);
  if (!ripe) return fail("nothing ripe");
  const take = Math.min(ripe.count, g.inventory.room(ripe.item));
  if (take < 1) return fail("backpack full");
  g.inventory.add(ripe.item, take);
  noteGathered(g, ripe.item, take);
  const t = trees.at(x, y);
  if (t) t.fruit -= take;
  return { ok: true, item: ripe.item };
}

/**
 * Lift a seedling or a planted seed with a tool other than the axe, in one
 * swing: any tool takes a seedling, and the hoe also takes a seed back
 * (`docs/design/36_gathering_trees_sap_fiber.md`). The seed returns from
 * foraging level 1. The can does not lift a seed.
 */
export function clearSeedling(
  g: GameState,
  x: number,
  y: number,
  tool: "hoe" | "can",
  map?: FarmMap,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const t = g.trees.at(x, y);
  if (!t || t.stump || t.stage >= YOUNG_STAGE)
    return fail("a tree is in the way");
  if (t.stage === SEED_STAGE && tool === "can") return fail("nothing to water");
  swing(g, tool);
  g.trees.remove(x, y);
  if (t.stage === SEED_STAGE && g.skills.level("foraging") >= 1) {
    const seed = seedOfKind(t.kind) ?? TREE_SEED;
    if (g.inventory.add(seed)) return { ok: true, item: seed };
    const spot = dropSpot(g, map, x, y);
    g.ground.drop(spot.x, spot.y, seed, 1);
  }
  return { ok: true };
}

/**
 * Gather the moss from a mature tree with any tool or the hand: 1 to 2 moss in
 * one use, no chopping (`docs/design/34_crafting.md`). The moss grows back
 * later. Goods that do not fit the backpack are refused, so none are lost.
 */
export function gatherMoss(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome {
  const t = g.trees.at(x, y);
  if (!t || t.stump || t.stage !== MATURE_STAGE || !t.moss)
    return fail("nothing to shake");
  if (g.day.over) return fail("exhausted");
  const n = MOSS_MIN + Math.floor(random() * (MOSS_MAX - MOSS_MIN + 1));
  if (g.inventory.room("moss") < n) return fail("backpack full");
  g.inventory.add("moss", n);
  noteGathered(g, "moss", n);
  delete t.moss;
  return { ok: true, item: "moss" };
}

/** Shake a mature tree by hand. Moss comes first, else a loose seed falls. */
export function shake(g: GameState, x: number, y: number): Outcome {
  const t = g.trees.at(x, y);
  if (t?.moss && !t.stump && t.stage === MATURE_STAGE)
    return gatherMoss(g, x, y);
  if (!t || t.stump || t.stage !== MATURE_STAGE || !t.seed)
    return fail("nothing to shake");
  const seed = seedOfKind(t.kind) ?? TREE_SEED;
  if (g.inventory.room(seed) < 1) return fail("backpack full");
  t.seed = false;
  g.inventory.add(seed);
  return { ok: true, item: seed };
}

/** Plant a tree seed on open ground the player faces. */
export function plantTree(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  seedId: string = TREE_SEED,
): Outcome {
  if (g.inventory.count(seedId) < 1) return fail("no seeds");
  if (
    !map.canPlantTree(x, y) ||
    g.trees.at(x, y) ||
    g.fruitTrees.at(x, y) ||
    g.ground.at(x, y).length > 0 ||
    g.weeds.at(x, y) ||
    g.twigs.at(x, y) ||
    g.sprinklers.at(x, y) ||
    g.machines.at(x, y) ||
    g.placed.covering(FARM_STORE, x, y) ||
    g.farm.plotAt(x, y) ||
    g.forage.itemAt(x, y)
  )
    return fail("cannot plant tree here");
  const mahogany = seedId === MAHOGANY_SEED;
  const kind = kindOfSeed(seedId);
  // A Mahogany tree is not planted on a fruit tree's 3x3 (note 36).
  if (mahogany && fruitTreeNear(g.fruitTrees, x, y))
    return fail("cannot plant tree here");
  g.inventory.remove(seedId);
  g.trees.add(x, y, SEED_STAGE);
  if (kind) {
    const t = g.trees.at(x, y);
    if (t) t.kind = kind as TreeKind;
  }
  return { ok: true };
}

/**
 * Cut a weed with any tool, in one swing at that tool's energy cost, so a tap
 * never needs a tool swap (`docs/design/29_weeds.md`). A weed has a 50 percent
 * chance of 1 fiber. Fiber goes to the backpack, or lands on the ground nearby
 * if it does not fit. A weed that drops no fiber may drop a mixed seed.
 */
export function clearWeed(
  g: GameState,
  x: number,
  y: number,
  tool: "hoe" | "can" | "axe",
  random: () => number = Math.random,
  map?: FarmMap,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!g.weeds.at(x, y)) return fail("no weed");
  if (tool === "axe")
    g.day.act(
      swingCost(TOOL_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
      0,
    );
  else swing(g, tool);
  g.weeds.remove(x, y);
  // Hay waits for the scythe and grass tiles: it is bought until then (note 23).
  // Fiber at 50 percent. A weed that drops none may drop a mixed seed, at the
  // farm type's chance (notes 29 and 32).
  const drop =
    random() < FIBER_CHANCE
      ? FIBER
      : random() < farmTypeById(g.farmType).mixedSeedChance
        ? MIXED_SEED
        : undefined;
  if (!drop) return { ok: true };
  if (g.inventory.add(drop)) {
    noteGathered(g, drop);
    return { ok: true, item: drop };
  }
  const spot = dropSpot(g, map, x, y);
  g.ground.drop(spot.x, spot.y, drop, 1);
  return { ok: true };
}

/**
 * Clear a twig with any tool, in one swing at that tool's energy cost, like a
 * weed. It gives 1 wood, to the backpack or onto the ground nearby.
 */
export function clearTwig(
  g: GameState,
  x: number,
  y: number,
  tool: "hoe" | "can" | "axe",
  map?: FarmMap,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!g.twigs.at(x, y)) return fail("no twig");
  if (tool === "axe")
    g.day.act(
      swingCost(TOOL_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
      0,
    );
  else swing(g, tool);
  g.twigs.remove(x, y);
  if (g.inventory.add("wood", TWIG_WOOD)) {
    noteGathered(g, "wood", TWIG_WOOD);
    return { ok: true, item: "wood" };
  }
  const spot = dropSpot(g, map, x, y);
  g.ground.drop(spot.x, spot.y, "wood", TWIG_WOOD);
  return { ok: true };
}

/**
 * True when a tile is open, diggable ground with nothing on it: no soil already
 * dug, crop, tree, weed, rock, forage, sprinkler, machine or goods on the ground.
 */
export function isClear(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): boolean {
  // The greenhouse: bare floor anywhere inside, border or plot, with its own
  // sprinklers, trees and soil (`mapstore.ts`).
  if (map.indoors) {
    const here = storeOf(g, true);
    return !(
      !map.canPlantTree(x, y) ||
      here.sprinklers.at(x, y) ||
      here.fruitTrees.at(x, y) ||
      here.teaBushes.at(x, y) ||
      g.placed.covering(GREENHOUSE_STORE, x, y) ||
      here.soil.plotAt(x, y)
    );
  }
  return !(
    !map.isTillable(x, y) ||
    map.isBlocked(x, y) ||
    map.serviceAt(x, y) ||
    g.sprinklers.at(x, y) ||
    g.machines.at(x, y) ||
    g.chests.onFarm(x, y) ||
    g.placed.covering(FARM_STORE, x, y) ||
    g.farm.plotAt(x, y) ||
    g.trees.at(x, y) ||
    g.fruitTrees.at(x, y) ||
    g.teaBushes.at(x, y) ||
    g.weeds.at(x, y) ||
    g.twigs.at(x, y) ||
    g.rocks.at(x, y) ||
    g.forage.itemAt(x, y) ||
    g.ground.at(x, y).length > 0
  );
}

/**
 * Stand a sprinkler from the backpack on open, diggable ground. It waters the
 * tilled tiles in its reach each morning (`docs/design/31_farm_growth.md`).
 * Free, like planting. The tile must be clear: no soil already dug, crop,
 * tree, weed, rock, forage or goods on the ground.
 */
export function placeSprinkler(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!sprinklerById(id)) return fail("not a sprinkler");
  if (g.inventory.count(id) < 1) return fail("no sprinkler");
  if (!mayPlaceOn(id, placeTag(map)) || !isClear(g, map, x, y))
    return fail("cannot place here");
  g.inventory.remove(id);
  storeOf(g, map.indoors).sprinklers.add(x, y, id);
  return { ok: true };
}

/** Take up a sprinkler by hand. It goes to the backpack, or the backpack is full and it stays. */
export function pickUpSprinkler(
  g: GameState,
  x: number,
  y: number,
  sprinklers: Sprinklers = g.sprinklers,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const id = sprinklers.at(x, y);
  if (!id) return fail("no sprinkler here");
  if (g.inventory.room(id) < 1) return fail("backpack full");
  sprinklers.remove(x, y);
  g.inventory.add(id);
  return { ok: true, item: id };
}
