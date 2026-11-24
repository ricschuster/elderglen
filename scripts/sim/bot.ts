// A persona playing the core rules for a whole game (note 98). It makes the
// same calls as the scene (actions, shop, hall, bin, sleep), and `Walker`
// charges the game minutes for walking and key presses.
import { maps } from "../../src/content/maps";
import { dateOf, DAYS_PER_SEASON } from "../../src/core/calendar";
import {
  clearWeed,
  harvest,
  isClear,
  pickFruit,
  plant,
  plantFruitTree,
  till,
  water,
  forage,
} from "../../src/core/actions";
import { categoryOf, produceOf } from "../../src/core/artisan";
import { canCraft, craft, known, recipeById } from "../../src/core/crafting";
import { cropById, CROPS } from "../../src/core/crops";
import {
  FRUIT_TREES,
  MATURE_DAYS,
  fruitTreeById,
  saplingId,
} from "../../src/core/fruittrees";
import {
  collectMachine,
  jobDone,
  loadMachine,
  placeMachine,
} from "../../src/core/machines";
import { chop, eat } from "../../src/core/actions";
import { orderSilo, siloCapacity, SILO_COST } from "../../src/core/animals";
import { cutGrass } from "../../src/core/grass";
import { smelt, collect, ready as furnaceReady } from "../../src/core/furnace";
import { mine } from "../../src/core/mining";
import { minesOpen } from "../../src/core/mines";
import { handOverCopper } from "../../src/core/smith";
import {
  BARS,
  COAL,
  COAL_BUY_PRICE,
  COPPER_ORE,
  ORES,
  ORE_PER_BAR,
  COAL_PER_BAR,
} from "../../src/core/ore";
import { MATURE_STAGE } from "../../src/core/trees";
import { itemById, seedId } from "../../src/core/items";
import { QUALITIES, splitQuality, type Quality } from "../../src/core/quality";
import {
  choose,
  optionsFor,
  pendingChoice,
  sellMultiplier,
} from "../../src/core/professions";
import { buy, seedStock } from "../../src/core/shop";
import { nextBackpack, upgradeBackpack } from "../../src/core/upgrades";
import { sleep } from "../../src/core/sleep";
import { startGame, TOOLS } from "../../src/core/toolbar";
import type { GameState } from "../../src/core/save";
import { START } from "../../src/core/maps";
import { isRaining } from "../../src/core/weather";
import { TIME, Walker, type Spot } from "./world";
import type { Persona } from "./personas";
import {
  bestCast,
  cashCropFor,
  cropFromList,
  fillsWant,
  nextHerdStep,
  pickiestFirst,
  playFight,
  rabbitTarget,
  WATER_MAPS,
  plannedHerdStep,
  type HerdPrices,
  type HerdState,
  type HerdStep,
  type Want,
} from "./plan";
import {
  BARN_UPGRADES,
  BARN_COST,
  COOP_COST,
  COOP_UPGRADES,
  HAY,
  SPECIES,
  animalsIn,
  buyAnimal,
  buyHay,
  capacityOf,
  collect as collectAnimal,
  depositHay,
  feedAll,
  animalProblem,
  buildingProblem,
  bringIn,
  isBuilt,
  letOut,
  letOutProblem,
  orderBuilding,
  orderBuildingUpgrade,
  pet,
  tierOf,
  upgradeProblem,
  type Species,
} from "../../src/core/animals";
import { cook, dishKnown, canCook, kitchenOpen } from "../../src/core/cooking";
import { dishById } from "../../src/core/dishes";
import {
  CAST_MINUTES,
  FISH,
  barWidth,
  bite,
  castEnergy,
  distanceShare,
  landFish,
  legendGates,
  rodById,
  RODS,
  type FishDef,
  type Water,
} from "../../src/core/fishing";
import { ENERGY_FLOOR } from "../../src/core/energy";
import { BAITS, LURES, equipBait } from "../../src/core/tackle";
import {
  baitPot,
  collectPot,
  landLobster,
  landTrash,
  placePot,
  POT_ITEM,
  SHELLFISH,
} from "../../src/core/pots";
import { landFind } from "../../src/core/waterfinds";
import { ARTIFACTS, digSpot } from "../../src/core/artifacts";
import { FORAGE } from "../../src/core/forage";
import {
  HOUSE_UPGRADES,
  orderProblem,
  orderUpgrade,
} from "../../src/core/house";
import { buyFurniture, dailyStock } from "../../src/core/furniture";
import { openLetter } from "../../src/core/mail";
import { tasteOf } from "../../src/core/friendship";
import { DYE_INPUTS } from "../../src/core/artisan";
import { BUNDLES, LAST_ROOM } from "../../src/core/bundles";

/** `SIM_ARTISAN`: "off" (default) leaves the bundle out, "parallel" crafts as soon as a recipe is known, "after" waits for Woodland and the Smith's. */
const ARTISAN_MODE =
  (
    globalThis as unknown as {
      process: { env: Record<string, string | undefined> };
    }
  ).process.env.SIM_ARTISAN ?? "parallel";

/** Gold the bot keeps back for seeds before it buys ore. */
const SEED_RESERVE = 1500;

/** Gold the bot must hold before it gathers for a silo, so the bundles and seeds come first (note 103). */
const SILO_MONEY = 8000;

/** The silo is gathered for from this day on: the expert usually finishes the hall by day 100 (note 98). */
const SILO_FROM_DAY = 100;

/** Young trees a day the bot cuts back. */
const TIDY_TREES = 8;
/** Grass tiles the bot scythes a day once it has a silo: free, but each swing costs time (note 103). */
const TIDY_GRASS = 14;

/** `SIM_ORCHARD_RESERVE`: gold kept back after buying an orchard tree (default 300). A high value buys the tree only when flush. */
const ORCHARD_RESERVE = Number(
  (
    globalThis as unknown as {
      process: { env: Record<string, string | undefined> };
    }
  ).process.env.SIM_ORCHARD_RESERVE ?? 300,
);

/** Machines the bot sets down on the farm as soon as it has crafted them. */
const MACHINES_TO_RUN = [
  "preserves-jar",
  "bee-house",
  "cheese-press",
  "loom",
  "oil-maker",
  "dye-vat",
];

/** Past this time of night a careful player heads for bed (midnight). */
const BED_TIME = 24 * 60;

/**
 * Bundles the bot does not play for: none now. Artisan Goods is played by
 * crafting a preserves jar and a bee house, running them for jam, pickles and
 * honey, and planting a fruit tree a month ahead (`tendArtisan`). Winter Foraging, Autumn Crops and Quality Crops
 * are played now that the bot farms through fall and winter (it clears weeds
 * to find soil). Woodland is played by chopping trees, cutting weeds and
 * breaking rocks on the farm and on mine floor 1. The Smith's is played by
 * buying ore and coal from the smith and running the furnace. The sim finishes
 * when every played bundle is done, so `allDay` means "the played bundles",
 * not the whole hall. Real play of the whole hall is covered by
 * `tests/bundles.test.ts`.
 */
export const UNPLAYED_BUNDLES: readonly string[] = [
  ...(ARTISAN_MODE === "off" ? ["artisan-goods"] : []),
];

/** Share of a harvest that is silver or better at a farming level, with plain soil (`cropQuality`). Floored so early planning stays sane. */
const silverShare = (level: number) =>
  Math.max(0.1, 2 * ((0.2 * level) / 10 + 0.01));

export interface RunResult {
  /** Day each bundle was finished, by bundle id. */
  bundleDays: Record<string, number>;
  /** Day the last bundle was finished, if it was. */
  allDay?: number;
  passOuts: number;
  /** Clock minutes when each played day ended, before the bed. */
  dayEnds: number[];
  withered: number;
  /** Money at the end of each season's last day. */
  moneyAtSeasonEnd: number[];
  lastDay: number;
  /** Game minutes spent on each part of the day over the run. */
  timeBy: Record<string, number>;
}

export function playGame(
  persona: Persona,
  random: () => number,
  maxDay: number,
  /** Called after each day's play, to watch a run. */
  onDay?: (g: GameState) => void,
): RunResult {
  // Grass is laid with its own stream so it does not shift the bot's dice.
  let seed = 12345;
  const grassRandom = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const g = startGame(undefined, grassRandom);
  // The five tools now fill pack slots (note 102): give the bot the room it had.
  g.inventory.grow(g.inventory.size + TOOLS.length);
  g.forage.respawn(dateOf(1).season, maps.get(START.map).forageSpots, random);
  const bot = new Bot(g, persona, random);
  const result: RunResult = {
    bundleDays: {},
    passOuts: 0,
    dayEnds: [],
    withered: 0,
    moneyAtSeasonEnd: [],
    lastDay: 1,
    timeBy: bot.timeBy,
  };
  while (g.day.clock.day <= maxDay && !playedDone(g)) {
    const day = g.day.clock.day;
    bot.playDay();
    onDay?.(g);
    for (const b of g.hall.bundles)
      if (g.hall.complete(b.id) && !(b.id in result.bundleDays))
        result.bundleDays[b.id] = day;
    if (playedDone(g)) {
      result.allDay = day;
      break;
    }
    result.dayEnds.push(g.day.clock.minutes);
    const report = bot.endDay();
    if (report.passedOut) result.passOuts++;
    result.withered += report.withered;
    if (dateOf(day).dayOfSeason === DAYS_PER_SEASON)
      result.moneyAtSeasonEnd.push(g.money);
    result.lastDay = day;
  }
  return result;
}

