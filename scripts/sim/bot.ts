// A persona playing the core rules for a whole game (note 46). It makes the
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
import { sleep } from "../../src/core/sleep";
import { startGame } from "../../src/core/toolbar";
import type { GameState } from "../../src/core/save";
import { START } from "../../src/core/maps";
import { isRaining } from "../../src/core/weather";
import { TIME, Walker, type Spot } from "./world";
import type { Persona } from "./personas";

/** `SIM_ARTISAN`: "off" (default) leaves the bundle out, "parallel" crafts as soon as a recipe is known, "after" waits for Woodland and the Smith's. */
const ARTISAN_MODE =
  (
    globalThis as unknown as {
      process: { env: Record<string, string | undefined> };
    }
  ).process.env.SIM_ARTISAN ?? "off";

/** Gold the bot keeps back for seeds before it buys ore. */
const SEED_RESERVE = 1500;

/** Young trees a day the bot cuts back. */
const TIDY_TREES = 8;

/** Gold kept back after buying an orchard tree. */
const ORCHARD_RESERVE = 300;

/** Machines the bot sets down on the farm as soon as it has crafted them. */
const MACHINES_TO_RUN = ["preserves-jar", "bee-house"];

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
export const UNPLAYED_BUNDLES: readonly string[] =
  ARTISAN_MODE === "off" ? ["artisan-goods"] : [];

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
}

