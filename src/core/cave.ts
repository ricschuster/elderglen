import type { Outcome } from "./actions";
import { FORAGE, type Spot } from "./forage";
import { FRUIT_TREES } from "./fruittrees";
import { machineMinutes } from "./machines";
import { processFor } from "./processing";
import { doubleForageChance } from "./professions";
import { forageQuality, withQuality, type Quality } from "./quality";
import type { GameState } from "./save";

/**
 * The farm cave (`docs/design/66_fall_winter_festivals_and_farm_cave.md`).
 * Once total earnings pass the mark, a villager asks to use the cave and the
 * player picks fruit bats or mushrooms for good. Pure rules; the numbers are
 * the Stardew shape with our placeholders (`07_tuning_numbers.md`).
 */
export const CAVE_MAP = "farm-cave";
/** Total gold earned over the whole game that brings the offer. */
export const CAVE_MARK = 25000;

export type CaveChoice = "bats" | "mushrooms";

/** Chance a night leaves 0, 1, 2, 3 or 4 new fruit in a bat cave (note 07). */
export const BAT_ODDS = [0.48, 0.25, 0.13, 0.07, 0.07] as const;
/** XP for picking one bat fruit or one mushroom. */
export const BAT_XP = 7;
export const MUSHROOM_XP = 5;

export const MUSHROOM_BOXES = 6;
/** Days a box takes to make a mushroom. */
export const MUSHROOM_DAYS = 2;
/** Our weights for what a box grows. */
export const MUSHROOM_WEIGHTS: readonly { id: string; weight: number }[] = [
  { id: "field-mushroom", weight: 50 },
  { id: "morel", weight: 20 },
  { id: "chanterelle", weight: 15 },
  { id: "cave-mushroom", weight: 10 },
  { id: "snowcap", weight: 5 },
];

export interface MushroomBox {
  /** Days grown since the last pick. */
  days: number;
  /** The mushroom waiting to be picked. */
  ready?: string;
}

export interface CaveJob {
  output: string;
  count: number;
  doneAt: number;
}

export interface CaveSave {
  earnings: number;
  asked: boolean;
  choice?: CaveChoice;
  shownDay?: number;
  arrivalDay?: number;
  fruit: { x: number; y: number; id: string }[];
  boxes: MushroomBox[];
  dehydrator?: CaveJob;
}

const key = (x: number, y: number) => `${x},${y}`;

/** How many fruit a night brings, from one roll in 0 to 1. */
export function batFruitCount(roll: number): number {
  let sum = 0;
  for (let n = 0; n < BAT_ODDS.length; n++) {
    sum += BAT_ODDS[n]!;
    if (roll < sum) return n;
  }
  return BAT_ODDS.length - 1;
}

/** Every fruit a bat may leave, in any season: wild fruit and orchard fruit. */
export const BAT_FRUIT: readonly string[] = [
  ...FORAGE.filter((f) => f.produce === "fruit").map((f) => f.id),
  ...FRUIT_TREES.map((t) => t.id),
];

/** A mushroom for a box, by weight, from one roll in 0 to 1. */
export function pickMushroom(roll: number): string {
  const total = MUSHROOM_WEIGHTS.reduce((n, m) => n + m.weight, 0);
  let at = roll * total;
  for (const m of MUSHROOM_WEIGHTS) {
    if (at < m.weight) return m.id;
    at -= m.weight;
  }
  return MUSHROOM_WEIGHTS[0]!.id;
}

/** The farm cave's state: the offer, the choice and what is growing. */
export class FarmCave {
  /** All gold received over the whole game: sales and bundle rewards (SC-54). */
  earnings = 0;
  /** True once the villager has asked. */
  asked = false;
  choice: CaveChoice | undefined = undefined;
  /** The first day the villager is at the door. */
  arrivalDay: number | undefined = undefined;
  /** The day the choice screen last came up, so it shows once a morning. */
  shownDay: number | undefined = undefined;
  private fruit = new Map<string, string>();
  boxes: MushroomBox[] = Array.from({ length: MUSHROOM_BOXES }, () => ({
    days: 0,
  }));
  dehydrator: CaveJob | undefined = undefined;

  /** True while the offer is waiting for an answer. */
  get pending(): boolean {
    return this.asked && this.choice === undefined;
  }

  /** True when the choice screen should come up on this day: once a morning, from the arrival day. */
  due(day: number): boolean {
    return (
      this.pending && day >= (this.arrivalDay ?? 0) && this.shownDay !== day
    );
  }

  /** The cave door is open once a choice is made. */
  get open(): boolean {
    return this.choice !== undefined;
  }

  /**
   * Count gold earned. Returns true the moment the mark is passed, and the
   * villager comes on `arrivalDay`, the next morning.
   */
  addEarnings(gold: number, arrivalDay: number): boolean {
    this.earnings += gold;
    if (this.asked || this.earnings < CAVE_MARK) return false;
    this.asked = true;
    this.arrivalDay = arrivalDay;
    return true;
  }

  /** Pick for good. Returns false if there is no offer or one was made already. */
  choose(c: CaveChoice): boolean {
    if (!this.pending) return false;
    this.choice = c;
    return true;
  }

  fruitAt(x: number, y: number): string | undefined {
    return this.fruit.get(key(x, y));
  }

  *eachFruit(): Generator<{ x: number; y: number; id: string }> {
    for (const [k, id] of this.fruit) {
      const [x, y] = k.split(",").map(Number) as [number, number];
      yield { x, y, id };
    }
  }