/** True when every bundle the bot plays for is done. */
function playedDone(g: GameState): boolean {
  return g.hall.bundles.every(
    (b) => UNPLAYED_BUNDLES.includes(b.id) || g.hall.complete(b.id),
  );
}

/** The Last Seat's goods are gathered once this many bundles of the other rooms are left. */
const PREP_LEFT = 8;

/** Gold kept back after buying a bigger backpack. */
const PACK_RESERVE = 600;

/** Gold kept back before a purchase on the herd ladder, so seeds are always paid for. */
const HERD_RESERVE = 800;

const HERD_PRICES: HerdPrices = {
  build: { coop: COOP_COST.coin, barn: BARN_COST.coin },
  upgrade: {
    coop: { 2: COOP_UPGRADES[2]!.coin, 3: COOP_UPGRADES[3]!.coin },
    barn: { 2: BARN_UPGRADES[2]!.coin, 3: BARN_UPGRADES[3]!.coin },
  },
  animal: Object.fromEntries(
    Object.values(SPECIES).map((sp) => [sp.id, sp.price]),
  ) as Record<Species, number>,
  kitchen: HOUSE_UPGRADES[0]!.coin,
};

/** Every fish a rod can land, and the lobster. */
const FISH_IDS = new Set<string>([...FISH.map((f) => f.id), "pearl-lobster"]);

/** The meals a player cooks first for a slot that takes any meal. */
const MEAL_ORDER = ["fried-egg", "baked-potato", "garden-salad"];

/** The villager whose recipe the Cook's bundle waits on: the innkeeper, who teaches a dish at five hearts. */
const FRIEND = "hattie";

/** The metal a slot that takes any bar is filled with: the cheapest. */
const PREFERRED: Record<string, string> = { "any-bar": "copper-bar" };

/** Machines and gear the bot keeps out of the bin. */
const HOLD = new Set<string>([
  "cheese-press",
  "loom",
  "oil-maker",
  "dye-vat",
  "preserves-jar",
  "bee-house",
  POT_ITEM,
  ...RODS.map((r) => r.id),
  ...BAITS.map((b) => b.id),
  ...LURES.map((l) => l.id),
]);

class Bot {
  /** Game minutes spent on each part of the day, over the whole run (a debugging aid for the sim). */
  readonly timeBy: Record<string, number> = {};
  private wantsCache?: { key: string; wants: Want[] };
  /** Units owed by the hall for each good, with an any-metal slot counted as the cheapest metal. */
  private owedMap = new Map<string, number>();
  /** Counts hand-ins, so the cached wants are rebuilt after each one. */
  private handIns = 0;
  private readonly walker: Walker;
  private playing = true;
  private daysPlayed = 0;

  constructor(
    private readonly g: GameState,
    private readonly p: Persona,
    private readonly random: () => number,
  ) {
    this.walker = new Walker(g);
  }

  private get day(): number {
    return this.g.day.clock.day;
  }

  private get minutes(): number {
    return this.g.day.clock.minutes;
  }

  private get lateNight(): boolean {
    return this.minutes >= BED_TIME || this.g.day.over;
  }

  /** Sleep: go to the bed, then let the core end the day. */
  endDay() {
    if (!this.g.day.over) this.walker.goToService("house", "bed");
    const report = sleep(
      this.g,
      maps.get(START.map).forageSpots,
      this.random,
      maps.get(START.map),
    );
    this.walker.wake();
    return report;
  }

  playDay(): void {
    this.playing = this.random() < this.p.playChance;
    if (!this.playing) return;
    this.daysPlayed++;
    this.chooseProfessions();
    const g = this.g;
    this.refreshPlans();
    // Order follows what a player does: crops first, then the walk for goods.
    const t = (name: string, run: () => void) => {
      const from = this.g.day.clock.minutes;
      run();
      this.timeBy[name] =
        (this.timeBy[name] ?? 0) + (this.g.day.clock.minutes - from);
    };
    t("harvest", () => this.harvestRipe());
    t("pack", () => this.packManage());
    t("plant", () => this.plantWanted());
    t("water", () => {
      if (!isRaining(g.weather) && !this.lateNight) this.waterAll();
    });
    t("mail", () => this.readMail());
    t("forage", () => {
      if (this.random() < this.p.forageChance) this.sweepForage();
    });
    this.eatIfLow();
    t("animals", () => this.tendAnimals());
    if (this.p.keepsForHall) {
      t("furnace", () => this.tendFurnace());
      t("woodland", () => this.gatherWoodland());
      t("artisan", () => this.tendArtisan());
    }
    t("cook", () => this.cookFor());
    t("herd", () => this.buyHerd());
    this.eatIfLow();
    t("forest", () => this.forestTrip());
    this.eatIfLow();
    t("fish", () => this.fishTrips());
    t("pots", () => this.tendPots());
    t("social", () => this.socialize());
    t("carpenter", () => this.carpenterErrands());
    t("hall", () => {
      if (this.dueFor(this.p.hallEvery)) this.visitHall();
    });
    if (this.p.keepsForHall) t("furnace", () => this.tendFurnace());
    t("tidy", () => {
      this.tidyTrees();
      this.buildSilo();
      this.tidyGrass();
    });
    t("ship", () => this.shipSurplus());
  }

  private dueFor(every: number): boolean {
    return this.daysPlayed % every === 0;
  }

  private chooseProfessions(): void {
    for (;;) {
      const skill = pendingChoice(this.g.skills);
      if (!skill) return;
      const first = optionsFor(skill)[0];
      if (!first || !choose(this.g.skills, skill, first.id)) return;
    }
  }

  // ---- the farm ----

  private act(target: Spot, run: () => { ok: boolean }): boolean {
    if (this.lateNight || !this.walker.goNextTo(target)) return false;
    const ok = run().ok;
    this.pickUp(target);
    this.walker.spend(TIME.action);
    return ok;
  }

  /** Drops lie on the ground (note 43): the player stands next to the spot and pulls them in. */
  private pickUp(near: Spot): void {
    const g = this.g;
    const grounds = [g.ground];
    for (let n = 1; n <= g.mines.deepest; n++) {
      const f = g.mines.today(n, this.day);
      if (f) grounds.push(f.ground);
    }
    for (const ground of grounds) ground.collect(g.inventory, near, 1);
  }

  /** Visit targets nearest first, as a player sweeping a field does. */
  private nearestFirst(targets: Spot[], visit: (s: Spot) => void): void {
    const left = [...targets];
    while (left.length > 0 && !this.lateNight) {
      const costs = this.walker.costsNextTo(left);
      const best = Math.min(...costs);
      const at = costs.indexOf(best);
      const [next] = left.splice(at, 1);
      if (next && best < Infinity) visit(next);
    }
  }

  private plots() {
    return [...this.g.farm.each()];
  }

  private harvestRipe(): void {
    if (this.walker.mapId !== "farm") this.walker.go("farm");
    const ripe = this.plots().filter(({ x, y }) => this.g.farm.isRipe(x, y));
    this.nearestFirst(ripe, (s) =>
      this.act(s, () => harvest(this.g, s.x, s.y, this.random)),
    );
  }

  private waterAll(): void {
    if (this.random() < this.p.forgetWater) return;
    const dry = this.plots().filter(
      ({ plot }) => plot.crop && !plot.wateredToday,
    );
    this.nearestFirst(dry, (s) => this.act(s, () => water(this.g, s.x, s.y)));
  }

  private sweepForage(): void {
    const g = this.g;
    const map = maps.get(START.map);
    const spots = map.forageSpots.filter((s) => g.forage.itemAt(s.x, s.y));
    const cap = this.p.forageMax;
    this.nearestFirst(spots.slice(0, Math.max(cap, 0) || spots.length), (s) =>
      this.act(s, () => forage(g, s.x, s.y, this.random)),
    );
  }

