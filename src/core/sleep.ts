import { dateOf, type Season } from "./calendar";
import { growthRate } from "./professions";
import { isRaining, rollWeather, type Weather } from "./weather";
import type { Spot } from "./forage";
import type { GameState } from "./save";
import type { FarmMap } from "./map";
import { advanceBuild } from "./house";
import { horseEndDay } from "./horse";
import {
  advanceBuilding,
  advanceSilo,
  endDay as animalsEndDay,
  type AnimalNews,
} from "./animals";
import { checkAchievements } from "./achievements";
import { ringProgress, valleyPercent } from "./completion";
import { deliverAll } from "./mail";
import { endDayQuests } from "./quests";
import { deliverFurnace } from "./smith";
import { orderReady, type Upgradable } from "./upgrades";
import type { Settlement } from "./shipping";
import { fruitTreeById } from "./fruittrees";
import { CAVE_MAP } from "./cave";
import { returnDebris } from "./debris";
import { endDayOrders, type OrdersNews } from "./orders";
import { maxHealth, loseItems, type Lost } from "./combat";
import { maps } from "../content/maps";

/**
 * True when something stands in the 3x3 around a tile that stops a young fruit
 * tree growing: a weed, rock, tree, another fruit tree, sprinkler, machine,
 * crop or forage item. Grass and bare or tilled soil do not count, and nor does
 * the tile's own tree (`docs/design/31_farm_growth.md`).
 */
export function blocksGrowth(g: GameState, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const [tx, ty] = [x + dx, y + dy];
      const self = dx === 0 && dy === 0;
      if (
        g.weeds.at(tx, ty) ||
        g.twigs.at(tx, ty) ||
        g.rocks.at(tx, ty) ||
        g.trees.at(tx, ty) ||
        (!self && g.fruitTrees.at(tx, ty)) ||
        g.sprinklers.at(tx, ty) ||
        g.machines.at(tx, ty) ||
        g.chests.onFarm(tx, ty) ||
        g.farm.plotAt(tx, ty)?.crop ||
        g.forage.itemAt(tx, ty)
      )
        return true;
    }
  return false;
}

/** True when a fruit tree stands in the 3x3 around a tile. */
function nearFruitTree(g: GameState, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (g.fruitTrees.at(x + dx, y + dy)) return true;
  return false;
}

export interface SleepReport {
  passedOut: boolean;
  /** Why the player passed out, if they did. */
  reason?: "energy" | "time";
  moneyLost: number;
  /** Set when the new day starts a different season. */
  newSeason?: Season;
  /** Weather for the new day. */
  weather: Weather;
  /** Crops that died overnight because their season ended. */
  withered: number;
  /** True when the carpenter finished the house upgrade this morning. */
  houseFinished: boolean;
  /** The tier that opened, when `houseFinished` is true. */
  houseTier?: number;
  /** True when the carpenter finished the coop this morning. */
  coopFinished: boolean;
  /** True when the carpenter finished the barn this morning. */
  barnFinished: boolean;
  /** True when the carpenter finished the stable this morning. */
  stableFinished: boolean;
  /** True when the horse was left outside and is back at the stable. */
  horseWasOut: boolean;
  /** True when the carpenter finished the silo this morning. */
  siloFinished: boolean;
  /** Set when the player was knocked out in a fight: what the defeat took (note 22). */
  defeat?: { lost: Lost[]; posted: boolean };
  /** What the night did to the animals. */
  animals: AnimalNews;
  /** True when the smith left the furnace this morning. */
  furnaceGifted: boolean;
  /** Achievements earned by tonight's check, whose hats are now on sale. */
  achievements: string[];
  /** The valley completion total after tonight's recheck, in whole percent (note 39). */
  completion: number;
  /** Whole percent the total rose by tonight, zero when it did not. */
  completionGain: number;
  /** Letters that arrived this morning. */
  newMail: number;
  /** The tool the smith has finished, if it is ready to collect this morning. */
  toolReady: Upgradable | undefined;
  /** What the shipping bin paid tonight. */
  shipped: Settlement;
  /** True when tonight's sales passed the earnings mark and the villager will ask about the cave. */
  caveOffer: boolean;
  /** Special Orders filled or run out overnight. */
  orders: OrdersNews;
  /** Board requests that ran out overnight, as report lines. */
  requestsLapsed: string[];
  /** Names of young fruit trees that could not grow, since something stood in their 3x3. */
  stuckTrees: string[];
}

/**
 * End the day and start the next: pass-out cost, crop growth, season change,
 * tree growth and spread on `map` (none spread without it), and fresh forage
 * on `spots`. Call it from the sleep action or when the day
 * is over. Saving is the caller's job, after this returns.
 */
