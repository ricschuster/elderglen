import orderData from "../content/orders.json";
import { dateOf, type Season } from "./calendar";
import { cropById } from "./crops";
import { fishById } from "./fishing";
import type { BinLine } from "./shipping";
import { splitQuality, type Quality } from "./quality";
import type { GameState } from "./save";

/**
 * Special Orders (`docs/design/65_special_orders_and_debris.md`). Bigger asks
 * with a window of days that starts when the player accepts. A first
 * completion pays a unique reward and gold, a repeat pays gold only. Orders
 * are data in `src/content/orders.json`. Pure rules: no Phaser.
 */

/** Fall 2 of year one: the day the board opens, in any weather (SC-32, checked). */
export const ORDERS_OPEN_DAY = 2 * 28 + 2;
/** Orders on the board at once. The owner recalls two (SC-32, unchecked). */
export const BOARD_SIZE = 2;
/** Weeks back the board looks for a posted order still waiting to be taken. */
const POSTED_WEEKS = 8;

export type OrderAsk =
  /** Ship `count` of any one crop, in its season. */
  | { kind: "ship-one-crop"; count: number }
  /** Ship `count` vegetables of at least this quality. */
  | { kind: "ship-quality-vegetables"; count: number; quality: Quality }
  /** Land `count` of any one fish that is in season. Counted from the fish log since acceptance. */
  | { kind: "catch-one-fish"; count: number }
  /** Land `count` fish from one kind of water. */
  | { kind: "catch-water"; count: number }
  /** Beat `count` of any one creature kind. Counted from the kill tally since acceptance. */
  | { kind: "slay-one"; count: number };

export interface OrderDef {
  id: string;
  title: string;
  poster: string;
  text: string;
  ask: OrderAsk;
  /** Days from acceptance to the last day the order can be filled. */
  windowDays: number;
  /** True when it can be done again for gold alone. */
  repeat: boolean;
  /** Seasons in which the order is not posted. */
  notSeasons: Season[];
  /** Gold on every completion. */
  gold: number;
  /** The unique reward for the first completion, besides the gold. */
  firstReward: { item?: { id: string; count: number }; text: string };
}

export const ORDERS = orderData as OrderDef[];

export function orderById(id: string): OrderDef | undefined {
  return ORDERS.find((o) => o.id === id);
}

export interface ActiveOrder {
  id: string;
  /** The day the player took it. */
  accepted: number;
  /** The last day it can be filled. */
  due: number;
  /** Count so far, by crop id or `all`. */
  progress: Record<string, number>;
  /** Tallies when the order was taken, for the orders counted from a log (fish and kills). */
  base?: OrderBase;
}

/** Fish landed and creatures beaten by id, so an order counts only what comes after it was taken. */
export interface OrderBase {
  fish: Record<string, number>;
  kills: Record<string, number>;
}

/** The tallies to keep when an order is taken. */
export function orderBase(g: GameState): OrderBase {
  const fish: Record<string, number> = {};
  for (const [id, r] of Object.entries(g.fishing.save().caught))
    fish[id] = r.count;
  return { fish, kills: { ...g.combat.kills } };
}

export interface OrdersSave {
  opened: boolean;
  active: ActiveOrder[];
  done: Record<string, number>;
  lastAcceptedWeek: number;
  owed: { id: string; count: number }[];
}

/** What a night did to the orders, for the morning report. */
export interface OrdersNews {
  done: { title: string; gold: number; first: boolean; reward: string }[];
  lapsed: string[];
}

/** Which week of play a day is in, from 0. Weeks start on a Monday (Spring 1). */
export const weekOf = (day: number): number => Math.floor((day - 1) / 7);

