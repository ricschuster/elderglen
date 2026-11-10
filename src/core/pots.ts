import potData from "../content/pots.json";
import type { Outcome } from "./actions";
import { isAreaMap } from "./areas";
import { isFarmMap } from "./farmtypes";
import { catchQuality, potKindOf, sizeRoll, type PotKind } from "./fishing";
import type { FarmMap } from "./map";
import { withQuality } from "./quality";
import type { GameState } from "./save";
import { harvestXp } from "./skills";
import { baitById } from "./tackle";

/**
 * Shellfish pots (`docs/design/21_fishing.md`, "Shellfish pots"). A pot sits on
 * a fishable water tile. Given one bait a day it holds one catch each morning:
 * junk 38 times in 100 (30 with Fine Bait), else a shellfish of its water. Never
 * fish. The catch takes the fishing quality roll (no cast distance, no perfect
 * catch) and fishing XP, junk included. Content is `src/content/pots.json`.
 * Numbers are placeholders. Pure rules, no Phaser.
 */
export interface ShellfishDef {
  id: string;
  name: string;
  water: PotKind;
  /** Odds in 100 on a shellfish day. */
  odds: number;
  sellPrice: number;
}

export interface JunkDef {
  id: string;
  name: string;
  sellPrice: number;
}

export const POT_ITEM = potData.pot.id;
export const POT_NAME = potData.pot.name;
export const POT_PRICE = potData.pot.price;
export const SHELLFISH = potData.catches as ShellfishDef[];
export const JUNK = potData.junk as JunkDef[];
export const JUNK_CHANCE = potData.junkChance;
export const FINE_BAIT_JUNK_CHANCE = potData.fineBaitJunkChance;
/** Fishing XP for a pot harvest of junk: junk sells for almost nothing, but still counts (note 21). */
export const JUNK_XP = potData.junkXp;
export const FINE_BAIT = "fine-bait";

export const shellfishById = (id: string | undefined) =>
  SHELLFISH.find((s) => s.id === id);
export const junkById = (id: string | undefined) =>
  JUNK.find((j) => j.id === id);

/** One pot: its bait for tonight, and what it holds for the morning. */
export interface PlacedPot {
  map: string;
  x: number;
  y: number;
  kind: PotKind;
  /** A bait id, used up overnight. */
  bait?: string;
  /** What it holds: a shellfish or junk id. */
  catch?: string;
}

/** Every farm map shares one key, since the farm is one place whichever map shows it. */
const place = (map: string) => (isFarmMap(map) ? "farm" : map);
const key = (map: string, x: number, y: number) => `${place(map)}:${x},${y}`;

/** The pots standing on the water. */
export class Pots {
  private placed = new Map<string, PlacedPot>();
  /** Shellfish landed so far, by id. The completion tracker counts these. */
  private caught = new Map<string, number>();

  get(map: string, x: number, y: number): PlacedPot | undefined {
    return this.placed.get(key(map, x, y));
  }

  *each(map: string): Generator<PlacedPot> {
    for (const p of this.placed.values())
      if (place(p.map) === place(map)) yield p;
  }

  get count(): number {
    return this.placed.size;
  }

  add(map: string, x: number, y: number, kind: PotKind): PlacedPot | undefined {
    if (this.placed.has(key(map, x, y))) return undefined;
    const pot: PlacedPot = { map, x, y, kind };
    this.placed.set(key(map, x, y), pot);
    return pot;
  }

  remove(map: string, x: number, y: number): PlacedPot | undefined {
    const p = this.get(map, x, y);
    this.placed.delete(key(map, x, y));
    return p;
  }

  /** Note a shellfish landed. */
  note(id: string): void {
    this.caught.set(id, (this.caught.get(id) ?? 0) + 1);
  }

  has(id: string): boolean {
    return this.caught.has(id);
  }

  countOf(id: string): number {
    return this.caught.get(id) ?? 0;
  }

  /** The morning: every baited pot with room gives one catch and spends its bait. */
  endDay(random: () => number): void {
    for (const p of this.placed.values()) {
      if (!p.bait || p.catch) continue;
      p.catch = rollCatch(p.kind, p.bait, random);
      p.bait = undefined;
    }
  }

  save(): PotsSave {
    return {
      pots: [...this.placed.values()].map((p) => ({ ...p })),
      caught: Object.fromEntries(this.caught),
    };
  }