export function sleep(
  g: GameState,
  spots: Spot[],
  random: () => number,
  map?: FarmMap,
): SleepReport {
  const before = dateOf(g.day.clock.day).season;
  const cropsBefore = g.farm.cropCount;
  const completionBefore = valleyPercent(ringProgress(g));
  // A defeat is the pass-out rule with the item loss on top (note 22): money
  // goes by the same code, and the player wakes with the pass-out energy.
  const defeated = g.combat.defeatPending;
  if (defeated) g.day.energy.current = 0;
  const end = g.day.end(g.money);
  const moneyLost = end.passedOut ? end.moneyLost : 0;
  g.money -= moneyLost;
  const lost = defeated
    ? loseItems(g, random, g.combat.assist, g.day.clock.day)
    : [];
  g.combat.defeatPending = false;
  // Any night's sleep restores health.
  g.combat.health.max = maxHealth();
  g.combat.health.fill();
  // The bin pays after the pass-out cost, which takes cash carried only.
  const shipped = g.bin.settle(g);
  const orders = endDayOrders(g, shipped.lines, g.day.clock.day);
  const requestsLapsed = endDayQuests(g, g.day.clock.day);
  const caveOffer = g.cave.addEarnings(shipped.total, g.day.clock.day);

  const { season } = dateOf(g.day.clock.day);
  g.farm.endDay(season, growthRate(g.skills), random, season !== before);
  g.weather = g.tomorrow;
  const next = dateOf(g.day.clock.day + 1);
  g.tomorrow = rollWeather(next.season, next.dayOfSeason, random);
  if (isRaining(g.weather)) g.farm.waterAll();
  g.sprinklers.water(g.farm);
  g.trees.endDay(
    season,
    random,
    (x, y) =>
      !!map &&
      map.canPlantTree(x, y) &&
      !g.farm.plotAt(x, y) &&
      !g.forage.itemAt(x, y) &&
      !g.weeds.at(x, y) &&
      !g.twigs.at(x, y) &&
      !g.rocks.at(x, y) &&
      !g.sprinklers.at(x, y) &&
      !g.machines.at(x, y) &&
      !g.chests.onFarm(x, y) &&
      !g.fruitTrees.at(x, y) &&
      g.ground.at(x, y).length === 0,
  );
  if (map?.hasSoil) {
    const today = dateOf(g.day.clock.day);
    g.weeds.endDay(
      season,
      today.dayOfSeason,
      g.weather,
      random,
      (x, y) =>
        map.isTillable(x, y) &&
        !map.isBlocked(x, y) &&
        !g.trees.at(x, y) &&
        !g.fruitTrees.at(x, y) &&
        !g.rocks.at(x, y) &&
        !g.twigs.at(x, y) &&
        !g.sprinklers.at(x, y) &&
        !g.machines.at(x, y) &&
        !g.farm.plotAt(x, y)?.crop &&
        !g.forage.itemAt(x, y) &&
        g.ground.at(x, y).length === 0,
      () => map.tillableTiles(),
    );
    // Rocks, twigs and the odd stump return, a few at a time (note 65).
    returnDebris(
      season,
      today.dayOfSeason,
      g.rocks,
      g.twigs,
      g.trees,
      random,
      (x, y) =>
        map.isTillable(x, y) &&
        !map.isBlocked(x, y) &&
        !map.serviceAt(x, y) &&
        !g.weeds.at(x, y) &&
        !g.twigs.at(x, y) &&
        !g.rocks.at(x, y) &&
        !g.trees.at(x, y) &&
        !g.sprinklers.at(x, y) &&
        !g.machines.at(x, y) &&
        !g.chests.onFarm(x, y) &&
        !g.farm.plotAt(x, y) &&
        !g.forage.itemAt(x, y) &&
        g.ground.at(x, y).length === 0 &&
        !nearFruitTree(g, x, y),
      () => map.tillableTiles(),
    );
  }
  const stuck = g.fruitTrees.endDay(season, (x, y) => !blocksGrowth(g, x, y));
  g.forage.respawn(
    season,
    spots.filter(
      (s) =>
        !g.trees.at(s.x, s.y) &&
        !g.fruitTrees.at(s.x, s.y) &&
        !g.weeds.at(s.x, s.y) &&
        !g.sprinklers.at(s.x, s.y) &&
        !g.machines.at(s.x, s.y) &&
        !g.chests.onFarm(s.x, s.y),
    ),
    random,
  );
  g.cave.endDay(maps.get(CAVE_MAP).forageSpots, random);
  const houseFinished = advanceBuild(g);
  const animalJob = advanceBuilding(g);
  const siloFinished = advanceSilo(g);
  const animals = animalsEndDay(g, random);
  const horseWasOut = horseEndDay(g);
  const furnaceGifted = deliverFurnace(g);

  const achievements = checkAchievements(g).map((a) => a.name);
  // The completion total is rechecked with the achievements (note 39).
  const completion = valleyPercent(ringProgress(g));
  // Tonight's triggers arrive on the morning of the next day, which has begun.
  const newMail = deliverAll(g, g.day.clock.day);

  return {
    passedOut: end.passedOut,
    reason: end.passedOut ? end.reason : undefined,
    moneyLost,
    ...(defeated ? { defeat: { lost, posted: lost.length > 0 } } : {}),
    weather: g.weather,
    newSeason: season !== before ? season : undefined,
    withered: cropsBefore - g.farm.cropCount,
    houseFinished,
    houseTier: houseFinished ? g.houseTier : undefined,
    coopFinished: animalJob === "coop",
    barnFinished: animalJob === "barn",
    stableFinished: animalJob === "stable",
    horseWasOut,
    siloFinished,
    animals,
    furnaceGifted,
    achievements,
    completion,
    completionGain: Math.max(0, completion - completionBefore),
    newMail,
    toolReady: g.toolOrder && orderReady(g) ? g.toolOrder.tool : undefined,
    shipped,
    caveOffer,
    orders,
    requestsLapsed,
    stuckTrees: stuck.map((t) => fruitTreeById(t.id)?.name ?? t.id),
  };
}

/** True once all bundles are done: show the end screen. */
export function finished(g: GameState): boolean {
  return g.hall.allComplete;
}

/** True when the end screen is due: all bundles done and not shown yet. */
export function endDue(g: GameState): boolean {
  return finished(g) && !g.endSeen;
}