  private eatIfLow(): void {
    if (this.g.day.energy.current > 40) return;
    const inv = this.g.inventory;
    // Never eat what the hall or a plan is waiting for.
    const keep = [...this.wanted(), ...this.extraWants()];
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.slot(i);
      if (
        slot &&
        itemById(splitQuality(slot.id).base)?.energy &&
        !keep.some((w) => fillsWant(w, slot.id)) &&
        eat(this.g, slot.id).ok
      )
        return;
    }
  }

  // ---- the woodland and the smith ----

  /** Units the hall and the plans want, before counting what crafting would use (so a machine gap can ask without looping). */
  private plainOwed(item: string): number {
    this.wanted();
    return (this.owedMap.get(item) ?? 0) + (this.extra.get(item) ?? 0);
  }

  /** Units of an item the hall, the plans and the crafting still want, whether or not the pack holds them. */
  private owedOf(item: string): number {
    this.wanted();
    const hall = this.owedMap.get(item) ?? 0;
    const craft = this.craftWants().filter((w) => w.item === item).length;
    return hall + craft + (this.extra.get(item) ?? 0) + this.siloNeed(item);
  }

  /** Units of an item still owed and not yet in the pack. */
  private shortOf(item: string): number {
    return Math.max(this.owedOf(item) - this.g.inventory.count(item), 0);
  }

  /** Units of a material the silo still needs. Only asked once the bot is flush, so the hall is not slowed. */
  private siloNeed(item: string): number {
    const g = this.g;
    if (g.animals.silo || g.animals.siloDays > 0) return 0;
    // With animals to feed the silo comes early; otherwise only once the bot is flush.
    const herd = g.animals.animals.length > 0;
    if (!herd && g.money < SILO_MONEY) return 0;
    // The hall's own stone and bars come first, so the silo never delays a bundle.
    if (!herd && (!g.hall.complete("woodland") || !g.hall.complete("smiths")))
      return 0;
    // And only past the day the bot usually finishes the hall, so its mine and furnace trips never delay a bundle.
    if (!herd && this.day < SILO_FROM_DAY) return 0;
    return item === "stone" || item === "copper-bar" ? SILO_COST[item] : 0;
  }

  /** Order the silo once the pack holds its materials: it lets the bot keep the hay from cut grass. */
  private buildSilo(): void {
    const g = this.g;
    if (g.animals.silo || g.animals.siloDays > 0 || this.lateNight) return;
    const herd = g.animals.animals.length > 0;
    if (!herd && (g.money < SILO_MONEY || this.day < SILO_FROM_DAY)) return;
    // Stone and bars owed to the hall stay in the pack first.
    for (const id of ["stone", "copper-bar"]) if (this.shortOf(id) > 0) return;
    orderSilo(g);
  }

  /** Chop trees, cut weeds and break rocks for the Woodland bundle and the builds. */
  private gatherWoodland(): void {
    const g = this.g;
    if (
      this.lateNight ||
      !["wood", "sap", "fiber", "stone"].some((i) => this.shortOf(i) > 0)
    )
      return;
    const spare = () => g.day.energy.current > 30 && !this.lateNight;
    const logging = () => this.shortOf("wood") > 0 || this.shortOf("sap") > 0;
    if (logging()) {
      this.walker.go("farm");
      this.logHere();
    }
    // Weeds spread a little each night, so a patient player lets them grow and
    // cuts a bunch at once, at the end of a season or when the farm is thick.
    const season = dateOf(this.day);
    const ripe =
      g.weeds.count >= 40 || season.dayOfSeason > DAYS_PER_SEASON - 3;
    if (this.shortOf("fiber") > 0 && ripe) {
      this.walker.go("farm");
      const weeds = [...g.weeds.each()];
      this.nearestFirst(weeds, (w) => {
        if (this.shortOf("fiber") > 0 && spare())
          this.act(w, () => clearWeed(g, w.x, w.y, "hoe", this.random));
      });
    }
    if (this.shortOf("stone") > 0 && minesOpen(this.day)) {
      this.walker.go("farm");
      this.breakRocks(undefined);
      for (const floor of [1, 2, 3])
        if (this.shortOf("stone") > 0 && spare() && this.walker.descend(floor))
          this.breakRocks(floor);
    }
  }

  /** Fell the nearest mature trees on the map the bot stands on while wood is owed. */
  private logHere(): void {
    const g = this.g;
    const spare = () => g.day.energy.current > 30 && !this.lateNight;
    const logging = () => this.shortOf("wood") > 0 || this.shortOf("sap") > 0;
    const bad = new Set<string>();
    while (logging() && spare()) {
      const trees = [...g.trees.each()].filter(
        (t) =>
          (t.stump || t.stage >= MATURE_STAGE) && !bad.has(`${t.x},${t.y}`),
      );
      if (trees.length === 0) break;
      const costs = this.walker.costsNextTo(trees);
      const at = costs.indexOf(Math.min(...costs));
      const t = trees[at] as Spot;
      if (costs[at] === Infinity) break;
      let guard = 0;
      while (g.trees.at(t.x, t.y) && spare() && guard++ < 30)
        if (!this.act(t, () => chop(g, t.x, t.y, this.random))) {
          bad.add(`${t.x},${t.y}`);
          break;
        }
    }
  }

  /** Scythe a few of the nearest grass tiles a day: no energy, hay to the silo when there is one. */
  private tidyGrass(): void {
    const g = this.g;
    // Grass is only worth a walk for hay, so the bot cuts it once it has a silo
    // (tilling clears the grass where it plants, so it never blocks a field).
    if (this.lateNight || g.grass.count === 0 || siloCapacity(g) === 0) return;
    this.walker.go("farm");
    const grass = [...g.grass.each()];
    const costs = this.walker.costsNextTo(grass);
    const order = grass
      .map((t, i) => ({ t, c: costs[i] as number }))
      .filter((o) => o.c < Infinity)
      .sort((a, b) => a.c - b.c)
      .slice(0, TIDY_GRASS);
    for (const { t } of order)
      if (g.grass.at(t.x, t.y))
        this.act(t, () => cutGrass(g, t.x, t.y, this.random));
  }

  /** Cut a few of the nearest young trees each day, so the farm is not grown over and the doors stay open. */
  private tidyTrees(): void {
    const g = this.g;
    if (this.lateNight || g.day.energy.current < 60) return;
    this.walker.go("farm");
    const young = [...g.trees.each()].filter(
      (t) => !t.large && !t.stump && t.stage < MATURE_STAGE,
    );
    const costs = this.walker.costsNextTo(young);
    const order = young
      .map((t, i) => ({ t, c: costs[i] as number }))
      .filter((o) => o.c < Infinity)
      .sort((a, b) => a.c - b.c)
      .slice(0, TIDY_TREES);
    for (const { t } of order)
      if (g.trees.at(t.x, t.y))
        this.act(t, () => chop(g, t.x, t.y, this.random));
  }

  /** Break the nearest rocks on the farm or a mine floor while stone is wanted. */
  private breakRocks(floor: number | undefined): void {
    const g = this.g;
    const rocksOf = () =>
      floor === undefined ? g.rocks : g.mines.visit(floor, this.day).rocks;
    while (this.shortOf("stone") > 0) {
      const rocks = [...rocksOf().each()];
      if (rocks.length === 0 || !(g.day.energy.current > 30)) return;
      const costs = this.walker.costsNextTo(rocks);
      const at = costs.indexOf(Math.min(...costs));
      const r = rocks[at];
      if (!r || costs[at] === Infinity) return;
      let guard = 0;
      while (rocksOf().at(r.x, r.y) && guard++ < 10) {
        if (!this.act(r, () => mine(g, r.x, r.y, floor, this.random))) return;
      }
    }
  }

  /** Bars the Smith's bundle still wants, as bar id and how many. */
  private barsOwed(): { bar: (typeof BARS)[number]; n: number }[] {
    return BARS.map((bar) => ({
      bar,
      n: this.shortOf(bar.id),
    })).filter((b) => b.n > 0);
  }

  /** Collect a done bar, shop for ore and coal, and start the next bar. */
  private tendFurnace(): void {
    const g = this.g;
    if (
      (g.hall.complete("smiths") && this.barsOwed().length === 0) ||
      !minesOpen(this.day) ||
      this.lateNight
    )
      return;
    // Hand over the first copper ore, so the smith brings the furnace.
    if (!g.mines.copperHandedIn && g.money > 200) {
      if (!this.walker.goToService("forge", "smith")) return;
      buy(g.inventory, g, COPPER_ORE, 1);
      handOverCopper(g);
      this.walker.go("farm");
      return;
    }
    if (!g.furnace.gifted) return;
    if (g.furnace.job && !furnaceReady(g)) return;
    const owed = this.barsOwed();
    if (g.furnace.job || owed.length > 0) {
      if (!this.walker.goToService("farm", "furnace")) return;
      collect(g);
    }
    const next = owed.find((o) => o.n > 0);
    if (!next || g.furnace.job) return;
    // Buy what the rest of the bars need in one trip, then smelt.
    const ore = next.bar.ore;
    const needsTrip = owed.some(
      ({ bar, n }) =>
        g.inventory.count(bar.ore) < n * ORE_PER_BAR ||
        g.inventory.count(COAL) < n * COAL_PER_BAR,
    );
    // A careful farmer keeps money back for seeds, and buys ore with spare gold.
    const bill = owed.reduce(
      (t, { bar, n }) =>
        t +
        (ORES.find((o) => o.id === bar.ore)?.buyPrice ?? 0) *
          Math.max(n * ORE_PER_BAR - g.inventory.count(bar.ore), 0) +
        COAL_BUY_PRICE * n * COAL_PER_BAR,
      0,
    );
    if (
      needsTrip &&
      g.money >= bill + SEED_RESERVE &&
      this.walker.goToService("forge", "smith")
    ) {
      for (const { bar, n } of owed) {
        const def = ORES.find((o) => o.id === bar.ore);
        const want = n * ORE_PER_BAR - g.inventory.count(bar.ore);
        if (def && want > 0) buy(g.inventory, g, def.id, want);
      }
      const coal = owed.reduce((t, o) => t + o.n * COAL_PER_BAR, 0);
      if (coal > g.inventory.count(COAL))
        buy(g.inventory, g, COAL, coal - g.inventory.count(COAL));
      this.walker.go("farm");
    }
    if (g.inventory.count(ore) < ORE_PER_BAR) return;
    if (this.walker.goToService("farm", "furnace")) smelt(g, next.bar.id);
  }

  // ---- what the hall wants ----

  /**
   * Goods an unfinished bundle still takes, one entry for each unit still
   * owed. A bundle that asks for counts is played for its first `required`
   * goods only, since a stack of five is a lot of farming.
   */
  private wanted(): Want[] {
    const key = `${this.day}:${this.handIns}`;
    if (this.wantsCache?.key === key) return this.wantsCache.wants;
    const out: Want[] = [];
    const prep = this.lastSeatPrep();
    for (const b of this.g.hall.bundles) {
      if (UNPLAYED_BUNDLES.includes(b.id) || this.g.hall.complete(b.id))
        continue;
      // The Last Seat's bulk goods are only gathered once the rest is nearly done.
      if (b.room === LAST_ROOM && !prep) continue;
      const bulk = b.items.some((i) => i.count > 1);
      const goods = bulk ? b.items.slice(0, b.required) : b.items;
      for (const i of goods)
        for (let n = this.g.hall.have(b.id, i.id); n < i.count; n++)
          out.push({
            bundle: b.id,
            item: i.id,
            room: b.room,
            min: i.minQuality,
            ...(i.anyOf ? { anyOf: i.anyOf } : {}),
          });
    }
    this.owedMap = new Map();
    for (const w of out) {
      const k = w.anyOf ? PREFERRED[w.item] : w.item;
      if (k) this.owedMap.set(k, (this.owedMap.get(k) ?? 0) + 1);
    }
    this.wantsCache = { key, wants: out };
    return out;
  }

  /** True once the bot should start on the Last Seat's goods: the other rooms are nearly done (a player stocks up while the last bundles wait on a season). */
  private lastSeatPrep(): boolean {
    if (!this.p.plansWholeHall) return false;
    const left = BUNDLES.filter(
      (b) => b.room !== LAST_ROOM && !this.g.hall.complete(b.id),
    ).length;
    return left <= PREP_LEFT;
  }

  /** Stacks in the backpack, as stack id and count. */
  private stacks(): { id: string; count: number }[] {
    const out: { id: string; count: number }[] = [];
    const inv = this.g.inventory;
    for (let i = 0; i < inv.size; i++) {
      const s = inv.slot(i);
      if (s) out.push(s);
    }
    return out;
  }

  /** Hand-ins that would be accepted now: bundle and stack id. */
  private handable(): { bundle: string; stack: string; room: string }[] {
    const out: { bundle: string; stack: string; room: string }[] = [];
    const taken = new Map<string, number>();
    for (const w of pickiestFirst(this.wanted())) {
      for (const s of this.stacks()) {
        if (!fillsWant(w, s.id)) continue;
        const used = taken.get(s.id) ?? 0;
        if (used >= s.count) continue;
        if (this.g.hall.problem(this.g.inventory, w.bundle, s.id)) continue;
        taken.set(s.id, used + 1);
        out.push({ bundle: w.bundle, stack: s.id, room: w.room });
        break;
      }
    }
    return out;
  }

  private visitHall(): void {
    const offers = this.handable();
    if (offers.length === 0 || this.lateNight) return;
    // Rooms that open mid visit are handled by looping until nothing is left.
    for (let round = 0; round < 4; round++) {
      const now = this.handable();
      if (now.length === 0) break;
      for (const room of new Set(now.map((o) => o.room))) {
        if (!this.walker.goToService("hall", room)) continue;
        for (const o of now.filter((x) => x.room === room)) {
          this.g.hall.handIn(this.g.inventory, this.g, o.bundle, o.stack);
          this.handIns++;
        }
      }
    }
    this.walker.go("farm");
  }

  // ---- artisan goods ----

  /** True while the Artisan Goods bundle still wants this slot (jam, pickles, honey, apple, cherry). */
  private owes(slot: string): boolean {
    const g = this.g;
    return (
      ARTISAN_MODE !== "off" &&
      !g.hall.complete("artisan-goods") &&
      g.hall.have("artisan-goods", slot) < 1 &&
      !this.stacks().some((s) => categoryOf(splitQuality(s.id).base) === slot)
    );
  }

  private placedOf(id: string) {
    return [...this.g.machines.each()].filter((m) => m.id === id);
  }

  /** Machines the bot wants and does not have: the jar for jam or pickles, the bee house for honey. */
  private machineGaps(): string[] {
    const g = this.g;
    if (!this.p.keepsForHall || ARTISAN_MODE === "off") return [];
    // SIM_ARTISAN=after waits for Woodland and the Smith's, as a player who finishes one room first.
    if (
      ARTISAN_MODE === "after" &&
      !(g.hall.complete("woodland") && g.hall.complete("smiths"))
    )
      return [];
    const gaps: string[] = [];
    const missing = (id: string) =>
      this.placedOf(id).length === 0 && g.inventory.count(id) === 0;
    const open = (id: string) => {
      const r = recipeById(id);
      return !!r && known(g, r);
    };
    if (
      (this.owes("jam") || this.owes("pickles")) &&
      missing("preserves-jar") &&
      open("preserves-jar")
    )
      gaps.push("preserves-jar");
    if (
      (this.owes("honey") || this.plainOwed("honey") > 0) &&
      missing("bee-house") &&
      open("bee-house")
    )
      gaps.push("bee-house");
    if (this.unmetOf("oil") > 0 && missing("oil-maker") && open("oil-maker"))
      gaps.push("oil-maker");
    return gaps;
  }

  /** What the bot must gather to craft the machines it lacks, one entry a unit. */
  private craftWants(): Want[] {
    const out: Want[] = [];
    for (const id of this.machineGaps())
      for (const i of recipeById(id)?.ingredients ?? [])
        for (let n = 0; n < i.count; n++)
          out.push({ bundle: "craft", item: i.item, room: "", min: "normal" });
    return out;
  }

  /** Fruit and vegetables to hold back from the bin for the jar's next two batches. */
  private produceReserve(): Record<"fruit" | "vegetable", number> {
    return {
      fruit: this.owes("jam") ? 1 : 0,
      vegetable: this.owes("pickles") ? 1 : 0,
    };
  }

  /** A clear tile near the house door for a machine. */
  private machineSpot(): Spot | undefined {
    const g = this.g;
    const map = maps.get(START.map);
    return this.freeSoil(map, 60).find(
      (s) =>
        isClear(g, map, s.x, s.y) &&
        !g.weeds.at(s.x, s.y) &&
        !g.farm.plotAt(s.x, s.y),
    );
  }

  /**
   * The Artisan Goods bundle: plant a fruit tree early, craft and set down a
   * preserves jar and a bee house, keep them loaded, and pick the fruit.
   */
  private tendArtisan(): void {
    const g = this.g;
    if (ARTISAN_MODE === "off" || this.lateNight) return;
    this.walker.go("farm");
    this.plantOrchard();
    // Coal for the machines: the furnace trip stops once the Smith's is done, so buy it here.
    const coalNeed = this.machineGaps().reduce(
      (t, id) =>
        t +
        (recipeById(id)?.ingredients.find((i) => i.item === COAL)?.count ?? 0),
      0,
    );
    const coalShort = coalNeed - g.inventory.count(COAL);
    if (
      coalShort > 0 &&
      minesOpen(this.day) &&
      g.money >= COAL_BUY_PRICE * coalShort + SEED_RESERVE &&
      this.walker.goToService("forge", "smith")
    ) {
      buy(g.inventory, g, COAL, coalShort);
      this.walker.go("farm");
    }
    // Craft what is in reach (at a workbench in the house, whose walk is ignored).
    for (const id of this.machineGaps()) {
      const r = recipeById(id);
      if (r && canCraft(g, r)) craft(g, id);
    }
    for (const id of MACHINES_TO_RUN)
      while (g.inventory.count(id) > 0) {
        const spot = this.machineSpot();
        if (
          !spot ||
          !this.act(spot, () =>
            placeMachine(g, maps.get(START.map), spot.x, spot.y, id),
          )
        )
          break;
      }
    for (const m of this.placedOf("preserves-jar")) {
      if (jobDone(g, m)) this.act(m, () => collectMachine(g, m.x, m.y));
      if (m.job) continue;
      const want = this.owes("jam")
        ? "fruit"
        : this.owes("pickles")
          ? "vegetable"
          : undefined;
      const stack =
        want &&
        this.stacks().find((s) => produceOf(splitQuality(s.id).base) === want);
      if (stack)
        this.act(m, () => loadMachine(g, m.x, m.y, stack.id, this.random));
    }
    for (const m of this.placedOf("bee-house"))
      if (jobDone(g, m)) this.act(m, () => collectMachine(g, m.x, m.y));
    this.tendProcessors();
    for (const t of [...g.fruitTrees.each()])
      if (g.fruitTrees.ripe(t.x, t.y))
        this.act(t, () => pickFruit(g, t.x, t.y));
  }

  /** The cheese press, loom, oil maker and dye vat: collect a finished batch, load the next if the hall still wants its goods. */
  private tendProcessors(): void {
    const g = this.g;
    const inputOf = (id: string): string | undefined => {
      const stack = (pick: (base: string) => boolean) =>
        this.stacks().find((s) => pick(splitQuality(s.id).base))?.id;
      if (id === "cheese-press")
        return this.unmetOf("cheese") > this.brewing("cheese")
          ? stack((b) => b === "milk")
          : undefined;
      if (id === "loom")
        return this.unmetOf("cloth") > this.brewing("cloth")
          ? stack((b) => b === "wool")
          : undefined;
      if (id === "oil-maker")
        return this.unmetOf("oil") > this.brewing("oil")
          ? stack((b) => b === "corn")
          : undefined;
      if (id === "dye-vat")
        return this.unmetOf("dye") > this.brewing("dye")
          ? this.stacks().find(
              (s) =>
                DYE_INPUTS[splitQuality(s.id).base] !== undefined &&
                s.count > this.owedOf(splitQuality(s.id).base),
            )?.id
          : undefined;
      return undefined;
    };
    for (const id of ["cheese-press", "loom", "oil-maker", "dye-vat"])
      for (const m of this.placedOf(id)) {
        if (jobDone(g, m)) this.act(m, () => collectMachine(g, m.x, m.y));
        if (m.job) continue;
        const stack = inputOf(id);
        if (stack)
          this.act(m, () => loadMachine(g, m.x, m.y, stack, this.random));
      }
  }

  /** Buy and plant the fruit tree that will bear soonest, for the apple and cherry slots. */
  private plantOrchard(): void {
    const g = this.g;
    if (!this.owes("apple") || !this.owes("cherry")) return;
    const slots = ["apple", "cherry"];
    if ([...g.fruitTrees.each()].some((t) => slots.includes(t.id))) return;
    // The tree that will give fruit first, counted from the day it would mature.
    const ripeDay = (id: string): number => {
      const def = fruitTreeById(id);
      if (!def) return Infinity;
      for (
        let d = this.day + MATURE_DAYS;
        d < this.day + MATURE_DAYS + 112;
        d++
      )
        if (dateOf(d).season === def.season) return d;
      return Infinity;
    };
    const pick = FRUIT_TREES.filter((t) => slots.includes(t.id)).sort(
      (a, b) => ripeDay(a.id) - ripeDay(b.id),
    )[0];
    if (!pick) return;
    const sapling = saplingId(pick.id);
    if (g.inventory.count(sapling) < 1) {
      // A player saves for the tree: seed money is spent only on top of its price.
      if (g.money < pick.saplingPrice + ORCHARD_RESERVE) return;
      if (!this.walker.goToService("general-store", "shop")) return;
      if (!buy(g.inventory, g, sapling)) return;
    }
    const map = maps.get(START.map);
    this.walker.go("farm");
    const door = map.entry("from_house") ?? { x: 0, y: 0 };
    const spots: Spot[] = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (
          map.canPlantTree(x, y) &&
          isClear(g, map, x, y) &&
          !g.farm.plotAt(x, y)
        )
          spots.push({ x, y });
    spots.sort(
      (a, b) =>
        Math.abs(b.x - door.x) +
        Math.abs(b.y - door.y) -
        (Math.abs(a.x - door.x) + Math.abs(a.y - door.y)),
    );
    // The far corner of the yard keeps the orchard clear of the fields.
    for (const s of spots.slice(0, 12))
      if (this.act(s, () => plantFruitTree(g, map, s.x, s.y, sapling))) return;
  }

  // ---- the rest of the hall: needs beyond the hall's own list ----

  /** Goods the bot gathers or holds for its own plans: building materials, dish ingredients, goods for machines. */
  private extra = new Map<string, number>();
  /** Dishes to cook, from the unmet dish slots. */
  private dishList: { dish: string; n: number }[] = [];

  /** Hall wants with no unit in the pack to fill them, the pickiest slots matched first. */
  private unmet(): Want[] {
    const taken = new Map<string, number>();
    const stacks = this.stacks();
    const out: Want[] = [];
    for (const w of pickiestFirst(this.wanted())) {
      const hit = stacks.find(
        (s) => fillsWant(w, s.id) && (taken.get(s.id) ?? 0) < s.count,
      );
      if (hit) taken.set(hit.id, (taken.get(hit.id) ?? 0) + 1);
      else out.push(w);
    }
    return out;
  }

  /** How many unmet slots one good (or a good that fills an any-of slot) still has. */
  private unmetOf(item: string): number {
    return this.unmet().filter(
      (w) => w.item === item || w.anyOf?.includes(item),
    ).length;
  }

  /** Units of a good a machine still has in its job. */
  private brewing(item: string): number {
    let n = 0;
    for (const m of this.g.machines.each())
      if (m.job?.output === item) n += m.job.count;
    return n;
  }

  private woolNeed(): number {
    const g = this.g;
    let need = 0;
    for (const b of g.hall.bundles) {
      if (g.hall.complete(b.id)) continue;
      for (const i of b.items)
        if (i.id === "wool" || i.id === "cloth")
          need += Math.max(i.count - g.hall.have(b.id, i.id), 0);
    }
    return Math.max(
      need - g.inventory.count("wool") - g.inventory.count("cloth"),
      0,
    );
  }

  private herdState(): HerdState {
    const g = this.g;
    const counts: Partial<Record<Species, number>> = {};
    for (const a of g.animals.animals)
      counts[a.species] = (counts[a.species] ?? 0) + 1;
    const room = (b: "coop" | "barn") =>
      isBuilt(g.animals, b)
        ? capacityOf(b, tierOf(g.animals, b)) - animalsIn(g, b).length
        : 0;
    return {
      money: g.money,
      reserve: HERD_RESERVE,
      coopTier: g.animals.coopBuilt ? g.animals.tier : 0,
      barnTier: g.animals.barnBuilt ? g.animals.barnTier : 0,
      carpenterBusy: !!(
        g.animals.build ||
        g.houseBuild ||
        g.animals.siloDays > 0
      ),
      counts,
      woolNeed: this.woolNeed(),
      coopRoom: room("coop"),
      barnRoom: room("barn"),
      kitchenWanted: this.p.plansWholeHall && g.houseTier < 1,
    };
  }

  /** The step the bot is working towards, whether or not it can pay for it yet. */
  private plannedStep(): HerdStep | undefined {
    return this.p.plansWholeHall
      ? plannedHerdStep(this.herdState(), HERD_PRICES)
      : undefined;
  }

  /** Rebuild `extra` and the dish list. Done at the start of the day and after a change. */
  private refreshPlans(): void {
    const g = this.g;
    this.extra.clear();
    const add = (item: string, n: number) => {
      if (n > 0) this.extra.set(item, (this.extra.get(item) ?? 0) + n);
    };
    const step = this.plannedStep();
    if (step && step.kind !== "buy") {
      const tier = (b: "coop" | "barn") => tierOf(g.animals, b) + 1;
      const cost =
        step.kind === "build"
          ? step.building === "coop"
            ? COOP_COST
            : BARN_COST
          : step.kind === "upgrade"
            ? (step.building === "coop" ? COOP_UPGRADES : BARN_UPGRADES)[
                tier(step.building)
              ]
            : HOUSE_UPGRADES[0];
      if (cost) {
        add("wood", cost.wood);
        if ("stone" in cost) add("stone", cost.stone);
      }
    }
    this.dishList = this.planDishes();
    for (const { dish, n } of this.dishList)
      for (const i of dishById(dish)?.ingredients ?? [])
        add(i.item, i.count * n);
    // Goods the machines turn into what the hall wants.
    add("milk", this.unmetOf("cheese") - this.brewing("cheese"));
    add("wool", this.unmetOf("cloth") - this.brewing("cloth"));
    add("corn", this.unmetOf("oil") - this.brewing("oil"));
  }

  /** The dishes to cook for the unmet dish slots, as dish id and how many. */
  private planDishes(): { dish: string; n: number }[] {
    const g = this.g;
    if (!this.p.plansWholeHall) return [];
    const out = new Map<string, number>();
    const unmet = this.unmet();
    for (const b of g.hall.bundles) {
      if (g.hall.complete(b.id)) continue;
      let slotsLeft = b.required - g.hall.handedIn(b.id).length;
      const seen = new Set<string>();
      for (const w of unmet.filter((u) => u.bundle === b.id)) {
        const known = (w.anyOf ?? [w.item])
          .filter((id) => {
            const d = dishById(id);
            return !!d && dishKnown(g, d);
          })
          .sort(
            (a, c) =>
              (MEAL_ORDER.indexOf(a) + 1 || 99) -
              (MEAL_ORDER.indexOf(c) + 1 || 99),
          );
        const pick = known[0];
        if (!pick) continue;
        if (!seen.has(w.item)) {
          if (slotsLeft <= 0) break;
          seen.add(w.item);
          slotsLeft--;
        }
        out.set(pick, (out.get(pick) ?? 0) + 1);
      }
    }
    return [...out].map(([dish, n]) => ({ dish, n }));
  }

  /** The wants the bot holds back from the bin for its own plans, one entry a unit. */
  private extraWants(): Want[] {
    const out: Want[] = [];
    for (const [item, n] of this.extra)
      for (let i = 0; i < n; i++)
        out.push({ bundle: "plan", item, room: "", min: "normal" });
    return out;
  }

  // ---- animals ----

  /** Feed, pet and collect from each building that has animals in it, buying hay if the silo and pack are short. */
  private tendAnimals(): void {
    const g = this.g;
    if (this.lateNight) return;
    const buildings = (["coop", "barn"] as const).filter(
      (b) => isBuilt(g.animals, b) && animalsIn(g, b).length > 0,
    );
    if (buildings.length === 0) return;
    // On a dry day out of winter the animals graze for nothing: let them out and bring them in again, which costs a walk.
    const graze = g.animals.animals.every(
      (a) => letOutProblem(g, a.id) === undefined,
    );
    if (graze) {
      for (const b of buildings) {
        if (!this.walker.goToService(b, "bench-0")) continue;
        for (const a of animalsIn(g, b)) {
          letOut(g, a.id);
          bringIn(g, a.id);
        }
        this.walker.spend(15);
      }
    }
    const unfed = g.animals.animals.filter((a) => !a.fed && !a.outside).length;
    const stock = g.animals.hay + g.inventory.count(HAY);
    // Hay is bought for four days at a time, so the walk to the sawmill is not made daily.
    if (stock < unfed && g.money > 100) {
      if (this.walker.goToService("sawmill", "carpenter")) {
        buyHay(g, unfed * 4 - stock);
        depositHay(g);
        this.walker.go("farm");
      }
    }
    for (const b of buildings) {
      if (!this.walker.goToService(b, "bench-0")) continue;
      feedAll(g, b);
      const herd = animalsIn(g, b);
      for (const a of herd) {
        if (this.random() < this.petChance()) pet(g, a.id);
        if (a.product !== undefined || a.bonus !== undefined)
          collectAnimal(g, a.id);
      }
      this.walker.spend(TIME.action * (1 + herd.length * 2));
    }
    this.walker.go("farm");
  }

  private petChance(): number {
    return this.p.keepsForHall ? 1 : 0.5;
  }

  /** Carry out the next step of the herd ladder if the money and materials are there. */
  private buyHerd(): void {
    const g = this.g;
    if (!this.p.plansWholeHall || this.lateNight) return;
    const step = nextHerdStep(this.herdState(), HERD_PRICES);
    if (!step) return;
    let done = false;
    if (step.kind === "build") {
      if (buildingProblem(g, step.building) === undefined) {
        if (!this.walker.goToService("sawmill", "carpenter")) return;
        done = orderBuilding(g, step.building);
      }
    } else if (step.kind === "upgrade") {
      if (upgradeProblem(g, step.building) === undefined) {
        if (!this.walker.goToService("sawmill", "carpenter")) return;
        done = orderBuildingUpgrade(g, step.building);
      }
    } else if (step.kind === "kitchen") {
      if (orderProblem(g) === undefined) {
        if (!this.walker.goToService("sawmill", "carpenter")) return;
        done = orderUpgrade(g);
      }
    } else if (animalProblem(g, step.species) === undefined) {
      const home = SPECIES[step.species].building;
      if (!this.walker.goToService(home, "bench-0")) return;
      done = buyAnimal(g, step.species, "") !== undefined;
    }
    this.walker.go("farm");
    if (done) this.refreshPlans();
  }

  // ---- fishing, pots ----

  private fishNeeds(): Set<string> {
    const out = new Set<string>();
    for (const w of this.unmet())
      for (const id of w.anyOf ?? [w.item]) if (FISH_IDS.has(id)) out.add(id);
    return out;
  }

  /** The best rod in the pack. */
  private rodInHand(): string | undefined {
    return [...RODS].reverse().find((r) => this.g.inventory.count(r.id) > 0)
      ?.id;
  }

  /** Buy the best rod the purse allows and a stack of bait, at the fisher on the delta. */
  private stockTackle(): void {
    const g = this.g;
    const held = this.rodInHand();
    const best = [...RODS]
      .reverse()
      .find((r) => r.price <= Math.max(60, g.money * 0.3) || r.price <= 50);
    const wantRod =
      best && (!held || RODS.indexOf(best) > RODS.indexOf(rodById(held)!));
    const rod = rodById(held);
    const needBait =
      (rod?.bait ?? best?.bait) === true &&
      g.inventory.count("plain-bait") < 10 &&
      !g.tackle.rig(held ?? best?.id ?? "").bait;
    const needPots =
      this.potsWanted() > g.inventory.count(POT_ITEM) + this.placedPots();
    if (!wantRod && !needBait && !needPots) return;
    if (!this.walker.goToService("fisher-hut", "fisher")) return;
    if (wantRod && best) buy(g.inventory, g, best.id);
    if (needBait || g.inventory.count("plain-bait") < 10)
      buy(g.inventory, g, "plain-bait", 40);
    if (needPots) {
      const n =
        this.potsWanted() - g.inventory.count(POT_ITEM) - this.placedPots();
      if (n > 0 && g.money > n * 150 + 300) buy(g.inventory, g, POT_ITEM, n);
    }
    this.walker.go("farm");
  }

  private potsWanted(): number {
    const shell = SHELLFISH.some((s) => this.unmetOf(s.id) > 0);
    return shell ? 5 : 0;
  }

  private placedPots(): number {
    return this.g.pots.count;
  }

  /** Water tiles of one kind with dry land beside them, where a player can stand to cast or set a pot. */
  private shore(kind: string): Spot[] {
    const map = this.walker.map;
    const out: Spot[] = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        if (map.waterKindAt(x, y) !== kind) continue;
        if (
          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => {
            const nx = x + dx!;
            const ny = y + dy!;
            return !map.isWater(nx, ny) && !map.isBlocked(nx, ny);
          })
        )
          out.push({ x, y });
      }
    return out;
  }

  private nearestShore(kind: string): Spot | undefined {
    const tiles = this.shore(kind);
    if (tiles.length === 0) return undefined;
    const costs = this.walker.costsNextTo(tiles);
    const best = Math.min(...costs);
    return best < Infinity ? tiles[costs.indexOf(best)] : undefined;
  }

  /** One or two outings a day when a fish is wanted: pick the water and hour, wait for it, cast. */
  private fishTrips(): void {
    const g = this.g;
    if (!this.p.keepsForHall && this.random() >= this.p.fishChance) return;
    if (this.p.keepsForHall && this.random() >= this.p.fishChance) return;
    const trips = Math.ceil(this.p.fishChance * 2);
    for (let trip = 0; trip < trips; trip++) {
      const needs = this.fishNeeds();
      if (needs.size === 0 || this.lateNight) return;
      const { season } = dateOf(this.day);
      const plan = bestCast(
        needs,
        season,
        isRaining(g.weather),
        this.minutes,
        BED_TIME - 90,
      );
      if (!plan) return;
      this.stockTackle();
      const rodId = this.rodInHand();
      if (!rodId) return;
      const rod = rodById(rodId)!;
      if (rod.bait && g.inventory.count("plain-bait") > 0)
        equipBait(g.tackle, g.inventory, rod, "plain-bait");
      const mapId = WATER_MAPS[plan.water] as string;
      const spot = this.walker.tryEnter(mapId)
        ? this.nearestShore(plan.water)
        : undefined;
      if (!spot || !this.walker.goNextTo(spot)) {
        this.walker.tryEnter("farm");
        return;
      }
      if (plan.at > this.minutes) this.walker.spend(plan.at - this.minutes);
      let casts = 0;
      while (casts < this.p.fishCasts && !this.lateNight) {
        // The hour may have moved the fish on: stop when nothing wanted can bite here.
        if (casts % 3 === 0 && this.fishNeeds().size === 0) break;
        if (!this.cast(plan.water, rodId)) break;
        casts++;
      }
      this.pickUp(this.walker.pos);
      if (plan.water === "sea" || plan.water === "river") this.tendPotsHere();
      this.walker.go("farm");
    }
  }

  /** One cast: bite, then the bar if it is a fish. False when the player is too tired to go on. */
  private cast(water: Water, rodId: string): boolean {
    const g = this.g;
    const rod = rodById(rodId)!;
    const cost = castEnergy(g.skills.level("fishing"));
    if (g.day.energy.current - cost <= ENERGY_FLOOR + 30) return false;
    const tutorial = g.fishing.total === 0;
    const fx = g.tackle.effects(rodId, water === "sea");
    const b = bite(
      water,
      {
        season: dateOf(this.day).season,
        minutes: this.minutes,
        raining: isRaining(g.weather),
        ...legendGates(g, rodId),
      },
      this.random,
      tutorial,
      fx,
    );
    g.day.act(cost, 0);
    this.walker.spend(CAST_MINUTES);
    g.tackle.spend(rodId);
    const at = this.walker.pos;
    // A bite is sometimes missed in the hook window.
    if (b.kind === "none" || this.random() < this.p.fumble * 0.15) return true;
    if (b.kind === "lobster") landLobster(g, at, this.p.castShare, this.random);
    else if (b.kind === "trash") landTrash(g, at, b.item);
    else if (b.kind === "find") landFind(g, at, b.item);
    else {
      const setup = {
        behaviour: b.fish.behaviour,
        difficulty: b.fish.difficulty,
        width: barWidth(rod, 0, fx.bar),
        assist: 0 as const,
        tutorial,
      };
      const r = tutorial
        ? { landed: true, perfect: false }
        : playFight(
            setup,
            { reaction: this.p.reaction, fumble: this.p.fumble },
            this.random,
          );
      if (r.landed)
        landFish(g, b.fish as FishDef, {
          perfect: r.perfect,
          distance: this.p.castShare,
          random: this.random,
          at,
        });
    }
    this.pickUp(at);
    return true;
  }

  /** Set pots on the farm pond and tend them each day: collect, then bait for the night. */
  private tendPots(): void {
    const g = this.g;
    if (this.lateNight || this.potsWanted() === 0) return;
    this.walker.go("farm");
    this.tendPotsHere();
  }

  /** Pots on the map the bot stands on: place the ones in the pack, collect, bait. */
  private tendPotsHere(): void {
    const g = this.g;
    const mapId = this.walker.mapId;
    const kind = mapId === "farm" ? "farm-pond" : "sea";
    const here = [...g.pots.each(mapId)];
    // Place the pots the pack holds: three fresh on the farm pond, two salt at the sea.
    const limit = mapId === "farm" ? 3 : mapId === "delta" ? 2 : 0;
    if (limit > 0) {
      const shore = this.shore(kind)
        .map((s) => s)
        .slice(0, 40);
      for (const s of shore) {
        if (here.length >= limit || g.inventory.count(POT_ITEM) < 1) break;
        if (g.pots.get(mapId, s.x, s.y)) continue;
        if (this.act(s, () => placePot(g, this.walker.map, mapId, s.x, s.y)))
          here.push(g.pots.get(mapId, s.x, s.y) as never);
      }
    }
    for (const p of [...g.pots.each(mapId)]) {
      if (this.lateNight) return;
      if (p.catch)
        this.act(p, () => collectPot(g, mapId, p.x, p.y, this.random));
      if (!p.catch && !p.bait && g.inventory.count("plain-bait") > 0)
        this.act(p, () => baitPot(g, mapId, p.x, p.y, "plain-bait"));
    }
  }

  // ---- the forest, mail, friends, the carpenter's stock ----

  /** A trip to the Forest for goods that grow or lie there: forage, digging spots, wood. */
  private forestTrip(): void {
    const g = this.g;
    if (this.lateNight || this.random() >= this.p.forestChance) return;
    const unmet = this.unmet();
    const forageIds = new Set(FORAGE.map((f) => f.id));
    const digIds = new Set(ARTIFACTS.map((a) => a.id));
    const wantsForage = unmet.some((w) =>
      (w.anyOf ?? [w.item]).some((id) => forageIds.has(id)),
    );
    const wantsDig = unmet.some((w) =>
      (w.anyOf ?? [w.item]).some((id) => digIds.has(id)),
    );
    const wantsWood = this.shortOf("wood") > 0;
    if (!wantsForage && !wantsDig && !wantsWood) return;
    if (!this.walker.tryEnter("forest")) return;
    if (wantsForage) {
      const spots = this.walker.map.forageSpots.filter((s) =>
        g.forage.itemAt(s.x, s.y),
      );
      this.nearestFirst(spots, (s) =>
        this.act(s, () => forage(g, s.x, s.y, this.random)),
      );
    }
    if (wantsDig)
      for (const t of [...g.spots.each()])
        this.act(t, () => digSpot(g, "forest", t.x, t.y, this.random));
    if (wantsWood) this.logHere();
    this.walker.go("farm");
  }

  /** Keep the pack roomy: drop the rods a better one has replaced, and buy the next backpack when the purse allows. */
  private packManage(): void {
    const g = this.g;
    const held = this.rodInHand();
    if (held)
      for (const r of RODS)
        if (r.id !== held && g.inventory.count(r.id) > 0)
          g.inventory.remove(r.id, g.inventory.count(r.id));
    // Seeds the plan has no use for take a slot each: a player bins them.
    const planned = new Set(this.cropPlan().map((c) => seedId(c)));
    for (const sl of this.stacks()) {
      const base = splitQuality(sl.id).base;
      if (base.endsWith("-seed") && !planned.has(base))
        g.inventory.remove(sl.id, sl.count);
    }
    const next = nextBackpack(g.inventory);
    if (next && g.money >= next.cost + PACK_RESERVE && !this.lateNight) {
      if (this.walker.goToService("general-store", "shop"))
        upgradeBackpack(g.inventory, g);
      this.walker.go("farm");
    }
  }

  /** Open the mailbox when the flag is up: a letter may bring a recipe. */
  private readMail(): void {
    const g = this.g;
    if (!g.mail.flagUp || this.lateNight) return;
    if (!this.walker.goToService("farm", "mailbox")) return;
    for (const e of [...g.mail.pending()]) openLetter(g, e.id);
  }

  /** Call on the innkeeper: a talk a day and a liked gift now and then, for the recipe she sends at five hearts. */
  private socialize(): void {
    const g = this.g;
    if (!this.p.plansWholeHall || this.lateNight) return;
    if (!this.dueFor(this.p.socialEvery)) return;
    if (g.hall.complete("cooks") || this.cookDishesKnown() >= 3) return;
    if (!this.walker.goToService("inn", "counter")) return;
    g.friendship.talk(FRIEND, this.day);
    if (g.friendship.canGift(FRIEND, this.day)) {
      const taste = { love: 2, like: 1 } as Record<string, number>;
      let best: { id: string; rank: number } | undefined;
      for (const s of this.stacks()) {
        const base = splitQuality(s.id).base;
        if (s.count <= this.owedOf(base) || base.endsWith("-seed")) continue;
        const rank = taste[tasteOf(FRIEND, base)] ?? 0;
        if (rank > 0 && (!best || rank > best.rank)) best = { id: s.id, rank };
      }
      if (best && g.friendship.gift(FRIEND, best.id, this.day).ok)
        g.inventory.remove(best.id);
    }
    this.walker.go("farm");
  }

  private cookDishesKnown(): number {
    const g = this.g;
    const cooks = g.hall.bundles.find((b) => b.id === "cooks");
    return (cooks?.items ?? []).filter((i) => {
      const d = dishById(i.id);
      return !!d && dishKnown(g, d);
    }).length;
  }

  /** Cook what the dish list wants, at the stove, if the kitchen is built and the ingredients are in the pack. */
  private cookFor(): void {
    const g = this.g;
    if (this.lateNight || !kitchenOpen(g) || this.dishList.length === 0) return;
    const doable = this.dishList.filter(({ dish }) => {
      const d = dishById(dish);
      return !!d && canCook(g, d);
    });
    if (doable.length === 0) return;
    if (!this.walker.goToService("house", "stove")) return;
    for (const { dish, n } of this.dishList) {
      const d = dishById(dish);
      for (let i = 0; d && i < n && canCook(g, d); i++)
        if (cook(g, dish) === undefined) this.walker.spend(TIME.action);
    }
    this.walker.go("farm");
    this.refreshPlans();
  }

  /** The carpenter's daily stock may hold a standing lamp; hay for the Fodder bundle is bought once the grain and roots are in hand. */
  private carpenterErrands(): void {
    const g = this.g;
    if (!this.p.plansWholeHall || this.lateNight) return;
    const lampsShort = this.shortOf("oil-lamp");
    const hayShort = this.shortOf("hay");
    const lampToday =
      lampsShort > 0 &&
      g.money > 1000 &&
      dailyStock(this.day).some((f) => f.id === "oil-lamp");
    const fodderReady =
      hayShort > 0 &&
      g.money > hayShort * 50 + 500 &&
      this.unmet().every((w) => w.bundle !== "fodder" || w.item === "hay");
    if (!lampToday && !fodderReady) return;
    if (!this.walker.goToService("sawmill", "carpenter")) return;
    if (lampToday)
      for (let n = 0; n < lampsShort; n++)
        if (!buyFurniture(g, "oil-lamp")) break;
    if (fodderReady) buyHay(g, hayShort);
    this.walker.go("farm");
  }

  // ---- planting and the shop ----

  /** Crops worth putting in the ground today, most needed first. */
  private cropPlan(): string[] {
    const { season, dayOfSeason } = dateOf(this.day);
    const left = DAYS_PER_SEASON - dayOfSeason;
    const inGround = new Map<string, number>();
    for (const { plot } of this.plots())
      if (plot.crop)
        inGround.set(plot.crop.id, (inGround.get(plot.crop.id) ?? 0) + 1);
    const plan: string[] = [];
    const fits = (id: string) => {
      const def = cropById(id);
      return !!def && def.seasons.includes(season) && def.growDays <= left;
    };
    // A slot that takes any of several crops is grown as the first that fits the season.
    const wants: Want[] = [];
    for (const w of [...this.wanted(), ...this.extraWants()]) {
      if (!w.anyOf) wants.push(w);
      else {
        const crop = cropFromList(w.anyOf, season, left);
        if (crop) wants.push({ ...w, item: crop, anyOf: undefined });
      }
    }
    for (const def of CROPS) {
      if (!fits(def.id)) continue;
      const mine = wants.filter((w) => w.item === def.id);
      // A silver-only slot needs several plants for each unit.
      const share = silverShare(this.g.skills.level("farming"));
      const weight = (m: Quality) => (m === "normal" ? 1 : 1 / share);
      const owed = mine.reduce((n, w) => n + weight(w.min), 0);
      const held = this.stacks()
        .filter((s) => splitQuality(s.id).base === def.id)
        .reduce(
          (n, s) =>
            n +
            s.count *
              Math.max(
                0,
                ...mine
                  .filter(
                    (w) =>
                      QUALITIES.indexOf(splitQuality(s.id).quality) >=
                      QUALITIES.indexOf(w.min),
                  )
                  .map((w) => weight(w.min)),
              ),
          0,
        );
      const have = (inGround.get(def.id) ?? 0) + held;
      const want =
        mine.length > 0
          ? Math.max(this.p.cropsPerBundleCrop, Math.ceil(owed))
          : 0;
      for (let i = have; i < want; i++) plan.push(def.id);
    }
    // Jam needs a fruit. Forage may give one, but plant a fruit crop if none is in hand or growing.
    if (this.owes("jam") && this.p.keepsForHall) {
      const hasFruit =
        this.stacks().some(
          (s) => produceOf(splitQuality(s.id).base) === "fruit",
        ) ||
        [...inGround.keys()].some((id) => cropById(id)?.produce === "fruit");
      const fruitCrop = CROPS.find((c) => c.produce === "fruit" && fits(c.id));
      if (!hasFruit && fruitCrop) plan.push(fruitCrop.id);
    }
    // Spare plots go to the persona's cash crop, and more of the best paying one while saving for the herd.
    const targets = new Map<string, number>();
    const cash = this.p.cashCrop;
    if (cash && fits(cash)) targets.set(cash, this.p.cashPlots);
    if (this.p.savingPlots > 0 && this.plannedStep()) {
      const stock = new Set(seedStock(season));
      const best = cashCropFor(season, left, (seed) => stock.has(seed));
      if (best)
        targets.set(best, (targets.get(best) ?? 0) + this.p.savingPlots);
    }
    for (const [crop, target] of targets)
      for (let i = inGround.get(crop) ?? 0; i < target; i++) plan.push(crop);
    return plan;
  }

  private plantWanted(): void {
    if (this.lateNight) return;
    const plan = this.cropPlan();
    if (plan.length === 0) return;
    // Seeds missing from the bag mean a trip to the shop first.
    const short = plan.some(
      (id, i) =>
        this.g.inventory.count(seedId(id)) <
        plan.slice(0, i + 1).filter((x) => x === id).length,
    );
    if (short && this.canAffordSeed(plan)) this.visitShop(plan);
    const map = maps.get(START.map);
    const free = this.freeSoil(map, plan.length);
    for (const [i, crop] of plan.entries()) {
      const spot = free[i];
      if (!spot || this.lateNight) break;
      if (this.g.inventory.count(seedId(crop)) < 1) continue;
      this.walker.go("farm");
      if (this.g.weeds.at(spot.x, spot.y))
        this.act(spot, () =>
          clearWeed(this.g, spot.x, spot.y, "hoe", this.random),
        );
      if (!this.g.farm.plotAt(spot.x, spot.y)?.tilled)
        this.act(spot, () => till(this.g, spot.x, spot.y, this.random));
      this.act(spot, () => plant(this.g, spot.x, spot.y, seedId(crop)));
    }
  }

  /** The nearest open soil to the house door, as a player would lay out a field. */
  private freeSoil(map: ReturnType<typeof maps.get>, n: number): Spot[] {
    const door = map.entry("from_house") ?? { x: 0, y: 0 };
    const out: Spot[] = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        if (!map.isTillable(x, y) || this.g.trees.at(x, y)) continue;
        // A weed on the tile is cut before planting (`plantWanted`), so it only costs a swing.
        if (this.g.farm.plotAt(x, y)?.crop) continue;
        out.push({ x, y });
      }
    out.sort(
      (a, b) =>
        Math.abs(a.x - door.x) +
        Math.abs(a.y - door.y) -
        (Math.abs(b.x - door.x) + Math.abs(b.y - door.y)),
    );
    return out.slice(0, n);
  }

  /**
   * A player does not walk to Hearthwell with empty pockets (note 77): skip the
   * trip when no seed the plan is short of can be paid for.
   */
  private canAffordSeed(plan: string[]): boolean {
    const price = (id: string) => itemById(seedId(id))?.buyPrice ?? Infinity;
    const shortOf = plan.filter(
      (id, i) =>
        this.g.inventory.count(seedId(id)) <
        plan.slice(0, i + 1).filter((x) => x === id).length,
    );
    return shortOf.some((id) => this.g.money >= price(id));
  }

  /** Walk to the shop and buy seeds for the plan; keep a cash reserve. */
  private visitShop(plan: string[] = this.cropPlan()): void {
    if (this.lateNight) return;
    if (plan.length === 0 && this.g.bin.isEmpty) return;
    if (!this.walker.goToService("general-store", "shop")) return;
    const stock = new Set(seedStock(dateOf(this.day).season));
    for (const crop of plan) {
      const seed = seedId(crop);
      if (!stock.has(seed)) continue;
      if (this.g.inventory.count(seed) >= plan.filter((c) => c === crop).length)
        continue;
      buy(this.g.inventory, this.g, seed);
    }
  }

  // ---- selling ----

  /** Ship everything the hall does not still want, at the bin by the house. */
  private shipSurplus(): void {
    if (this.lateNight) return;
    const keep: Want[] = this.p.keepsForHall
      ? [...this.wanted(), ...this.craftWants(), ...this.extraWants()]
      : [];
    const reserve = this.produceReserve();
    const lines: { id: string; n: number }[] = [];
    for (const s of this.stacks()) {
      const { base, quality } = splitQuality(s.id);
      const def = itemById(base);
      if (!def || base.endsWith("-seed") || QUALITIES.indexOf(quality) < 0)
        continue;
      // Ore and coal wait for the furnace while bars are owed.
      if (
        (!this.g.hall.complete("smiths") || this.barsOwed().length > 0) &&
        (base === COAL || ORES.some((o) => o.id === base))
      )
        continue;
      // A machine in the pack waits to be put down, and the fishing gear is kept.
      if (HOLD.has(base)) continue;
      // Hold one unit for each open slot this stack could fill.
      let held = 0;
      for (let u = 0; u < s.count; u++) {
        const at = keep.findIndex((w) => fillsWant(w, s.id));
        if (at < 0) break;
        keep.splice(at, 1);
        held++;
      }
      // One fruit and one vegetable wait for the preserves jar.
      const kind = produceOf(base);
      const keepBack = kind && this.p.keepsForHall ? reserve[kind] : 0;
      if (kind && keepBack > 0 && s.count - held > 0) {
        reserve[kind] = keepBack - 1;
        held++;
      }
      const n = s.count - held;
      if (n > 0) lines.push({ id: s.id, n });
    }
    if (lines.length === 0) return;
    if (!this.walker.goToService("farm", "bin")) return;
    for (const l of lines)
      this.g.bin.ship(
        this.g.inventory,
        l.id,
        l.n,
        sellMultiplier(this.g.skills, l.id),
      );
  }
}
