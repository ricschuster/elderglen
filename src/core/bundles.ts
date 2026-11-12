import bundleData from "../content/bundles.json";
import roomData from "../content/rooms.json";
import type { Inventory } from "./inventory";
import { categoryOf } from "./artisan";
import { itemById } from "./items";
import { QUALITIES, splitQuality, type Quality } from "./quality";
import type { Wallet } from "./shop";
import type { Wardrobe } from "./hats";

/** One good a bundle takes, how many of it, and the lowest quality allowed. */
export interface BundleItem {
  id: string;
  count: number;
  minQuality: Quality;
  /** For a slot that takes any one of several goods: the words shown for it. */
  name?: string;
  /** Goods (or artisan categories) that fill this slot. The slot's own `id` is then only its key. */
  anyOf?: string[];
}

export interface BundleReward {
  money?: number;
  item?: { id: string; count: number };
  /** A furniture piece. Named in the reward text, not yet placed (no furniture system). */
  furniture?: string;
  /** A choice of hats: the player takes `choose` of `from` (note 63, bundle 24). Taken at the hall with `claimHat`. */
  hats?: { choose: number; from: string[] };
}

export interface BundleDef {
  id: string;
  name: string;
  room: string;
  /** A short line that points the player at the goods, shown in the hall. */
  hint: string;
  items: BundleItem[];
  /** How many of `items` must be filled. All of them when the data omits it. */
  required: number;
  reward: BundleReward;
}

export interface RoomDef {
  id: string;
  name: string;
  /** Bundles finished in the other rooms before this room appears, or "all" of them (the Last Seat). */
  opensAfter: number | "all";
  /** What finishing every bundle here unlocks. Granted by a later system. */
  unlock?: string;
}

/** A bundle as written in `bundles.json`: goods may be bare ids. */
export interface RawBundle {
  id: string;
  name: string;
  room: string;
  hint: string;
  items: (
    | string
    | {
        id: string;
        count?: number;
        minQuality?: Quality;
        name?: string;
        anyOf?: string[];
      }
  )[];
  required?: number;
  reward: BundleReward;
}

/** Fill in the defaults: one of each good, any quality, and all goods needed. */
export function normalizeBundle(raw: RawBundle): BundleDef {
  const items = raw.items.map((i) =>
    typeof i === "string"
      ? { id: i, count: 1, minQuality: "normal" as Quality }
      : {
          id: i.id,
          count: i.count ?? 1,
          minQuality: i.minQuality ?? ("normal" as Quality),
          ...(i.name ? { name: i.name } : {}),
          ...(i.anyOf ? { anyOf: i.anyOf } : {}),
        },
  );
  return { ...raw, items, required: raw.required ?? items.length };
}

export const BUNDLES = (bundleData as RawBundle[]).map(normalizeBundle);
export const ROOMS = roomData as RoomDef[];

/** The room whose completion mends the bridge to ring 2. */
export const LAST_ROOM = "last-seat";

export type RoomStatus = "done" | "ready" | "locked" | "empty";

export type HandIn = "accepted" | "completed" | "rejected";

/**
 * Saved progress: bundle id to how many of each good was handed in. Saves made
 * before counts existed hold a list of goods instead, each one filled.
 */
export type HallProgress = Record<string, string[] | Record<string, number>>;

/**
 * The slot of a bundle a good fills: the good itself, else its artisan
 * category, so "Any jam" takes every jam.
 */
function slotFor(def: BundleDef, base: string): BundleItem | undefined {
  const own = def.items.find((i) => i.id === base);
  if (own) return own;
  const category = categoryOf(base);
  if (category) {
    const byCategory = def.items.find((i) => i.id === category);
    if (byCategory) return byCategory;
  }
  return def.items.find(
    (i) => i.anyOf?.includes(base) || (category && i.anyOf?.includes(category)),
  );
}

const qualityRank = (q: Quality) => QUALITIES.indexOf(q);

/** The village hall: rooms of bundles, handed in one item at a time. */
export class Hall {
  private given = new Map<string, Map<string, number>>();

  constructor(
    readonly bundles: BundleDef[] = BUNDLES,
    progress: HallProgress = {},
    readonly rooms: RoomDef[] = ROOMS,
  ) {
    for (const [id, saved] of Object.entries(progress)) {
      const def = bundles.find((b) => b.id === id);
      const counts = new Map<string, number>();
      if (Array.isArray(saved)) {
        for (const item of saved)
          counts.set(item, def?.items.find((i) => i.id === item)?.count ?? 1);
      } else {
        for (const [item, n] of Object.entries(saved)) counts.set(item, n);
      }
      this.given.set(id, counts);
    }
  }

  /** Goods whose count is filled. */
  handedIn(bundleId: string): string[] {
    const def = this.bundles.find((b) => b.id === bundleId);
    if (!def) return [];
    return def.items
      .filter((i) => this.have(bundleId, i.id) >= i.count)
      .map((i) => i.id);
  }

  /** How many of one good have been handed in to a bundle. */
  have(bundleId: string, itemId: string): number {
    return this.given.get(bundleId)?.get(itemId) ?? 0;
  }

  complete(bundleId: string): boolean {
    const def = this.bundles.find((b) => b.id === bundleId);
    return !!def && this.handedIn(bundleId).length >= def.required;
  }

  get allComplete(): boolean {
    return this.bundles.every((b) => this.complete(b.id));
  }

  /** How many bundles in the other rooms must be done before a room opens. */
  private gateCount(room: RoomDef): number {
    return room.opensAfter === "all"
      ? this.bundles.filter((b) => b.room !== room.id).length
      : room.opensAfter;
  }

  /** Bundles finished, not counting those in one room. */
  finishedOutside(roomId: string): number {
    return this.bundles.filter((b) => b.room !== roomId && this.complete(b.id))
      .length;
  }

