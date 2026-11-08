import fishData from "../content/fish.json";
import rodData from "../content/rods.json";
import type { Season } from "./calendar";
import { NIGHTFALL } from "./clock";
import { withQuality, type Quality } from "./quality";
import { harvestXp } from "./skills";
import type { GameState } from "./save";

/**
 * Fishing, slices 1 to 3 of note 21: a cast, a bite, the bar, the size roll,
 * the fishing skill, and bait and lures (`tackle.ts`). Pots, the other waters,
 * the cove and the legends are later slices. Content is `src/content/fish.json` and `rods.json`. Numbers are
 * placeholders (`docs/design/07_tuning_numbers.md`). Pure rules, no Phaser.
 */
export type Rarity = "common" | "uncommon" | "rare";
export type Behaviour = "mixed" | "smooth" | "sinker" | "floater" | "dart";
export type Time = "any" | "dawn" | "day" | "dusk" | "night" | "rain";
/** A table of fish. The farm pond uses the river table (notes 32 and 55). */
export type Water = "river";

export interface FishDef {
  id: string;
  name: string;
  water: Water;
  seasons: Season[];
  time: Time;
  rarity: Rarity;
  behaviour: Behaviour;
  /** 0 to 100: how hard the fish is on the bar. */
  difficulty: number;
  sellPrice: number;
  /** Shortest and longest length, in cm. */
  length: [number, number];
}

export const FISH = fishData as FishDef[];

export function fishById(id: string): FishDef | undefined {
  return FISH.find((f) => f.id === id);
}

export interface RodDef {
  id: string;
  name: string;
  price: number;
  /** The bar's height as a share of the track. */
  barWidth: number;
  /** Cast range in tiles. */
  range: number;
  /** Has a bait slot. */
  bait: boolean;
  /** Lure slots: none, one or two. */
  lures: number;
}

export const RODS = rodData as RodDef[];

export function rodById(id: string | undefined): RodDef | undefined {
  return RODS.find((r) => r.id === id);
}

/** Game minutes one cast takes, win or lose. A placeholder: note 21 is silent. */
export const CAST_MINUTES = 20;

/** Energy a cast costs: 8 at level 0, 0.1 less per level, 7 at level 10 (note 21, as Stardew). */
export const CAST_ENERGY = 8;
export const CAST_ENERGY_PER_LEVEL = 0.1;

export function castEnergy(level: number): number {
  const l = Math.min(Math.max(level, 0), 10);
  return Math.round((CAST_ENERGY - CAST_ENERGY_PER_LEVEL * l) * 10) / 10;
}

/** The message when there is too little energy to cast. */
export const TOO_TIRED_TO_CAST = "You are too tired to cast. Rest or eat.";

/** Odds weights by rarity among the fish the conditions allow. Placeholders. */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 6,
  uncommon: 3,
  rare: 1,
};

/** The assist levels in the options: off, a bigger bar and calmer fish, and skip the fight. */
export type Assist = 0 | 1 | 2;
export const ASSIST_NAMES = ["Off", "Bigger bar", "Skip the fight"] as const;

/** The assist bar is 30 percent wider (note 07). */
export const ASSIST_BAR = 1.3;

// ---- the roster

export type TimeSlot = "dawn" | "day" | "dusk" | "night";

/** Dawn ends at 8 am. Dusk is the two hours before nightfall, then night. */
export const DAWN_END = 8 * 60;
export const DUSK_LENGTH = 120;

export function timeSlot(season: Season, minutes: number): TimeSlot {
  const fall = NIGHTFALL[season] ?? NIGHTFALL.spring!;
  if (minutes >= fall) return "night";
  if (minutes >= fall - DUSK_LENGTH) return "dusk";
  if (minutes < DAWN_END) return "dawn";
  return "day";
}

export interface Conditions {
  season: Season;
  /** Minutes since midnight. */
  minutes: number;
  /** Rain or a storm. */
  raining: boolean;
}

/** Fish of a water that the season, time and weather allow, whatever the rod. */
export function fishAvailable(water: Water, c: Conditions): FishDef[] {
  const slot = timeSlot(c.season, c.minutes);
  const rain = c.raining;
  return FISH.filter(
    (f) =>
      f.water === water &&
      f.seasons.includes(c.season) &&
      (f.time === "any" || (f.time === "rain" ? rain : f.time === slot)),
  );
}

/** Odds multipliers from lures, among the fish the conditions allow (`tackle.ts`). */
export interface Odds {
  rare?: number;
  night?: number;
  rain?: number;
}

