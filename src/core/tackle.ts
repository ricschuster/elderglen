import tackleData from "../content/tackle.json";
import type { Inventory } from "./inventory";
import type { RodDef } from "./fishing";
import type { GameState } from "./save";

/**
 * Bait and lures on a rod (note 21, slice 3). Bait is spent per cast and
 * shortens the wait. A lure lasts 20 casts and shifts the odds, the wait, the
 * bar, treasure or what the player sees. Each rod keeps its own rig. Content is
 * `src/content/tackle.json`. Numbers are placeholders. Pure rules, no Phaser.
 */
export interface BaitDef {
  id: string;
  name: string;
  price: number;
  /** Multiplier on the wait for a bite. */
  wait: number;
  /** Works on the sea only: it does nothing until the sea can be fished. */
  sea?: boolean;
}

export interface LureDef {
  id: string;
  name: string;
  price: number;
  text: string;
  /** Odds multipliers among the fish the conditions already allow. */
  rare?: number;
  night?: number;
  rain?: number;
  /** Multiplier on the wait, on top of bait. */
  wait?: number;
  /** Extra bar width, as a share of the rod's own (adds to assist). */
  bar?: number;
  treasure?: boolean;
  sounding?: boolean;
}

export interface TrinketDef {
  id: string;
  name: string;
  sellPrice: number;
}

export const BAITS = tackleData.baits as BaitDef[];
export const LURES = tackleData.lures as LureDef[];
export const TRINKETS = tackleData.trinkets as TrinketDef[];

export const baitById = (id: string | undefined) =>
  BAITS.find((b) => b.id === id);
export const lureById = (id: string | undefined) =>
  LURES.find((l) => l.id === id);

/** Casts a lure lasts. */
export const LURE_CASTS = 20;
/** Chance a Magpie Hook fight shows a treasure chest in the bar, and the share of treasures that are purses. */
export const TREASURE_CHANCE = 0.2;
export const PURSE_SHARE = 0.6;

export interface Rig {
  bait?: { id: string; count: number };
  lures: { id: string; left: number }[];
}

export interface TackleSave {
  rigs: Record<string, Rig>;
}

/** What a rig does to one cast. */
export interface Effects {
  /** Multiplier on the wait for a bite. */
  wait: number;
  /** Extra bar width share, added to the assist share. */
  bar: number;
  rare: number;
  night: number;
  rain: number;
  treasure: boolean;
  sounding: boolean;
}

const NONE: Effects = {
  wait: 1,
  bar: 0,
  rare: 1,
  night: 1,
  rain: 1,
  treasure: false,
  sounding: false,
};

/** The rigs of every rod. Saved with the game. */
export class Tackle {
  private rigs = new Map<string, Rig>();

  rig(rodId: string): Rig {
    let r = this.rigs.get(rodId);
    if (!r) {
      r = { lures: [] };
      this.rigs.set(rodId, r);
    }
    return r;
  }

  /** The effects of a rod's rig on a cast, at the sea or at fresh water. */
  effects(rodId: string, sea = false): Effects {
    const rig = this.rigs.get(rodId);
    if (!rig) return { ...NONE };
    const e = { ...NONE };
    const bait = baitById(rig.bait?.id);
    if (bait && (!bait.sea || sea)) e.wait *= bait.wait;
    for (const slot of rig.lures) {
      const l = lureById(slot.id);
      if (!l) continue;
      e.wait *= l.wait ?? 1;
      e.bar += l.bar ?? 0;
      e.rare *= l.rare ?? 1;
      e.night *= l.night ?? 1;
      e.rain *= l.rain ?? 1;
      e.treasure ||= l.treasure === true;
      e.sounding ||= l.sounding === true;
    }
    return e;
  }

  /**
   * Spend one cast: a bait and a cast of each lure. Returns the names of
   * anything used up, for the message.
   */
  spend(rodId: string): string[] {
    const rig = this.rigs.get(rodId);
    if (!rig) return [];
    const gone: string[] = [];
    if (rig.bait) {
      rig.bait.count -= 1;
      if (rig.bait.count <= 0) {
        gone.push(baitById(rig.bait.id)?.name ?? rig.bait.id);
        rig.bait = undefined;
      }
    }
    for (const slot of rig.lures) slot.left -= 1;
    for (const slot of rig.lures.filter((s) => s.left <= 0))
      gone.push(lureById(slot.id)?.name ?? slot.id);
    rig.lures = rig.lures.filter((s) => s.left > 0);
    return gone;
  }

  save(): TackleSave {
    return {
      rigs: Object.fromEntries(
        [...this.rigs].map(([id, r]) => [
          id,
          {
            ...(r.bait ? { bait: { ...r.bait } } : {}),
            lures: r.lures.map((l) => ({ ...l })),
          },
        ]),
      ),
    };
  }

