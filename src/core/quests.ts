import requestData from "../content/requests.json";
import { dateOf, type Season } from "./calendar";
import { CROPS } from "./crops";
import { FORAGE } from "./forage";
import { itemById } from "./items";
import { QUALITIES, splitQuality, withQuality } from "./quality";
import type { GameState } from "./save";

/**
 * The request board and the quest record (`docs/design/50_request_board_and_quests.md`).
 * The board posts at most one request a day, seeded from the day, with the day
 * posted and the next day to finish it. Delivery is handed in at the board (the
 * poster stands in until villagers can be talked to). Gathering counts what is
 * collected after accepting. Pools and count ranges are
 * `src/content/requests.json`. Pure rules: no Phaser.
 */
export type QuestType = "delivery" | "gathering";
export type QuestState = "open" | "done" | "lapsed" | "cancelled";

/** Chance a day posts a request. Placeholder (note 07, SC-27). */
export const REQUEST_CHANCE = 0.8;
/** No request on the first day. Placeholder (note 07, SC-27). */
export const FIRST_REQUEST_DAY = 2;
/** Days to finish: the day posted and the next. */
export const REQUEST_DAYS = 2;
/** Delivery pays this many times the normal quality sell price (Stardew). */
export const DELIVERY_MULTIPLIER = 3;
/** Gathering pay as a multiple of the normal sell value of the count. Placeholder (note 07). */
export const GATHERING_MULTIPLIER = 2;
/** Share of drawn requests that are deliveries. Placeholder (note 07). */
export const DELIVERY_SHARE = 0.5;
/** The poster while villagers are missing. */
export const BOARD_POSTER = "board";

interface Source {
  from: "crop" | "forage" | "items";
  /** Item ids, for `items` sources. */
  ids?: string[];
  min: number;
  max: number;
}

export const REQUEST_POOLS = requestData as Record<QuestType, Source[]>;

export interface Quest {
  id: string;
  source: "board";
  type: QuestType;
  poster: string;
  want: { item: string; count: number };
  reward: { gold: number };
  posted: number;
  deadline: number;
  /** The gathering counter. Always 0 for a delivery. */
  progress: number;
  state: QuestState;
}