/** A fish's weight in the draw: its rarity weight times any lure that favours it. */
export function fishWeight(f: FishDef, odds: Odds): number {
  let w = RARITY_WEIGHT[f.rarity];
  if (f.rarity === "rare") w *= odds.rare ?? 1;
  if (f.time === "night") w *= odds.night ?? 1;
  if (f.time === "rain") w *= odds.rain ?? 1;
  return w;
}

export type Bite = { kind: "none" } | { kind: "fish"; fish: FishDef };

/**
 * What bites. Every rod can hook any fish the conditions allow, and no level
 * gates rare fish (note 21). The first catch is the tutorial: always a common
 * fish, and a common one stands in if none is in season.
 */
export function bite(
  water: Water,
  c: Conditions,
  random: () => number,
  tutorial = false,
  odds: Odds = {},
): Bite {
  let pool = fishAvailable(water, c);
  if (tutorial) pool = pool.filter((f) => f.rarity === "common");
  if (pool.length === 0) {
    if (!tutorial) return { kind: "none" };
    const stand = FISH.find((f) => f.water === water && f.rarity === "common");
    return stand ? { kind: "fish", fish: stand } : { kind: "none" };
  }
  const total = pool.reduce((n, f) => n + fishWeight(f, odds), 0);
  let pick = random() * total;
  let fish = pool[pool.length - 1] as FishDef;
  for (const f of pool) {
    pick -= fishWeight(f, odds);
    if (pick < 0) {
      fish = f;
      break;
    }
  }
  return { kind: "fish", fish };
}

// ---- the cast

/** The slice of a map the cast needs. */
export interface WaterMap {
  isWater(x: number, y: number): boolean;
}

/** Distances in tiles (1 up to `range`) along a line from the player where the tile is water. */
export function waterAhead(
  map: WaterMap,
  px: number,
  py: number,
  dx: number,
  dy: number,
  range: number,
): number[] {
  const out: number[] = [];
  for (let d = 1; d <= range; d++)
    if (map.isWater(px + dx * d, py + dy * d)) out.push(d);
  return out;
}

/** Where a cast of this power (0 to 1) lands, in tiles from the player. */
export function castDistance(power: number, range: number): number {
  const p = Math.min(Math.max(power, 0), 1);
  return 1 + Math.round(p * (range - 1));
}

/**
 * The tile a cast lands on, or undefined if the line falls on dry ground. With
 * assist on, the cast is fixed to the middle of the water in range (note 21).
 */
export function landing(
  water: number[],
  range: number,
  power: number,
  assist: Assist,
): number | undefined {
  if (water.length === 0) return undefined;
  if (assist === 0) {
    const d = castDistance(power, range);
    return water.includes(d) ? d : undefined;
  }
  const mid = ((water[0] as number) + (water[water.length - 1] as number)) / 2;
  return water.reduce((best, d) =>
    Math.abs(d - mid) < Math.abs(best - mid) ? d : best,
  );
}

/** A landing as a 0 to 1 share of the rod's range, for the size roll. */
export function distanceShare(distance: number, range: number): number {
  return range <= 1
    ? 0
    : Math.min(Math.max((distance - 1) / (range - 1), 0), 1);
}

// ---- the bar

export const BAR = {
  /** Upward pull while the input is held, and gravity otherwise (track per second squared). */
  lift: 3.2,
  gravity: 2.2,
  maxSpeed: 1.3,
  /** Progress gained per second with the fish in the bar, and lost per second outside it. */
  gain: 0.22,
  loss: 0.1,
  start: 0.3,
  /** Share of the fish's pace under assist level one, and of the loss rate. */
  assistCalm: 0.6,
  assistLoss: 0.5,
} as const;

export interface FightSetup {
  behaviour: Behaviour;
  difficulty: number;
  /** The bar height as a share of the track, with the rod and assist already applied. */
  width: number;
  assist: Assist;
  /** The first catch: the meter does not drain, so the fish cannot get away. */
  tutorial?: boolean;
}

/**
 * The bar's height for a rod, widened by assist (note 07) and by a lure's
 * extra share. The two add together (note 21).
 */
export function barWidth(rod: RodDef, assist: Assist, extra = 0): number {
  const share = 1 + (assist > 0 ? ASSIST_BAR - 1 : 0) + extra;
  return Math.min(rod.barWidth * share, 0.9);
}