  load(raw: unknown): void {
    this.placed.clear();
    this.caught.clear();
    if (typeof raw !== "object" || raw === null) return;
    const { pots, caught } = raw as Partial<PotsSave>;
    if (Array.isArray(pots))
      for (const p of pots) {
        if (
          !p ||
          typeof p.map !== "string" ||
          !Number.isInteger(p.x) ||
          !Number.isInteger(p.y) ||
          (p.kind !== "fresh" && p.kind !== "salt")
        )
          continue;
        const pot = this.add(p.map, p.x, p.y, p.kind);
        if (!pot) continue;
        if (baitById(p.bait)) pot.bait = p.bait;
        if (shellfishById(p.catch) || junkById(p.catch)) pot.catch = p.catch;
      }
    if (typeof caught === "object" && caught !== null)
      for (const [id, n] of Object.entries(caught))
        if (shellfishById(id) && typeof n === "number" && n > 0)
          this.caught.set(id, Math.floor(n));
  }
}

export interface PotsSave {
  pots: PlacedPot[];
  caught: Record<string, number>;
}

/** The junk chance a pot has with this bait. */
export function junkChance(bait: string): number {
  return bait === FINE_BAIT ? FINE_BAIT_JUNK_CHANCE : JUNK_CHANCE;
}

/** One morning's catch for a baited pot: junk, or a shellfish by its odds. */
export function rollCatch(
  kind: PotKind,
  bait: string,
  random: () => number,
): string {
  if (random() < junkChance(bait))
    return JUNK[Math.min(Math.floor(random() * JUNK.length), JUNK.length - 1)]!
      .id;
  const pool = SHELLFISH.filter((s) => s.water === kind);
  const total = pool.reduce((n, s) => n + s.odds, 0);
  let pick = random() * total;
  for (const s of pool) {
    pick -= s.odds;
    if (pick < 0) return s.id;
  }
  return pool[pool.length - 1]!.id;
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** Pots stand on fishable water: the farm and the area maps. */
export function potMap(mapId: string): boolean {
  return isFarmMap(mapId) || isAreaMap(mapId);
}

/** Stand a pot from the backpack on the faced water tile. Free. */
export function placePot(
  g: GameState,
  map: FarmMap,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  if (g.inventory.count(POT_ITEM) < 1) return fail("no pot");
  const kind = map.waterKindAt(x, y);
  if (!potMap(mapId) || kind === undefined) return fail("pot needs water");
  if (g.pots.get(mapId, x, y)) return fail("a pot is in the way");
  g.inventory.remove(POT_ITEM);
  g.pots.add(mapId, x, y, potKindOf(kind));
  return { ok: true };
}

/** Put one bait from the backpack in a pot. Any bait does. */
export function baitPot(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  baitId: string,
): Outcome {
  const pot = g.pots.get(mapId, x, y);
  if (!pot) return fail("no pot here");
  if (!baitById(baitId)) return fail("not bait");
  if (g.inventory.count(baitId) < 1) return fail("no bait");
  if (pot.catch) return fail("pot full");
  if (pot.bait) return fail("pot baited");
  g.inventory.remove(baitId);
  pot.bait = baitId;
  return { ok: true };
}

/**
 * Take the morning's catch from a pot. A shellfish takes the fishing quality
 * roll (no distance, never perfect) and every catch gives fishing XP, junk too.
 * A full backpack leaves the pot as it is.
 */
export function collectPot(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  random: () => number,
): Outcome {
  const pot = g.pots.get(mapId, x, y);
  if (!pot) return fail("no pot here");
  if (!pot.catch) return fail(pot.bait ? "pot waiting" : "pot empty");
  const shell = shellfishById(pot.catch);
  const level = g.skills.level("fishing");
  const item = shell
    ? withQuality(shell.id, catchQuality(sizeRoll(level, 0, random), false))
    : pot.catch;
  if (!g.inventory.add(item)) return fail("backpack full");
  if (shell) g.pots.note(shell.id);
  pot.catch = undefined;
  const levelUp = g.skills.gain(
    "fishing",
    shell ? harvestXp(shell.sellPrice) : JUNK_XP,
  );
  return {
    ok: true,
    item,
    levelUp: levelUp ? { skill: "fishing", level: levelUp } : undefined,
  };
}

/** Take a pot up into the backpack. It must hold no catch, so nothing is lost. Its bait comes back. */
export function pickUpPot(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): Outcome {
  const pot = g.pots.get(mapId, x, y);
  if (!pot) return fail("no pot here");
  if (pot.catch) return fail("pot full");
  if (g.inventory.room(POT_ITEM) < 1) return fail("backpack full");
  if (pot.bait && g.inventory.room(pot.bait) < 1) return fail("backpack full");
  g.pots.remove(mapId, x, y);
  g.inventory.add(POT_ITEM);
  if (pot.bait) g.inventory.add(pot.bait);
  return { ok: true, item: POT_ITEM };
}