  /** The soft gate: a room appears once enough bundles are done elsewhere. */
  roomOpen(roomId: string): boolean {
    const room = this.rooms.find((r) => r.id === roomId);
    return !!room && this.finishedOutside(roomId) >= this.gateCount(room);
  }

  /** True when every bundle in the room is done (and the room has bundles). */
  roomComplete(roomId: string): boolean {
    const inRoom = this.bundles.filter((b) => b.room === roomId);
    return inRoom.length > 0 && inRoom.every((b) => this.complete(b.id));
  }

  /** Rooms with every bundle done, in room order. */
  get completedRooms(): RoomDef[] {
    return this.rooms.filter((r) => this.roomComplete(r.id));
  }

  /** True once the Last Seat is done: the bridge to ring 2 is mended. */
  get bridgeMended(): boolean {
    return this.roomComplete(LAST_ROOM);
  }

  /** The bundles written for one room. */
  bundlesIn(roomId: string): BundleDef[] {
    return this.bundles.filter((b) => b.room === roomId);
  }

  /**
   * How a room stands: `done` (every bundle finished), `empty` (no bundles
   * written yet), `locked` (the soft gate is not met) or `ready` (hand-ins
   * welcome). Empty and locked rooms read as "not ready" in the hall.
   */
  roomStatus(roomId: string): RoomStatus {
    if (this.roomComplete(roomId)) return "done";
    if (this.bundlesIn(roomId).length === 0) return "empty";
    return this.roomOpen(roomId) ? "ready" : "locked";
  }

  /** Bundles still to finish in other rooms before this room opens. */
  gateRemaining(roomId: string): number {
    const room = this.rooms.find((r) => r.id === roomId);
    return room
      ? Math.max(0, this.gateCount(room) - this.finishedOutside(roomId))
      : 0;
  }

  /**
   * Hats still to take from a finished bundle with a hat reward. Nothing is
   * stored: the hats owned from the set are the picks used.
   */
  hatPicksLeft(bundleId: string, wardrobe: Wardrobe): number {
    const hats = this.bundles.find((b) => b.id === bundleId)?.reward.hats;
    if (!hats || !this.complete(bundleId)) return 0;
    const taken = hats.from.filter((h) => wardrobe.has(h)).length;
    return Math.max(0, hats.choose - taken);
  }

  /** Take one hat of a finished bundle's set. False if it is not on offer, is owned, or no picks are left. */
  claimHat(bundleId: string, hatId: string, wardrobe: Wardrobe): boolean {
    const hats = this.bundles.find((b) => b.id === bundleId)?.reward.hats;
    if (!hats || !hats.from.includes(hatId)) return false;
    if (this.hatPicksLeft(bundleId, wardrobe) < 1) return false;
    return wardrobe.add(hatId);
  }

  /** Bundles in rooms that have appeared. */
  get openBundles(): BundleDef[] {
    return this.bundles.filter((b) => this.roomOpen(b.room));
  }

  /**
   * Hand one item in. Rejected for any reason `problem` gives. Finishing a
   * bundle gives its reward.
   */
  handIn(
    inv: Inventory,
    wallet: Wallet,
    bundleId: string,
    stackId: string,
    /** Told the gold a finished bundle pays, so the caller can count it as earnings (SC-54). */
    onGold?: (gold: number) => void,
  ): HandIn {
    if (this.problem(inv, bundleId, stackId)) return "rejected";
    const def = this.bundles.find((b) => b.id === bundleId)!;
    const itemId = slotFor(def, splitQuality(stackId).base)!.id;
    if (!inv.remove(stackId)) return "rejected";
    const counts = this.given.get(bundleId) ?? new Map<string, number>();
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    this.given.set(bundleId, counts);
    if (!this.complete(bundleId)) return "accepted";
    const gold = def.reward.money ?? 0;
    wallet.money += gold;
    if (gold > 0) onGold?.(gold);
    const prize = def.reward.item;
    if (prize) inv.add(prize.id, prize.count);
    return "completed";
  }

  /**
   * Why `handIn` would refuse this item, in words for the player, or
   * undefined if it would take it.
   */
  problem(
    inv: Inventory,
    bundleId: string,
    stackId: string,
  ): string | undefined {
    const { base, quality } = splitQuality(stackId);
    const def = this.bundles.find((b) => b.id === bundleId);
    if (!def) return "There is no such bundle.";
    if (!this.roomOpen(def.room)) return "That room is not open yet.";
    if (this.complete(bundleId)) return "That bundle is already done.";
    const item = slotFor(def, base);
    if (!item) return "This bundle does not take that.";
    if (this.have(bundleId, item.id) >= item.count) return "Already handed in.";
    if (qualityRank(quality) < qualityRank(item.minQuality))
      return `This needs ${item.minQuality} quality or better.`;
    if (inv.count(stackId) < 1) return "You do not have one.";
    return undefined;
  }

  save(): HallProgress {
    return Object.fromEntries(
      [...this.given].map(([id, counts]) => [id, Object.fromEntries(counts)]),
    );
  }
}

/** A bundle's reward in words, such as "500g" or "15 Parsnip seeds". */
export function rewardText(def: BundleDef): string {
  const parts: string[] = [];
  if (def.reward.money) parts.push(`${def.reward.money}g`);
  const prize = def.reward.item;
  if (prize)
    parts.push(`${prize.count} ${itemById(prize.id)?.name ?? prize.id}`);
  if (def.reward.furniture) parts.push(def.reward.furniture);
  if (def.reward.hats)
    parts.push(
      `${def.reward.hats.choose} hats of your choice from ${def.reward.hats.from.length}`,
    );
  return parts.join(" and ") || "nothing";
}