  get fruitCount(): number {
    return this.fruit.size;
  }

  takeFruit(x: number, y: number): string | undefined {
    const id = this.fruit.get(key(x, y));
    this.fruit.delete(key(x, y));
    return id;
  }

  /**
   * Overnight. Bats leave 0 to 4 fruit on free spots, and mushroom boxes grow.
   * Fruit is any fruit in any season (SC-55): wild or orchard.
   */
  endDay(spots: Spot[], random: () => number): void {
    if (this.choice === "bats") {
      const options = BAT_FRUIT;
      const free = spots.filter((s) => !this.fruit.has(key(s.x, s.y)));
      let n = batFruitCount(random());
      while (n-- > 0 && free.length > 0 && options.length > 0) {
        const spot = free.splice(Math.floor(random() * free.length), 1)[0]!;
        const id = options[Math.floor(random() * options.length)]!;
        this.fruit.set(key(spot.x, spot.y), id);
      }
    }
    if (this.choice === "mushrooms") {
      for (const box of this.boxes) {
        if (box.ready) continue;
        box.days += 1;
        if (box.days >= MUSHROOM_DAYS) {
          box.ready = pickMushroom(random());
          box.days = 0;
        }
      }
    }
  }

  save(): CaveSave {
    return {
      earnings: this.earnings,
      asked: this.asked,
      choice: this.choice,
      shownDay: this.shownDay,
      arrivalDay: this.arrivalDay,
      fruit: [...this.eachFruit()],
      boxes: this.boxes.map((b) => ({ ...b })),
      dehydrator: this.dehydrator ? { ...this.dehydrator } : undefined,
    };
  }

  load(data: Partial<CaveSave> | undefined): void {
    if (!data) return;
    this.earnings = Number.isFinite(data.earnings) ? data.earnings! : 0;
    this.asked = data.asked === true;
    this.choice =
      data.choice === "bats" || data.choice === "mushrooms"
        ? data.choice
        : undefined;
    this.shownDay =
      typeof data.shownDay === "number" ? data.shownDay : undefined;
    this.arrivalDay =
      typeof data.arrivalDay === "number" ? data.arrivalDay : undefined;
    this.fruit.clear();
    for (const f of data.fruit ?? [])
      if (typeof f?.id === "string")
        this.fruit.set(key(Number(f.x), Number(f.y)), f.id);
    if (Array.isArray(data.boxes) && data.boxes.length === MUSHROOM_BOXES)
      this.boxes = data.boxes.map((b) => ({
        days: Number(b.days) || 0,
        ready: typeof b.ready === "string" ? b.ready : undefined,
      }));
    this.dehydrator = data.dehydrator ? { ...data.dehydrator } : undefined;
  }
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

function award(g: GameState, xp: number, item: string): Outcome {
  const level = g.skills.gain("foraging", xp);
  return {
    ok: true,
    item,
    levelUp: level ? { skill: "foraging", level } : undefined,
  };
}

/** Pick the bat fruit on a tile. Botanists get gold, Gatherers sometimes a second. */
export function pickBatFruit(
  g: GameState,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const id = g.cave.fruitAt(x, y);
  if (!id) return fail("nothing here");
  const quality: Quality = g.skills.has("botanist")
    ? "gold"
    : forageQuality(g.skills.level("foraging"), random());
  const item = withQuality(id, quality);
  if (g.inventory.room(item) < 1) return fail("backpack full");
  g.cave.takeFruit(x, y);
  g.inventory.add(item);
  if (random() < doubleForageChance(g.skills)) g.inventory.add(item);
  return award(g, BAT_XP, item);
}

/** Pick the mushroom in a box. Always normal quality. */
export function pickMushroomBox(g: GameState, index: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const box = g.cave.boxes[index];
  if (!box?.ready) return fail("nothing here");
  if (g.inventory.room(box.ready) < 1) return fail("backpack full");
  const id = box.ready;
  delete box.ready;
  g.inventory.add(id);
  return award(g, MUSHROOM_XP, id);
}

/** True when a cave dehydrator exists: the mushroom cave comes with one. */
export const hasCaveDehydrator = (g: GameState) =>
  g.cave.choice === "mushrooms";

/** Load the free dehydrator with the held item. */
export function loadCaveDehydrator(g: GameState, item: string): Outcome {
  if (g.day.over) return fail("exhausted");
  if (!hasCaveDehydrator(g)) return fail("no machine here");
  if (g.cave.dehydrator) return fail("machine busy");
  const p = processFor("dehydrator", item);
  if (!p) return fail("machine will not take that");
  if (g.inventory.count(item) < p.use) return fail("not enough input");
  g.inventory.remove(item, p.use);
  g.cave.dehydrator = {
    output: p.output,
    count: p.count,
    doneAt: machineMinutes(g) + p.minutes,
  };
  return { ok: true };
}

export const caveDehydratorDone = (g: GameState) =>
  g.cave.dehydrator !== undefined &&
  machineMinutes(g) >= g.cave.dehydrator.doneAt;

/** Take the dried goods from the free dehydrator. */
export function collectCaveDehydrator(g: GameState): Outcome {
  if (g.day.over) return fail("exhausted");
  const job = g.cave.dehydrator;
  if (!job) return fail("machine empty");
  if (!caveDehydratorDone(g)) return fail("machine busy");
  if (g.inventory.room(job.output) < job.count) return fail("backpack full");
  g.inventory.add(job.output, job.count);
  g.cave.dehydrator = undefined;
  return { ok: true, item: job.output };
}