export function playGame(
  persona: Persona,
  random: () => number,
  maxDay: number,
  /** Called after each day's play, to watch a run. */
  onDay?: (g: GameState) => void,
): RunResult {
  const g = startGame();
  g.forage.respawn(dateOf(1).season, maps.get(START.map).forageSpots, random);
  const bot = new Bot(g, persona, random);
  const result: RunResult = {
    bundleDays: {},
    passOuts: 0,
    dayEnds: [],
    withered: 0,
    moneyAtSeasonEnd: [],
    lastDay: 1,
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

interface Want {
  bundle: string;
  item: string;
  room: string;
  min: Quality;
}

class Bot {
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
    // Order follows what a player does: crops first, then the walk for goods.
    this.harvestRipe();
    this.plantWanted();
    if (!isRaining(g.weather) && !this.lateNight) this.waterAll();
    if (this.random() < this.p.forageChance) this.sweepForage();
    this.eatIfLow();
    if (this.p.keepsForHall) {
      this.tendFurnace();
      this.gatherWoodland();
    }
    if (this.p.keepsForHall) this.tendArtisan();
    if (this.dueFor(this.p.hallEvery)) this.visitHall();
    if (this.p.keepsForHall) this.tendFurnace();
    this.tidyTrees();
    this.shipSurplus();
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
    this.walker.spend(TIME.action);
    return ok;
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
    if (this.walker.mapId !== "farm") this.walker.enter("farm");
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
    for (let i = 0; i < inv.size; i++) {
      const slot = inv.slot(i);
      if (slot && itemById(slot.id)?.energy && eat(this.g, slot.id).ok) return;
    }
  }

  // ---- the woodland and the smith ----

  /** Units of an item the hall still wants and the pack does not yet hold. */
  private shortOf(item: string): number {
    const owed = [...this.wanted(), ...this.craftWants()].filter(
      (w) => w.item === item,
    ).length;
    return Math.max(owed - this.g.inventory.count(item), 0);
  }

  /** Chop trees, cut weeds and break rocks for the Woodland bundle. */
  private gatherWoodland(): void {
    const g = this.g;
    if (
      this.lateNight ||
      (g.hall.complete("woodland") && this.craftWants().length === 0)
    )
      return;
    const spare = () => g.day.energy.current > 30 && !this.lateNight;
    const logging = () => this.shortOf("wood") > 0 || this.shortOf("sap") > 0;
    if (logging()) {
      this.walker.enter("farm");
      while (logging() && spare()) {
        const trees = [...g.trees.each()].filter(
          (t) => t.stump || t.stage >= MATURE_STAGE,
        );
        if (trees.length === 0) break;
        const costs = this.walker.costsNextTo(trees);
        const at = costs.indexOf(Math.min(...costs));
        const t = trees[at] as Spot;
        if (costs[at] === Infinity) break;
        let guard = 0;
        while (g.trees.at(t.x, t.y) && spare() && guard++ < 30)
          if (!this.act(t, () => chop(g, t.x, t.y, this.random))) break;
      }
    }
    // Weeds spread a little each night, so a patient player lets them grow and
    // cuts a bunch at once, at the end of a season or when the farm is thick.
    const season = dateOf(this.day);
    const ripe =
      g.weeds.count >= 40 || season.dayOfSeason > DAYS_PER_SEASON - 3;
    if (this.shortOf("fiber") > 0 && ripe) {
      this.walker.enter("farm");
      const weeds = [...g.weeds.each()];
      this.nearestFirst(weeds, (w) => {
        if (this.shortOf("fiber") > 0 && spare())
          this.act(w, () => clearWeed(g, w.x, w.y, "hoe", this.random));
      });
    }
    if (this.shortOf("stone") > 0 && minesOpen(this.day)) {
      this.walker.enter("farm");
      this.breakRocks(undefined);
      if (this.shortOf("stone") > 0 && spare() && this.walker.descend(1))
        this.breakRocks(1);
    }
  }

  /** Cut a few of the nearest young trees each day, so the farm is not grown over and the doors stay open. */
  private tidyTrees(): void {
    const g = this.g;
    if (this.lateNight || g.day.energy.current < 60) return;
    this.walker.enter("farm");
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
      if (!this.walker.goToService("mine", "smith")) return;
      buy(g.inventory, g, COPPER_ORE, 1);
      handOverCopper(g);
      this.walker.enter("farm");
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
      this.walker.goToService("mine", "smith")
    ) {
      for (const { bar, n } of owed) {
        const def = ORES.find((o) => o.id === bar.ore);
        const want = n * ORE_PER_BAR - g.inventory.count(bar.ore);
        if (def && want > 0) buy(g.inventory, g, def.id, want);
      }
      const coal = owed.reduce((t, o) => t + o.n * COAL_PER_BAR, 0);
      if (coal > g.inventory.count(COAL))
        buy(g.inventory, g, COAL, coal - g.inventory.count(COAL));
      this.walker.enter("farm");
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
    const out: Want[] = [];
    for (const b of this.g.hall.bundles) {
      if (UNPLAYED_BUNDLES.includes(b.id) || this.g.hall.complete(b.id))
        continue;
      const bulk = b.items.some((i) => i.count > 1);
      const goods = bulk ? b.items.slice(0, b.required) : b.items;
      for (const i of goods)
        for (let n = this.g.hall.have(b.id, i.id); n < i.count; n++)
          out.push({
            bundle: b.id,
            item: i.id,
            room: b.room,
            min: i.minQuality,
          });
    }
    return out;
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
    for (const w of this.wanted()) {
      for (const s of this.stacks()) {
        const base = splitQuality(s.id).base;
        if (base !== w.item && categoryOf(base) !== w.item) continue;
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
        for (const o of now.filter((x) => x.room === room))
          this.g.hall.handIn(this.g.inventory, this.g, o.bundle, o.stack);
      }
    }
    this.walker.enter("farm");
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
    if (
      !this.p.keepsForHall ||
      ARTISAN_MODE === "off" ||
      g.hall.complete("artisan-goods")
    )
      return [];
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
    if (this.owes("honey") && missing("bee-house") && open("bee-house"))
      gaps.push("bee-house");
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
    if (
      ARTISAN_MODE === "off" ||
      this.lateNight ||
      g.hall.complete("artisan-goods")
    )
      return;
    this.walker.enter("farm");
    this.plantOrchard();
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
    for (const t of [...g.fruitTrees.each()])
      if (g.fruitTrees.ripe(t.x, t.y))
        this.act(t, () => pickFruit(g, t.x, t.y));
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
      if (!this.walker.goToService("farm", "shop")) return;
      if (!buy(g.inventory, g, sapling)) return;
    }
    const map = maps.get(START.map);
    this.walker.enter("farm");
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
    const wants = this.wanted();
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
    // Spare plots go to the persona's cash crop.
    const cash = this.p.cashCrop;
    if (cash && fits(cash)) {
      const planted = inGround.get(cash) ?? 0;
      for (let i = planted; i < this.p.cashPlots; i++) plan.push(cash);
    }
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
    if (short) this.visitShop(plan);
    const map = maps.get(START.map);
    const free = this.freeSoil(map, plan.length);
    for (const [i, crop] of plan.entries()) {
      const spot = free[i];
      if (!spot || this.lateNight) break;
      if (this.g.inventory.count(seedId(crop)) < 1) continue;
      this.walker.enter("farm");
      if (this.g.weeds.at(spot.x, spot.y))
        this.act(spot, () =>
          clearWeed(this.g, spot.x, spot.y, "hoe", this.random),
        );
      if (!this.g.farm.plotAt(spot.x, spot.y)?.tilled)
        this.act(spot, () => till(this.g, spot.x, spot.y));
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

  /** Walk to the shop and buy seeds for the plan; keep a cash reserve. */
  private visitShop(plan: string[] = this.cropPlan()): void {
    if (this.lateNight) return;
    if (plan.length === 0 && this.g.bin.isEmpty) return;
    if (!this.walker.goToService("farm", "shop")) return;
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
      ? [...this.wanted(), ...this.craftWants()]
      : [];
    const reserve = this.produceReserve();
    const lines: { id: string; n: number }[] = [];
    for (const s of this.stacks()) {
      const { base, quality } = splitQuality(s.id);
      const def = itemById(base);
      if (!def || base.endsWith("-seed") || QUALITIES.indexOf(quality) < 0)
        continue;
      // Ore and coal wait for the furnace while the Smith's is open.
      if (
        !this.g.hall.complete("smiths") &&
        (base === COAL || ORES.some((o) => o.id === base))
      )
        continue;
      // A machine in the pack waits to be put down.
      if (MACHINES_TO_RUN.includes(base)) continue;
      // Hold one unit for each open slot this stack could fill.
      let held = 0;
      for (let u = 0; u < s.count; u++) {
        const at = keep.findIndex(
          (w) =>
            w.item === base &&
            QUALITIES.indexOf(quality) >= QUALITIES.indexOf(w.min),
        );
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