  load(raw: unknown): void {
    this.rigs = new Map();
    if (typeof raw !== "object" || raw === null) return;
    const rigs = (raw as Partial<TackleSave>).rigs;
    if (typeof rigs !== "object" || rigs === null) return;
    const ok = (n: unknown): n is number =>
      typeof n === "number" && Number.isFinite(n) && n > 0;
    for (const [id, r] of Object.entries(rigs)) {
      if (typeof r !== "object" || r === null) continue;
      const rig: Rig = { lures: [] };
      const bait = (r as Partial<Rig>).bait;
      if (bait && baitById(bait.id) && ok(bait.count))
        rig.bait = { id: bait.id, count: Math.floor(bait.count) };
      const lures = (r as Partial<Rig>).lures;
      if (Array.isArray(lures))
        for (const l of lures)
          if (
            l &&
            lureById(l.id) &&
            ok(l.left) &&
            !rig.lures.some((x) => x.id === l.id)
          )
            rig.lures.push({ id: l.id, left: Math.min(l.left, LURE_CASTS) });
      this.rigs.set(id, rig);
    }
  }
}

/**
 * Put bait on a rod: the whole stack of that bait in the backpack goes on the
 * line, and a different bait already on it comes back to the backpack. Returns
 * why not, or undefined.
 */
export function equipBait(
  t: Tackle,
  inv: Inventory,
  rod: RodDef,
  baitId: string,
): string | undefined {
  if (!rod.bait) return "This rod has no bait slot.";
  if (!baitById(baitId)) return "That is not bait.";
  const have = inv.count(baitId);
  if (have <= 0) return "You have none of that bait.";
  const rig = t.rig(rod.id);
  if (rig.bait && rig.bait.id !== baitId) {
    if (!inv.add(rig.bait.id, rig.bait.count))
      return "No room in the backpack for the bait on the line.";
    rig.bait = undefined;
  }
  inv.remove(baitId, have);
  rig.bait = { id: baitId, count: (rig.bait?.count ?? 0) + have };
  return undefined;
}

/** Take the bait off a rod and back into the backpack. */
export function removeBait(
  t: Tackle,
  inv: Inventory,
  rod: RodDef,
): string | undefined {
  const rig = t.rig(rod.id);
  if (!rig.bait) return undefined;
  if (!inv.add(rig.bait.id, rig.bait.count))
    return "No room in the backpack for the bait.";
  rig.bait = undefined;
  return undefined;
}

/** Fit a lure from the backpack into a free lure slot. Returns why not, or undefined. */
export function equipLure(
  t: Tackle,
  inv: Inventory,
  rod: RodDef,
  lureId: string,
): string | undefined {
  if (!lureById(lureId)) return "That is not a lure.";
  if (rod.lures === 0) return "This rod has no lure slot.";
  if (inv.count(lureId) <= 0) return "You have none of that lure.";
  const rig = t.rig(rod.id);
  if (rig.lures.some((l) => l.id === lureId)) return "That lure is on already.";
  if (rig.lures.length >= rod.lures) return "The lure slots are full.";
  inv.remove(lureId, 1);
  rig.lures.push({ id: lureId, left: LURE_CASTS });
  return undefined;
}

/** Take a lure off. An unused one returns to the backpack; a worn one is thrown away. */
export function removeLure(
  t: Tackle,
  inv: Inventory,
  rod: RodDef,
  index: number,
): string | undefined {
  const rig = t.rig(rod.id);
  const slot = rig.lures[index];
  if (!slot) return undefined;
  if (slot.left === LURE_CASTS && !inv.add(slot.id, 1))
    return "No room in the backpack for the lure.";
  rig.lures.splice(index, 1);
  return undefined;
}

export type Treasure =
  { kind: "purse"; gold: number } | { kind: "trinket"; item: TrinketDef };

/** The gold in a coin purse: `40 + 15 * fishingLevel`. */
export const purseGold = (level: number) => 40 + 15 * level;

/**
 * Pick what a Magpie Hook chest holds. Whether a chest appears in the bar is a
 * separate one in five (`TREASURE_CHANCE`, rolled by the scene per fight).
 */
export function pickTreasure(
  level: number,
  random: () => number,
): Treasure | undefined {
  if (random() < PURSE_SHARE) return { kind: "purse", gold: purseGold(level) };
  const item = TRINKETS[Math.floor(random() * TRINKETS.length)];
  return item ? { kind: "trinket", item } : undefined;
}

/** Hand over a treasure: gold into the wallet, a trinket into the backpack or at the player's feet. */
export function giveTreasure(
  g: GameState,
  t: Treasure,
  at: { x: number; y: number },
): void {
  if (t.kind === "purse") g.money += t.gold;
  else if (!g.inventory.add(t.item.id)) g.ground.drop(at.x, at.y, t.item.id, 1);
}

/** Words for a treasure. */
export function treasureText(t: Treasure): string {
  return t.kind === "purse"
    ? `The hook also brought up a coin purse with ${t.gold}g.`
    : `The hook also brought up a ${t.item.name}.`;
}