export type FightState = "playing" | "caught" | "lost";

/**
 * The catch bar. The track runs 0 (bottom) to 1 (top). Hold the input to lift
 * the bar, release to let it fall, and keep the fish inside it until the meter
 * fills. A fight with no slip is a perfect catch. Steps are in seconds.
 */
export class Fight {
  barPos = 0;
  barVel = 0;
  /** The fish's centre on the track. */
  fishPos: number;
  progress: number = BAR.start;
  perfect = true;
  state: FightState = "playing";
  private target: number;
  private retarget = 0;

  constructor(
    readonly setup: FightSetup,
    random: () => number,
  ) {
    this.fishPos = setup.width / 2;
    this.target = this.fishPos;
    this.pickTarget(random);
  }

  /** True when the fish is inside the bar. */
  get inZone(): boolean {
    return (
      this.fishPos >= this.barPos &&
      this.fishPos <= this.barPos + this.setup.width
    );
  }

  private pickTarget(random: () => number): void {
    const { behaviour, difficulty } = this.setup;
    const d = difficulty / 100;
    const at = (lo: number, hi: number) => lo + random() * (hi - lo);
    let reach: [number, number];
    let wait: [number, number];
    switch (behaviour) {
      case "smooth":
        reach = [-0.2, 0.2];
        wait = [1.2, 2.4];
        break;
      case "sinker":
        reach = [-0.45, 0.15];
        wait = [0.7, 1.6];
        break;
      case "floater":
        reach = [-0.15, 0.45];
        wait = [0.7, 1.6];
        break;
      case "dart": {
        const r = 0.2 + 0.5 * d;
        reach = [-r, r];
        wait = [0.3, 1.0];
        break;
      }
      default:
        reach = [-0.4, 0.4];
        wait = [0.6, 1.6];
    }
    this.target = Math.min(Math.max(this.fishPos + at(...reach), 0), 1);
    this.retarget = at(...wait);
  }

  /** The fish's pace along the track, per second. */
  private pace(): number {
    const { behaviour, difficulty, assist } = this.setup;
    let v = 0.15 + 0.55 * (difficulty / 100);
    if (behaviour === "smooth") v *= 0.7;
    if (behaviour === "dart") v *= 1.8;
    if (behaviour === "sinker" && this.target < this.fishPos) v *= 1.3;
    if (behaviour === "floater" && this.target > this.fishPos) v *= 1.3;
    return assist === 1 ? v * BAR.assistCalm : v;
  }

  /** Advance by `dt` seconds with the input held or not. */
  step(dt: number, held: boolean, random: () => number): void {
    if (this.state !== "playing") return;
    const top = 1 - this.setup.width;
    this.barVel += (held ? BAR.lift : -BAR.gravity) * dt;
    this.barVel = Math.min(Math.max(this.barVel, -BAR.maxSpeed), BAR.maxSpeed);
    this.barPos += this.barVel * dt;
    if (this.barPos <= 0) {
      this.barPos = 0;
      this.barVel = Math.max(this.barVel, 0);
    } else if (this.barPos >= top) {
      this.barPos = top;
      this.barVel = Math.min(this.barVel, 0);
    }

    this.retarget -= dt;
    if (this.retarget <= 0) this.pickTarget(random);
    const move = this.pace() * dt;
    const gap = this.target - this.fishPos;
    this.fishPos += Math.abs(gap) <= move ? gap : Math.sign(gap) * move;

    if (this.inZone) this.progress += BAR.gain * dt;
    else {
      this.perfect = false;
      if (!this.setup.tutorial)
        this.progress -=
          BAR.loss * (this.setup.assist === 1 ? BAR.assistLoss : 1) * dt;
    }
    if (this.progress >= 1) {
      this.progress = 1;
      this.state = "caught";
    } else if (this.progress <= 0) {
      this.progress = 0;
      this.state = "lost";
    }
  }
}

// ---- the catch

/** Silver and gold cut-offs of the size roll (note 21). */
export const SILVER_AT = 0.33;
export const GOLD_AT = 0.67;

/** The hidden size roll: `random * (0.5 + 0.05 * level) + 0.1 * distance`. */
export function sizeRoll(
  level: number,
  distance: number,
  random: () => number,
): number {
  return random() * (0.5 + 0.05 * level) + 0.1 * distance;
}

/** The largest value the size roll can take, for turning it into a length. */
export function sizeRollMax(level: number): number {
  return 0.6 + 0.05 * level;
}