/** A small stable hash of a week, so a reload draws the same board. */
function weekRoll(week: number): number {
  let h = Math.imul(week + 1, 0x9e3779b1) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** The order a week posts: seeded from the week, among those fit for its season. */
export function weeklyPick(week: number): OrderDef | undefined {
  const { season } = dateOf(week * 7 + 1);
  const fit = ORDERS.filter((o) => !o.notSeasons.includes(season));
  return fit.length === 0 ? undefined : fit[weekRoll(week) % fit.length];
}

export class Orders {
  /** True once the Fall 2 scene has been shown and the board is up. */
  opened = false;
  active: ActiveOrder[] = [];
  private done: Record<string, number> = {};
  private lastAcceptedWeek = -1;
  /** First rewards waiting to be collected at the board. */
  owed: { id: string; count: number }[] = [];

  timesDone(id: string): number {
    return this.done[id] ?? 0;
  }

  /** Total orders filled, for the Help Wanted achievements once they exist. */
  get totalDone(): number {
    return Object.values(this.done).reduce((n, c) => n + c, 0);
  }

  isActive(id: string): boolean {
    return this.active.some((a) => a.id === id);
  }

  /** True when the Fall 2 scene is due: the day has come and it has not been shown. */
  introDue(day: number): boolean {
    return !this.opened && day >= ORDERS_OPEN_DAY;
  }

  /**
   * The orders posted on a day. One new order is posted each week and a posted
   * one stays until taken or replaced, so this walks back through recent weeks'
   * picks, keeps those still fit, and shows the newest few.
   */
  board(day: number): OrderDef[] {
    if (!this.opened) return [];
    const { season } = dateOf(day);
    const seen: OrderDef[] = [];
    for (let w = weekOf(day); w >= 0 && w > weekOf(day) - POSTED_WEEKS; w--) {
      const o = weeklyPick(w);
      if (!o || seen.includes(o)) continue;
      if (o.notSeasons.includes(season) || this.isActive(o.id)) continue;
      if (!o.repeat && this.timesDone(o.id) > 0) continue;
      seen.push(o);
    }
    return seen.slice(0, BOARD_SIZE);
  }

  /** Take an order (one new order a week, as Stardew). Refused when it is not posted, or one was already taken this week. */
  accept(
    id: string,
    day: number,
    base?: OrderBase,
  ): "ok" | "not posted" | "one a week" {
    if (!this.board(day).some((o) => o.id === id)) return "not posted";
    if (this.lastAcceptedWeek === weekOf(day)) return "one a week";
    const def = orderById(id) as OrderDef;
    this.active.push({
      id,
      accepted: day,
      due: day + def.windowDays,
      progress: {},
      ...(base ? { base: copyBase(base) } : {}),
    });
    this.lastAcceptedWeek = weekOf(day);
    return "ok";
  }

  /** Drop an accepted order. It costs nothing (note 65). */
  cancel(id: string): boolean {
    const i = this.active.findIndex((a) => a.id === id);
    if (i < 0) return false;
    this.active.splice(i, 1);
    return true;
  }

  /** Count shipped goods toward the active orders. `shipDay` is the day they were shipped. */
  credit(lines: readonly BinLine[], shipDay: number): ActiveOrder[] {
    const season = dateOf(shipDay).season;
    const finished: ActiveOrder[] = [];
    for (const a of this.active) {
      const def = orderById(a.id);
      if (!def || shipDay < a.accepted) continue;
      const ask = def.ask;
      if (
        ask.kind === "ship-one-crop" ||
        ask.kind === "ship-quality-vegetables"
      )
        for (const l of lines) {
          const { base, quality } = splitQuality(l.id);
          const crop = cropById(base);
          if (!crop) continue;
          if (ask.kind === "ship-one-crop") {
            if (crop.seasons.includes(season))
              a.progress[base] = (a.progress[base] ?? 0) + l.count;
          } else if (
            crop.produce !== "fruit" &&
            qualityRank(quality) >= qualityRank(ask.quality)
          )
            a.progress.all = (a.progress.all ?? 0) + l.count;
        }
      if (filled(def, a)) finished.push(a);
    }
    return finished;
  }

  /**
   * Count the fish landed and creatures beaten since each order was taken
   * (fishing and slaying orders). Run each night; the totals are read from the
   * logs, so nothing in the scenes has to report a catch. Returns the finished ones.
   */
  creditLogs(g: GameState, day: number): ActiveOrder[] {
    const season = dateOf(day).season;
    const caught = g.fishing.save().caught;
    const finished: ActiveOrder[] = [];
    for (const a of this.active) {
      const def = orderById(a.id);
      if (!def || day < a.accepted) continue;
      const ask = def.ask;
      if (ask.kind === "catch-one-fish" || ask.kind === "catch-water") {
        const by: Record<string, number> = {};
        for (const [id, r] of Object.entries(caught)) {
          const f = fishById(id);
          if (!f) continue;
          if (ask.kind === "catch-one-fish" && !f.seasons.includes(season))
            continue;
          const n = r.count - (a.base?.fish[id] ?? 0);
          const key = ask.kind === "catch-one-fish" ? id : f.water;
          if (n > 0) by[key] = (by[key] ?? 0) + n;
        }
        a.progress.all = Math.max(0, ...Object.values(by));
      } else if (ask.kind === "slay-one") {
        a.progress.all = Math.max(
          0,
          ...Object.entries(g.combat.kills).map(
            ([id, n]) => n - (a.base?.kills[id] ?? 0),
          ),
        );
      } else continue;
      if (filled(def, a)) finished.push(a);
    }
    return finished;
  }

  save(): OrdersSave {
    return {
      opened: this.opened,
      active: this.active.map((a) => ({
        ...a,
        progress: { ...a.progress },
        ...(a.base ? { base: copyBase(a.base) } : {}),
      })),
      done: { ...this.done },
      lastAcceptedWeek: this.lastAcceptedWeek,
      owed: this.owed.map((o) => ({ ...o })),
    };
  }

  load(s: OrdersSave): void {
    this.opened = s.opened;
    this.active = s.active.map((a) => {
      const { base, ...rest } = a;
      const ok =
        base !== undefined &&
        typeof base.fish === "object" &&
        typeof base.kills === "object";
      return {
        ...rest,
        progress: { ...a.progress },
        ...(ok ? { base: copyBase(base) } : {}),
      };
    });
    this.done = { ...s.done };
    this.lastAcceptedWeek = s.lastAcceptedWeek;
    this.owed = s.owed.map((o) => ({ ...o }));
  }

  /** Mark an order done once more. Returns true when it was the first time. */
  markDone(id: string): boolean {
    const first = this.timesDone(id) === 0;
    this.done[id] = this.timesDone(id) + 1;
    return first;
  }
}

const copyBase = (b: OrderBase): OrderBase => ({
  fish: { ...b.fish },
  kills: { ...b.kills },
});

const RANK: Record<Quality, number> = { normal: 0, silver: 1, gold: 2 };
const qualityRank = (q: Quality): number => RANK[q];

/** Progress toward an order's goal as a count, for display. */
export function progressOf(def: OrderDef, a: ActiveOrder): number {
  return def.ask.kind === "ship-one-crop"
    ? Math.max(0, ...Object.values(a.progress))
    : (a.progress.all ?? 0);
}

function filled(def: OrderDef, a: ActiveOrder): boolean {
  return progressOf(def, a) >= def.ask.count;
}

/** Words for what an order asks. */
export function askText(def: OrderDef): string {
  const a = def.ask;
  switch (a.kind) {
    case "ship-one-crop":
      return `Ship ${a.count} of one crop`;
    case "ship-quality-vegetables":
      return `Ship ${a.count} ${a.quality} vegetables`;
    case "catch-one-fish":
      return `Catch ${a.count} of one fish that is in season`;
    case "catch-water":
      return `Catch ${a.count} fish from one kind of water`;
    case "slay-one":
      return `Beat ${a.count} of one cave creature`;
  }
}

/**
 * Overnight: count what the bin paid, pay finished orders (gold at once, a
 * first reward to collect at the board), then let any whose window has run out
 * lapse at no cost. `day` is the new day, so the goods were shipped the day before.
 */
export function endDayOrders(
  g: GameState,
  lines: readonly BinLine[],
  day: number,
): OrdersNews {
  const news: OrdersNews = { done: [], lapsed: [] };
  const o = g.orders;
  if (!o.opened) return news;
  const finished = [...o.credit(lines, day - 1), ...o.creditLogs(g, day - 1)];
  for (const a of finished) {
    const def = orderById(a.id) as OrderDef;
    o.cancel(a.id);
    const first = o.markDone(a.id);
    g.money += def.gold;
    if (first && def.firstReward.item) o.owed.push({ ...def.firstReward.item });
    news.done.push({
      title: def.title,
      gold: def.gold,
      first,
      reward: first ? def.firstReward.text : "",
    });
  }
  for (const a of [...o.active])
    if (day > a.due) {
      o.cancel(a.id);
      news.lapsed.push(orderById(a.id)?.title ?? a.id);
    }
  return news;
}

/** Lines for the morning report. */
export function ordersReportLines(news: OrdersNews): string[] {
  return [
    ...news.done.map(
      (d) =>
        `Order filled: ${d.title}. ${d.gold}g paid.` +
        (d.first ? ` Your reward: ${d.reward}.` : ""),
    ),
    ...news.lapsed.map(
      (t) => `The ${t} order ran out of time. It can be offered again.`,
    ),
  ];
}

/** Hand the owed rewards over, as far as the backpack has room. Returns what moved. */
export function collectOwed(g: GameState): { id: string; count: number }[] {
  const given: { id: string; count: number }[] = [];
  const left: { id: string; count: number }[] = [];
  for (const r of g.orders.owed) {
    if (g.inventory.room(r.id) >= r.count && g.inventory.add(r.id, r.count))
      given.push(r);
    else left.push(r);
  }
  g.orders.owed = left;
  return given;
}

/** The words the board shows when the intro scene opens it. */
export const ORDERS_INTRO = [
  "A new board has gone up in Hearthwell, on the Outpost wall beside the road news. Carriers and buyers passing through pin their bigger jobs to it.",
  "Take one, and its days start counting from the day you take it. Fill it by shipping, and it pays by itself. Let one run out and nothing is lost.",
];
