import data from "../content/friendship.json";
import geodeData from "../content/geodes.json";
import creatureGoods from "../content/creature-goods.json";
import fishData from "../content/fish.json";
import { artisanById, produceOf } from "./artisan";
import { dateOf } from "./calendar";
import { cropById } from "./crops";
import { dishById } from "./dishes";
import { forageById } from "./forage";
import { fruitTreeById } from "./fruittrees";
import { JUNK } from "./pots";
import { splitQuality, type Quality } from "./quality";
import { BAITS } from "./tackle";
import { VILLAGERS, villagerById } from "./villagers";

/**
 * Friendship, talking and gifts (note 61, #599 slice 2). Pure rules: points per
 * villager, hearts and caps, the daily talk, gifts by taste with the birthday
 * bonus and the weekly rule. There is no decay: neglect never costs points.
 * Numbers and personal lists are data in `src/content/friendship.json`.
 * Spouse halving, heart events and dialogue are later slices.
 */

export type Taste = "love" | "like" | "neutral" | "dislike" | "hate";

export const POINTS = data.points;
export const HEART = POINTS.heart;
export const TALK_POINTS = POINTS.talk;
export const TASTE_POINTS: Readonly<Record<Taste, number>> = POINTS.taste;

/** The week index of a game day. Day 1 is a Monday, so a week runs Monday to Sunday. */
export const weekOf = (day: number): number => Math.floor((day - 1) / 7);

export const isBirthday = (id: string, day: number): boolean => {
  const b = villagerById(id)?.birthday;
  if (!b) return false;
  const d = dateOf(day);
  return d.season === b.season && d.dayOfSeason === b.day;
};

// ---- Taste ----------------------------------------------------------------

const ALCOHOL = new Set(["wine", "mead", "beer"]);
const FLOWERS = new Set<string>(data.tags.flower);
const FOUND = new Set<string>(data.tags.found);
const EGGS = new Set<string>(data.tags.egg);
const MILK = new Set<string>(data.tags.milk);
const SHELLS = new Set<string>(data.tags.shell);
const FISH = new Set(fishData.map((f) => f.id));
const GEMS = new Set(geodeData.pools.flatMap((p) => p.minerals));
const MINERALS = new Set([
  ...geodeData.pools.map((p) => p.foraged.item),
  ...data.tags.mineralExtra,
]);
const BAIT_IDS = new Set(BAITS.map((b) => b.id));
const DROPS = new Set(creatureGoods.map((g) => g.id));
const TRASH = new Set(JUNK.map((j) => j.id));

/**
 * The tags an item carries, most specific first: its artisan kind (`jam`), then
 * its category (`artisan`, `dish`, `flower`, `mineral`, `fruit`, `gem`,
 * `vegetable`, `bait`, `monster-drop`, `trash`, `found`), plus `forage`,
 * `alcohol`, `egg`, `milk`, `shell` and `fish`. Quality is ignored.
 */
export function tagsOf(itemId: string): string[] {
  const id = splitQuality(itemId).base;
  const tags: string[] = [];
  const art = artisanById(id);
  if (art) {
    tags.push(art.category);
    if (ALCOHOL.has(art.category)) tags.push("alcohol");
    tags.push("artisan");
  }
  if (dishById(id)) tags.push("dish");
  if (cropById(id) || fruitTreeById(id)) {
    const p = produceOf(id);
    if (p) tags.push(p);
  }
  if (FLOWERS.has(id)) tags.push("flower");
  if (GEMS.has(id)) tags.push("gem");
  if (MINERALS.has(id)) tags.push("mineral");
  if (forageById(id)) tags.push("forage");
  if (EGGS.has(id)) tags.push("egg");
  if (MILK.has(id)) tags.push("milk");
  if (SHELLS.has(id)) tags.push("shell");
  if (FISH.has(id)) tags.push("fish");
  if (BAIT_IDS.has(id)) tags.push("bait");
  if (DROPS.has(id)) tags.push("monster-drop");
  if (TRASH.has(id)) tags.push("trash");
  if (FOUND.has(id)) tags.push("found");
  return tags;
}

export interface TasteList {
  loves: string[];
  likes: string[];
  neutral?: string[];
  dislikes: string[];
  hates: string[];
}

const PEOPLE = data.people as Record<string, TasteList>;
const DEFAULT_LIST = data.defaultList as TasteList;
const UNIVERSAL_TAGS = data.universal.tagTaste as Record<string, Taste>;

/** The personal list of a person, or the marked placeholder (universal tastes only). */
export const tasteListOf = (villagerId: string): TasteList =>
  PEOPLE[villagerId] ?? DEFAULT_LIST;

/** True when the person has a written (draft) list rather than the placeholder. */
export const hasOwnList = (villagerId: string): boolean =>
  PEOPLE[villagerId] !== undefined;