/** Quality from the size roll. A perfect catch lifts silver or gold one grade; no iridium tier. */
export function catchQuality(roll: number, perfect: boolean): Quality {
  const base: Quality =
    roll >= GOLD_AT ? "gold" : roll >= SILVER_AT ? "silver" : "normal";
  return perfect && base === "silver" ? "gold" : base;
}

/** A fish's length in cm from the size roll. */
export function fishLength(fish: FishDef, roll: number, level: number): number {
  const share = Math.min(Math.max(roll / sizeRollMax(level), 0), 1);
  const [lo, hi] = fish.length;
  return Math.round(lo + share * (hi - lo));
}

/** XP for a catch: the harvest formula on the price, one and a half times for a perfect catch. */
export function catchXp(fish: FishDef, perfect: boolean): number {
  return Math.floor(harvestXp(fish.sellPrice) * (perfect ? 1.5 : 1));
}

export interface FishRecord {
  count: number;
  /** Longest catch in cm. */
  longest: number;
}

export interface FishingSave {
  caught: Record<string, FishRecord>;
}

/** What has been caught: how many of each fish and the longest. Saved with the game. */
export class FishLog {
  private caught = new Map<string, FishRecord>();

  record(id: string): FishRecord | undefined {
    return this.caught.get(id);
  }

  /** Total fish landed. */
  get total(): number {
    let n = 0;
    for (const r of this.caught.values()) n += r.count;
    return n;
  }

  /** Different fish landed. */
  get kinds(): number {
    return this.caught.size;
  }

  has(id: string): boolean {
    return this.caught.has(id);
  }

  /** Note a catch. Reports whether it was the first of the kind and a new longest. */
  note(id: string, length: number): { first: boolean; record: boolean } {
    const prev = this.caught.get(id);
    const record = prev !== undefined && length > prev.longest;
    this.caught.set(id, {
      count: (prev?.count ?? 0) + 1,
      longest: Math.max(prev?.longest ?? 0, length),
    });
    return { first: prev === undefined, record };
  }

  save(): FishingSave {
    return {
      caught: Object.fromEntries(
        [...this.caught].map(([id, r]) => [id, { ...r }]),
      ),
    };
  }

  load(raw: unknown): void {
    this.caught = new Map();
    if (typeof raw !== "object" || raw === null) return;
    const caught = (raw as Partial<FishingSave>).caught;
    if (typeof caught !== "object" || caught === null) return;
    for (const [id, r] of Object.entries(caught)) {
      if (!fishById(id) || typeof r !== "object" || r === null) continue;
      const { count, longest } = r as Partial<FishRecord>;
      if (
        typeof count === "number" &&
        Number.isFinite(count) &&
        count > 0 &&
        typeof longest === "number" &&
        Number.isFinite(longest) &&
        longest >= 0
      )
        this.caught.set(id, { count, longest });
    }
  }
}

export interface CatchResult {
  fish: FishDef;
  quality: Quality;
  length: number;
  xp: number;
  /** The first catch of this kind. */
  first: boolean;
  /** A new longest of a kind already caught. */
  record: boolean;
  perfect: boolean;
  /** The catch lay on the ground: the backpack was full. */
  dropped: boolean;
  levelUp?: number;
}

/**
 * Land a fish: roll its size, set the quality, add it to the backpack (or drop
 * it at the player's feet if full, so a fish is never lost), log it and give XP.
 * Assist level two skips the fight: the size roll still decides the grade, and
 * the caller passes `perfect: false`.
 */
export function landFish(
  g: GameState,
  fish: FishDef,
  opts: {
    perfect: boolean;
    distance: number;
    random: () => number;
    /** Where an overflowing catch lies, in tiles. */
    at: { x: number; y: number };
  },
): CatchResult {
  const level = g.skills.level("fishing");
  const roll = sizeRoll(level, opts.distance, opts.random);
  const quality = catchQuality(roll, opts.perfect);
  const length = fishLength(fish, roll, level);
  const item = withQuality(fish.id, quality);
  let dropped = false;
  if (!g.inventory.add(item)) {
    g.ground.drop(opts.at.x, opts.at.y, item, 1);
    dropped = true;
  }
  const { first, record } = g.fishing.note(fish.id, length);
  const xp = catchXp(fish, opts.perfect);
  return {
    fish,
    quality,
    length,
    xp,
    first,
    record,
    perfect: opts.perfect,
    dropped,
    levelUp: g.skills.gain("fishing", xp),
  };
}