/** A small stable hash of a day and a salt, as a number in [0, 1). */
function roll(day: number, salt: number): number {
  let h = Math.imul(day * 8 + salt + 1, 0x9e3779b1) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

/** What a source can name this season: only things the player can reach. */
function candidates(
  s: Source,
  season: Season,
): { item: string; min: number; max: number }[] {
  const ids =
    s.from === "crop"
      ? CROPS.filter((c) => c.seasons.includes(season)).map((c) => c.id)
      : s.from === "forage"
        ? FORAGE.filter(
            (f) => f.seasons.includes(season) && !f.rare && !f.soil,
          ).map((f) => f.id)
        : (s.ids ?? []);
  return ids.map((item) => ({ item, min: s.min, max: s.max }));
}

/** The pay for a request: a delivery by the item's price, a gathering by ours. */
export function rewardFor(
  type: QuestType,
  item: string,
  count: number,
): number {
  const price = itemById(item)?.sellPrice ?? 0;
  const mult = type === "delivery" ? DELIVERY_MULTIPLIER : GATHERING_MULTIPLIER;
  return Math.max(1, Math.round(price * count * mult));
}

/** The request a day posts, if any. The same day always draws the same request. */
export function requestFor(day: number): Quest | undefined {
  if (day < FIRST_REQUEST_DAY || roll(day, 0) >= REQUEST_CHANCE)
    return undefined;
  const { season } = dateOf(day);
  const type: QuestType =
    roll(day, 1) < DELIVERY_SHARE ? "delivery" : "gathering";
  const pool = REQUEST_POOLS[type].flatMap((s) => candidates(s, season));
  if (pool.length === 0) return undefined;
  const pick = pool[Math.floor(roll(day, 2) * pool.length)]!;
  const count = pick.min + Math.floor(roll(day, 3) * (pick.max - pick.min + 1));
  return {
    id: `board-${day}`,
    source: "board",
    type,
    poster: BOARD_POSTER,
    want: { item: pick.item, count },
    reward: { gold: rewardFor(type, pick.item, count) },
    posted: day,
    deadline: day + REQUEST_DAYS - 1,
    progress: 0,
    state: "open",
  };
}

export interface QuestsSave {
  log: Quest[];
  completed: number;
}

const TYPES: QuestType[] = ["delivery", "gathering"];
const STATES: QuestState[] = ["open", "done", "lapsed", "cancelled"];

/** Requests taken, and how many have been finished (for the errand achievements). */
export class Quests {
  private log: Quest[] = [];
  /** Requests finished, ever. */
  completed = 0;

  get(id: string): Quest | undefined {
    return this.log.find((q) => q.id === id);
  }

  /** The requests being worked on, oldest first. */
  open(): Quest[] {
    return this.log.filter((q) => q.state === "open");
  }

  /** The board's offers today: today's and yesterday's, if not yet taken. Newest first. */
  posted(day: number): Quest[] {
    const out: Quest[] = [];
    for (let d = day; d > day - REQUEST_DAYS; d--) {
      const q = requestFor(d);
      if (q && q.deadline >= day && !this.get(q.id)) out.push(q);
    }
    return out;
  }

  /** Take a posted request. There is no cap on how many are open. */
  accept(id: string, day: number): Quest | undefined {
    const q = this.posted(day).find((p) => p.id === id);
    if (!q) return undefined;
    this.log.push(q);
    return q;
  }

  /** Give a request up. It costs nothing. */
  cancel(id: string): boolean {
    const q = this.get(id);
    if (!q || q.state !== "open") return false;
    q.state = "cancelled";
    return true;
  }

  /** Count a collected item toward every open gathering request that names it. */
  credit(itemId: string, count: number, day: number): void {
    const { base } = splitQuality(itemId);
    for (const q of this.log)
      if (
        q.state === "open" &&
        q.type === "gathering" &&
        q.want.item === base &&
        day >= q.posted &&
        day <= q.deadline
      )
        q.progress += count;
  }

  /** Lapse requests past their deadline and forget settled ones nobody can re-post. Returns lapsed ids. */
  endDay(day: number): Quest[] {
    const lapsed: Quest[] = [];
    for (const q of this.log)
      if (q.state === "open" && day > q.deadline) {
        q.state = "lapsed";
        lapsed.push(q);
      }
    this.log = this.log.filter((q) => q.state === "open" || q.deadline >= day);
    return lapsed;
  }

  save(): QuestsSave {
    return {
      log: this.log.map((q) => ({
        ...q,
        want: { ...q.want },
        reward: { ...q.reward },
      })),
      completed: this.completed,
    };
  }

  load(raw: unknown): void {
    this.log = [];
    this.completed = 0;
    if (typeof raw !== "object" || raw === null) return;
    const data = raw as Partial<QuestsSave>;
    if (Number.isInteger(data.completed) && (data.completed as number) >= 0)
      this.completed = data.completed as number;
    if (!Array.isArray(data.log)) return;
    for (const q of data.log as Quest[]) {
      if (
        typeof q !== "object" ||
        q === null ||
        typeof q.id !== "string" ||
        this.get(q.id) ||
        !TYPES.includes(q.type) ||
        !STATES.includes(q.state) ||
        typeof q.want !== "object" ||
        q.want === null ||
        typeof q.want.item !== "string" ||
        !itemById(q.want.item) ||
        !Number.isInteger(q.want.count) ||
        q.want.count < 1 ||
        typeof q.reward !== "object" ||
        q.reward === null ||
        !Number.isInteger(q.reward.gold) ||
        !Number.isInteger(q.posted) ||
        !Number.isInteger(q.deadline) ||
        !Number.isInteger(q.progress) ||
        q.progress < 0
      )
        continue;
      this.log.push({
        id: q.id,
        source: "board",
        type: q.type,
        poster: typeof q.poster === "string" ? q.poster : BOARD_POSTER,
        want: { item: q.want.item, count: q.want.count },
        reward: { gold: q.reward.gold },
        posted: q.posted,
        deadline: q.deadline,
        progress: q.progress,
        state: q.state,
      });
    }
  }
}

/** Count a collected item toward gathering requests. Call wherever the player gathers. */
export function noteGathered(g: GameState, itemId: string, count = 1): void {
  g.quests.credit(itemId, count, g.day.clock.day);
}

/** True when a request can be handed in: the goods are in the pack, or the counter is met. */
export function ready(g: GameState, q: Quest): boolean {
  if (q.state !== "open") return false;
  return q.type === "gathering"
    ? q.progress >= q.want.count
    : packHolds(g, q.want.item) >= q.want.count;
}

/** How many of an item the pack holds across every quality. */
function packHolds(g: GameState, base: string): number {
  return QUALITIES.reduce(
    (n, ql) => n + g.inventory.count(withQuality(base, ql)),
    0,
  );
}

/** Take goods from the pack, lowest quality first. */
function takeGoods(g: GameState, base: string, count: number): void {
  let left = count;
  for (const ql of QUALITIES) {
    const id = withQuality(base, ql);
    const n = Math.min(left, g.inventory.count(id));
    if (n > 0) g.inventory.remove(id, n);
    left -= n;
  }
}

export type TurnIn = { ok: true; gold: number } | { ok: false; reason: string };

/**
 * Finish a request at the board: a delivery hands the goods in, a gathering
 * needs its counter met. Pays the gold and counts toward the errand
 * achievements. A delivery is not a gift.
 */
export function turnIn(g: GameState, id: string, day: number): TurnIn {
  const q = g.quests.get(id);
  if (!q || q.state !== "open")
    return { ok: false, reason: "No such request." };
  if (day > q.deadline) return { ok: false, reason: "It has run out of time." };
  if (!ready(g, q))
    return {
      ok: false,
      reason:
        q.type === "gathering"
          ? "You have not gathered enough yet."
          : "You do not have enough to hand in.",
    };
  if (q.type === "delivery") takeGoods(g, q.want.item, q.want.count);
  q.state = "done";
  g.money += q.reward.gold;
  g.quests.completed += 1;
  return { ok: true, gold: q.reward.gold };
}

/** Words for what a request wants. */
export function wantText(q: Quest): string {
  const name = itemById(q.want.item)?.name ?? q.want.item;
  return q.type === "delivery"
    ? `Hand in ${q.want.count} ${name}`
    : `Gather ${q.want.count} ${name}`;
}

/** Days left including today, never below 0. */
export function daysLeft(q: Quest, day: number): number {
  return Math.max(q.deadline - day + 1, 0);
}

/** Overnight: lapse what ran out. `day` is the new day. Returns report lines. */
export function endDayQuests(g: GameState, day: number): string[] {
  return g.quests
    .endDay(day)
    .map((q) => `The request "${wantText(q)}" ran out of time.`);
}