/** Every id and tag a personal list names, for validation. */
export const listedEntries = (): string[] =>
  Object.values(PEOPLE).flatMap((l) => [
    ...l.loves,
    ...l.likes,
    ...(l.neutral ?? []),
    ...l.dislikes,
    ...l.hates,
  ]);

const TIERS: [Taste, (l: TasteList) => string[]][] = [
  ["love", (l) => l.loves],
  ["like", (l) => l.likes],
  ["neutral", (l) => l.neutral ?? []],
  ["dislike", (l) => l.dislikes],
  ["hate", (l) => l.hates],
];

/**
 * How a person feels about an item. Order: their own item entry, the universal
 * named items, their own tag entry (most specific tag first), the universal tag
 * taste, then neutral. So a personal "dislikes all wine" never beats the
 * universal love of truffle oil, and a personal item entry beats everything.
 */
export function tasteOf(villagerId: string, itemId: string): Taste {
  const id = splitQuality(itemId).base;
  const list = tasteListOf(villagerId);
  for (const [taste, pick] of TIERS) if (pick(list).includes(id)) return taste;
  const u = data.universal;
  if (u.loves.includes(id)) return "love";
  if (u.hates.includes(id)) return "hate";
  if (u.dislikes.includes(id)) return "dislike";
  const tags = tagsOf(id);
  for (const tag of tags)
    for (const [taste, pick] of TIERS)
      if (pick(list).includes(`#${tag}`)) return taste;
  for (const tag of tags) {
    const t = UNIVERSAL_TAGS[tag];
    if (t) return t;
  }
  return "neutral";
}

/** Gift points for a taste and quality on an ordinary day (note 61). Quality lifts love and like only. */
export function giftPoints(taste: Taste, quality: Quality = "normal"): number {
  const base = TASTE_POINTS[taste];
  if (taste !== "love" && taste !== "like") return base;
  const mult = quality === "normal" ? 1 : POINTS.quality[quality];
  return Math.floor(base * mult);
}

// ---- State ----------------------------------------------------------------

export interface FriendshipRow {
  points: number;
  /** Absent until the first talk (note 61: not met until then). */
  met: boolean;
  /** Day of the last talk, 0 for never. */
  talkDay: number;
  /** Day of the last gift, 0 for never. */
  giftDay: number;
  /** The week the gift count belongs to. */
  week: number;
  /** Counted gifts given in `week` (birthday gifts do not count). */
  weekGifts: number;
  bouquet: boolean;
  /** Reaction to each gift item given, first reaction kept per item (the gift log). */
  log: Record<string, Taste>;
}

export type TalkResult =
  { ok: true; points: number } | { ok: false; reason: "already" };

export type GiftResult =
  | {
      ok: true;
      taste: Taste;
      points: number;
      birthday: boolean;
    }
  | { ok: false; reason: "unknown" | "unmet" | "today" | "week" };

const newRow = (): FriendshipRow => ({
  points: 0,
  met: false,
  talkDay: 0,
  giftDay: 0,
  week: 0,
  weekGifts: 0,
  bouquet: false,
  log: {},
});

const isCandidate = (id: string): boolean => data.candidates.includes(id);

/** The heart cap in hearts for a person (note 61). */
export function heartCap(id: string, bouquet: boolean): number {
  if (!isCandidate(id)) return data.caps.friend;
  return bouquet
    ? data.caps.candidateAfterBouquet
    : data.caps.candidateBeforeBouquet;
}

export class Friendship {
  private rows = new Map<string, FriendshipRow>();

  private row(id: string): FriendshipRow | undefined {
    if (!villagerById(id)) return undefined;
    let r = this.rows.get(id);
    if (!r) {
      r = newRow();
      this.rows.set(id, r);
    }
    return r;
  }

  private add(r: FriendshipRow, id: string, n: number): number {
    const before = r.points;
    const max = heartCap(id, r.bouquet) * HEART;
    r.points = Math.max(0, Math.min(max, r.points + n));
    return r.points - before;
  }

  /** Roll a row into the week of `day`: two gifts last week earn the weekly bonus. */
  private sync(r: FriendshipRow, id: string, day: number): void {
    const w = weekOf(day);
    if (w <= r.week) return;
    if (r.weekGifts >= POINTS.weeklyGifts) this.add(r, id, POINTS.weeklyBonus);
    r.week = w;
    r.weekGifts = 0;
  }

  /** Call each morning: pays the weekly bonus on the first day of a new week. */
  startDay(day: number): void {
    for (const [id, r] of this.rows) this.sync(r, id, day);
  }

  points(id: string): number {
    return this.rows.get(id)?.points ?? 0;
  }

  /** Whole hearts. */
  hearts(id: string): number {
    return Math.floor(this.points(id) / HEART);
  }

  met(id: string): boolean {
    return this.rows.get(id)?.met ?? false;
  }

  hasBouquet(id: string): boolean {
    return this.rows.get(id)?.bouquet ?? false;
  }

  /** The gift log for a person: each item given and the reaction. */
  giftLog(id: string): Readonly<Record<string, Taste>> {
    return this.rows.get(id)?.log ?? {};
  }

  /** Mark someone met without talking (a cutscene or the hall). */
  meet(id: string): void {
    const r = this.row(id);
    if (r) r.met = true;
  }

  /** Talk: +20 once a day per person. The first talk meets them. */
  talk(id: string, day: number): TalkResult | { ok: false; reason: "unknown" } {
    const r = this.row(id);
    if (!r) return { ok: false, reason: "unknown" };
    if (r.talkDay === day) return { ok: false, reason: "already" };
    r.met = true;
    r.talkDay = day;
    return { ok: true, points: this.add(r, id, TALK_POINTS) };
  }

  /** Whether a gift is allowed today: one a day, two counted a week, none on a birthday cap. */
  canGift(id: string, day: number): boolean {
    return this.giftBlock(id, day) === undefined;
  }

  private giftBlock(
    id: string,
    day: number,
  ): "unknown" | "unmet" | "today" | "week" | undefined {
    const r = this.row(id);
    if (!r) return "unknown";
    if (!r.met) return "unmet";
    if (r.giftDay === day) return "today";
    this.sync(r, id, day);
    if (!isBirthday(id, day) && r.weekGifts >= POINTS.weeklyGifts)
      return "week";
    return undefined;
  }

  /**
   * Give a gift. Only people already met take one. Points follow the taste and
   * quality; on the person's birthday they are x8, always allowed and not
   * counted against the week. Returns the points actually changed.
   */
  gift(id: string, itemId: string, day: number): GiftResult {
    const block = this.giftBlock(id, day);
    if (block) return { ok: false, reason: block };
    const r = this.row(id)!;
    const { base, quality } = splitQuality(itemId);
    const taste = tasteOf(id, base);
    const birthday = isBirthday(id, day);
    const raw =
      giftPoints(taste, quality) * (birthday ? POINTS.birthdayMultiplier : 1);
    const points = this.add(r, id, raw);
    r.giftDay = day;
    if (!birthday) r.weekGifts += 1;
    if (!(base in r.log)) r.log[base] = taste;
    return { ok: true, taste, points, birthday };
  }

  /** The bouquet lifts a candidate's cap from 8 to 10 hearts. Needs 8 hearts. */
  giveBouquet(id: string): boolean {
    const r = this.row(id);
    if (!r || !isCandidate(id) || r.bouquet) return false;
    if (r.points < data.caps.candidateBeforeBouquet * HEART) return false;
    r.bouquet = true;
    return true;
  }

  /** A request delivered to the poster: +150, not a gift (note 61). */
  requestDone(id: string): number {
    const r = this.row(id);
    return r ? this.add(r, id, POINTS.request) : 0;
  }

  /**
   * The Guests' Board bonus: everyone met who is not a candidate gains +500
   * (note 61, proposed). Returns the ids that gained.
   */
  bundleBonus(): string[] {
    const gained: string[] = [];
    for (const [id, r] of this.rows)
      if (r.met && !isCandidate(id) && this.add(r, id, POINTS.bundleBonus) > 0)
        gained.push(id);
    return gained;
  }

  save(): Record<string, FriendshipRow> {
    const out: Record<string, FriendshipRow> = {};
    for (const [id, r] of this.rows) out[id] = { ...r, log: { ...r.log } };
    return out;
  }

  /** Load from a save. Missing or malformed data loads as no friendship; bad rows are skipped. */
  load(raw: unknown): void {
    this.rows.clear();
    if (typeof raw !== "object" || raw === null) return;
    const count = (n: unknown): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= 0;
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!villagerById(id) || typeof v !== "object" || v === null) continue;
      const o = v as Record<string, unknown>;
      const r = newRow();
      const bouquet = o.bouquet === true && isCandidate(id);
      const max = heartCap(id, bouquet) * HEART;
      r.bouquet = bouquet;
      r.points = count(o.points) ? Math.min(o.points, max) : 0;
      r.met = o.met === true;
      r.talkDay = count(o.talkDay) ? o.talkDay : 0;
      r.giftDay = count(o.giftDay) ? o.giftDay : 0;
      r.week = count(o.week) ? o.week : 0;
      r.weekGifts = count(o.weekGifts) ? o.weekGifts : 0;
      if (typeof o.log === "object" && o.log !== null)
        for (const [item, t] of Object.entries(o.log))
          if (TIERS.some(([name]) => name === t)) r.log[item] = t as Taste;
      this.rows.set(id, r);
    }
  }
}

/** Everyone in the roster, for the Social tab. */
export const FRIEND_IDS: readonly string[] = VILLAGERS.map((v) => v.id);
