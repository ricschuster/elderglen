import weaponData from "../content/weapons.json";
import { BUNDLES } from "./bundles";
import { Effects } from "./effects";
import { bootsById } from "./equipment";
import { itemById } from "./items";
import { splitQuality } from "./quality";
import type { Creature } from "./creatures";
import type { Skills } from "./skills";
import type { Facing, Vec } from "./movement";
import type { GameState } from "./save";

/**
 * Gentle combat (`docs/design/22_mines.md`, build slice 3, part one): one health
 * bar, weapons of three families, the training dummy, the trainer and the defeat
 * rule. Pure rules, free of Phaser. Every number is a placeholder (note 07).
 */

/** Health at the start, and per combat level. */
export const BASE_HEALTH = 100;
export const HEALTH_PER_LEVEL = 5;
/** Seconds of grace after a hit, so a hit never chains (note 22). */
export const GRACE_SECONDS = 1.5;
/** Assist halves damage taken (note 22). */
export const ASSIST_DAMAGE = 0.5;
/** Health restored by food as a share of its energy value (placeholder, note 22 leaves the share open). */
export const HEALTH_PER_ENERGY = 0.5;

/** Extra health the Steady profession gives, and the grace Nimble gives (note 22). */
export const STEADY_HEALTH = 25;
export const NIMBLE_GRACE = 2.5;

export const maxHealth = (combatLevel = 0): number =>
  BASE_HEALTH + HEALTH_PER_LEVEL * combatLevel;

/** The most health the player can have: the combat level and the Steady profession. */
export const healthFor = (skills: Skills): number =>
  maxHealth(skills.level("combat")) +
  (skills.has("steady") ? STEADY_HEALTH : 0);

/** Seconds of grace after a hit: longer with the Nimble profession. */
export const graceFor = (skills: Skills): number =>
  skills.has("nimble") ? NIMBLE_GRACE : GRACE_SECONDS;

/** The one health bar. Not saved with a clock: grace is a moment of play. */
export class Health {
  current = BASE_HEALTH;
  max = BASE_HEALTH;
  /** Seconds of grace left. */
  grace = 0;
  /** Seconds of grace a hit gives. */
  graceLength = GRACE_SECONDS;

  /**
   * Take a hit. Nothing happens during grace. Assist halves the hit (rounded up,
   * so a hit is never free). Defense from boots comes off first, to a floor of
   * 1 (placeholder rule, note 37). Returns the health actually lost.
   */
  hurt(amount: number, assist = false, defense = 0): number {
    amount = Math.max(1, amount - defense);
    if (this.grace > 0 || this.down) return 0;
    const lost = Math.min(
      this.current,
      Math.max(1, Math.ceil(amount * (assist ? ASSIST_DAMAGE : 1))),
    );
    this.current -= lost;
    this.grace = this.graceLength;
    return lost;
  }

  tick(dt: number): void {
    this.grace = Math.max(0, this.grace - dt);
  }

  /**
   * Health a bad effect takes, ignoring grace, Defense and Assist. Never knocks
   * the player out (placeholder, note 94 leaves it open). Returns what was lost.
   */
  drain(amount: number): number {
    const lost = Math.max(0, Math.min(amount, this.current - 1));
    this.current -= lost;
    return lost;
  }

  heal(n: number): void {
    this.current = Math.min(this.current + n, this.max);
  }

  fill(): void {
    this.current = this.max;
    this.grace = 0;
  }

  get down(): boolean {
    return this.current <= 0;
  }

  get full(): boolean {
    return this.current >= this.max;
  }
}

export type WeaponFamily = "blade" | "club" | "sling";

export interface WeaponDef {
  id: string;
  name: string;
  /** A short label for the toolbar slot. */
  short: string;
  family: WeaponFamily;
  /** 0 is a starter, 1 copper. */
  tier: number;
  damage: number;
  /** Seconds between swings. */
  cooldown: number;
  /** Tiles. A sling shot flies this far. */
  reach: number;
  /** Degrees of the swing in front of the player. 0 for the sling's straight shot. */
  arc: number;
  /** Most creatures one swing can hit. */
  targets: number;
  /** What the smith dwarf asks to forge it. Starters are not forged. */
  forge?: { bar: string; bars: number; gold: number };
  /** What the smith dwarf sells it for in coin (placeholder, note 07). Forged tiers only. */
  price?: number;
}

export const WEAPONS = weaponData as WeaponDef[];
export const weaponById = (id: string): WeaponDef | undefined =>
  WEAPONS.find((w) => w.id === id);
export const isWeapon = (id: string): boolean => weaponById(id) !== undefined;
export const STARTERS = WEAPONS.filter((w) => w.tier === 0);
export const FORGED = WEAPONS.filter((w) => w.forge);

const FACE: Record<Facing, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Half the body of a creature in pixels, so a swing that grazes its edge lands. */
const BODY = 6;
/** How far either side of a sling shot's line still hits, in pixels. */
const SHOT_WIDTH = 6;

/**
 * The creatures one swing reaches, nearest first and no more than the weapon's
 * limit. A blade and a club hit the arc in front of the player. A sling shot
 * flies straight and hits the first creature on its line, along `aim` (a
 * direction from the player, any length) when given, else the faced way.
 */
export function swingTargets(
  w: WeaponDef,
  facing: Facing,
  at: Vec,
  creatures: Creature[],
  tileSize = 16,
  aim?: Vec,
): Creature[] {
  const len = aim ? Math.hypot(aim.x, aim.y) : 0;
  const f =
    w.family === "sling" && aim && len > 0
      ? { x: aim.x / len, y: aim.y / len }
      : FACE[facing];
  // The swing is centred on the body, a little above the feet.
  const from = { x: at.x, y: at.y - 6 };
  const hits: { c: Creature; d: number }[] = [];
  for (const c of creatures) {
    const dx = c.x - from.x;
    const dy = c.y - 6 - from.y;
    const along = dx * f.x + dy * f.y;
    const across = Math.abs(dx * f.y - dy * f.x);
    if (w.family === "sling") {
      if (along > 0 && along <= w.reach * tileSize && across <= SHOT_WIDTH)
        hits.push({ c, d: along });
      continue;
    }
    const d = Math.hypot(dx, dy);
    if (d > w.reach * tileSize + BODY) continue;
    const half = ((w.arc / 2) * Math.PI) / 180;
    const angle = d === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, along / d)));
    // Close in, the angle is less exact: a creature at the feet is hit.
    if (d > BODY && angle > half) continue;
    hits.push({ c, d });
  }
  hits.sort((a, b) => a.d - b.d);
  return hits.slice(0, w.targets).map((h) => h.c);
}

/** Health the player's weapon takes off the training dummy: its damage, for the numbers on screen. */
export const dummyHit = (w: WeaponDef): number => w.damage;

/** Smith forging: bars and gold, no wait (note 22). Returns an error line, or undefined when it worked. */
export function forgeWeapon(g: GameState, id: string): string | undefined {
  const w = weaponById(id);
  if (!w?.forge) return "She cannot forge that.";
  const { bar, bars, gold } = w.forge;
  if (g.inventory.count(bar) < bars)
    return `You need ${bars} ${itemById(bar)?.name.toLowerCase()}s.`;
  if (g.money < gold) return "Not enough money.";
  if (g.inventory.count(id) > 0) return "You already carry one.";
  g.inventory.remove(bar, bars);
  if (!g.inventory.add(id)) {
    g.inventory.add(bar, bars);
    return "Your backpack is full.";
  }
  g.money -= gold;
  return undefined;
}

/** The coin price of a forged weapon at the dwarf's shop, 0 when she does not sell it. */
export const weaponPrice = (w: WeaponDef): number => w.price ?? 0;

/**
 * The dwarf sells a forged tier for coin (owner, 2026-11-09). Returns an error
 * line, or undefined when it was bought.
 */
export function buyWeapon(g: GameState, id: string): string | undefined {
  const w = weaponById(id);
  if (!w?.price) return "She does not sell that.";
  if (g.inventory.count(id) > 0) return "You already carry one.";
  if (g.money < w.price) return "Not enough money.";
  if (!g.inventory.add(id)) return "Your backpack is full.";
  g.money -= w.price;
  return undefined;
}

/** The dwarf sells boots for coin (placeholder source, note 37). Returns an error line, or undefined when bought. */
export function buyBoots(g: GameState, id: string): string | undefined {
  const b = bootsById(id);
  if (!b) return "She does not sell that.";
  if (g.inventory.count(id) > 0 || g.equipment.wornBoots() === id)
    return "You already have a pair.";
  if (g.money < b.price) return "Not enough money.";
  if (!g.inventory.add(id)) return "Your backpack is full.";
  g.money -= b.price;
  return undefined;
}

/**
 * The trainer hands over a starter weapon free, any time the player carries none
 * of it. Returns an error line, or undefined when it was given.
 */
export function takeStarter(g: GameState, id: string): string | undefined {
  const w = weaponById(id);
  if (!w || w.tier !== 0) return "She has no such thing.";
  if (g.inventory.count(id) > 0) return "You already carry one.";
  if (!g.inventory.add(id)) return "Your backpack is full.";
  g.combat.trainerMet = true;
  return undefined;
}

/** Items a defeat never takes: tools, weapons, seeds, bundle goods and anything kept (rods, bait, furniture, chests). Note 22, decision 16. */
export function isSafeFromDefeat(id: string): boolean {
  const { base } = splitQuality(id);
  if (isWeapon(base)) return true;
  if (itemById(id)?.keep) return true;
  if (/(^|-)(seed|sapling)$/.test(base)) return true;
  return BUNDLES.some((b) =>
    b.items.some((i) => i.id === base || i.anyOf?.includes(base)),
  );
}

/** Chance each eligible stack is taken, and the most stacks taken (placeholders, note 22). */
export const LOSS_CHANCE = 1 / 3;
export const LOSS_MAX_STACKS = 3;

export interface Lost {
  id: string;
  count: number;
}

/**
 * Defeat takes up to three stacks from the pack, whole or halved by a coin
 * flip, and leaves them at the trainer's counter to buy back (note 22). Only
 * the latest defeat is kept there. Assist loses no items. Money is the day
 * rule's job. Returns what was lost.
 */
export function loseItems(
  g: GameState,
  random: () => number,
  assist: boolean,
): Lost[] {
  if (assist) return [];
  const stacks: Lost[] = [];
  for (let i = 0; i < g.inventory.size; i++) {
    const s = g.inventory.slot(i);
    if (s && !isSafeFromDefeat(s.id)) stacks.push(s);
  }
  const lost: Lost[] = [];
  for (const s of stacks) {
    if (lost.length >= LOSS_MAX_STACKS) break;
    if (random() >= LOSS_CHANCE) continue;
    const half = random() < 0.5 && s.count > 1;
    const count = half ? Math.floor(s.count / 2) : s.count;
    if (g.inventory.remove(s.id, count)) lost.push({ id: s.id, count });
  }
  g.combat.counter = lost.map((l) => ({ ...l }));
  return lost;
}

/** The fee to buy a lost stack back: its sell value, no profession bonus (note 22). */
export function recoveryFee(l: Lost): number {
  return (itemById(l.id)?.sellPrice ?? 0) * l.count;
}

/**
 * Buy one stack back from the trainer's counter. The other stacks from that
 * defeat are then gone for good (Stardew's guild sells back one). Returns an
 * error line, or undefined when it worked.
 */
export function buyBack(g: GameState, index: number): string | undefined {
  const l = g.combat.counter[index];
  if (!l) return "She has nothing like that.";
  const fee = recoveryFee(l);
  if (g.money < fee) return "Not enough money.";
  if (!g.inventory.add(l.id, l.count)) return "Your backpack is full.";
  g.money -= fee;
  g.combat.counter = [];
  return undefined;
}

export interface CombatSave {
  health: number;
  trainerMet: boolean;
  kills: Record<string, number>;
  counter: Lost[];
  /** The day Oil of Garlic was taken, so it lasts until the next morning (note 89). */
  oilDay?: number;
}

/** What the player carries into a fight: health, the trainer's progress and the kill tally. */
export class Combat {
  readonly health = new Health();
  /** The bad effects on the player: in memory only, cleared by sleep, defeat and leaving a floor (note 94). */
  readonly effects = new Effects();
  /** True once the trainer has handed a first weapon over. */
  trainerMet = false;
  /** Set when health ran out: the day ends and the defeat rule runs (see `sleep`). */
  defeatPending = false;
  /** The stacks the latest defeat took, for sale back at the trainer's counter (note 22). */
  counter: Lost[] = [];
  /** The day Oil of Garlic was taken, or 0 when none is working (note 89). */
  oilDay = 0;
  /** Beaten creatures by kind, for the slayer list later (note 22). */
  kills: Record<string, number> = {};
  /** The Assist toggle, synced from the device settings by the scene. Never saved here. */
  assist = false;
  /** The "no creatures" setting, synced from the device settings. Never saved here. */
  noCreatures = false;

  /** Take the health ceiling and grace from the skills. Never heals. */
  sync(skills: Skills): void {
    this.health.max = healthFor(skills);
    this.health.current = Math.min(this.health.current, this.health.max);
    this.health.graceLength = graceFor(skills);
  }

  noteKill(kind: string): void {
    this.kills[kind] = (this.kills[kind] ?? 0) + 1;
  }

  save(): CombatSave {
    return {
      health: this.health.current,
      trainerMet: this.trainerMet,
      kills: { ...this.kills },
      counter: this.counter.map((l) => ({ ...l })),
      ...(this.oilDay > 0 ? { oilDay: this.oilDay } : {}),
    };
  }

  load(saved: unknown, skills?: Skills): void {
    const raw =
      typeof saved === "object" && saved !== null
        ? (saved as Partial<CombatSave>)
        : undefined;
    this.health.max = skills ? healthFor(skills) : maxHealth();
    this.health.graceLength = skills ? graceFor(skills) : GRACE_SECONDS;
    this.health.grace = 0;
    this.health.current =
      typeof raw?.health === "number"
        ? Math.min(Math.max(Math.round(raw.health), 1), this.health.max)
        : this.health.max;
    this.trainerMet = raw?.trainerMet === true;
    this.oilDay =
      Number.isInteger(raw?.oilDay) && (raw?.oilDay ?? 0) > 0
        ? (raw!.oilDay as number)
        : 0;
    this.kills = {};
    for (const [k, v] of Object.entries(raw?.kills ?? {}))
      if (Number.isInteger(v) && v > 0) this.kills[k] = v;
    this.counter = [];
    for (const l of Array.isArray(raw?.counter) ? raw.counter : [])
      if (
        l &&
        typeof l.id === "string" &&
        itemById(l.id) &&
        Number.isInteger(l.count) &&
        l.count > 0
      )
        this.counter.push({ id: l.id, count: l.count });
  }
}

/** True where health can be lost, so the bar shows (note 22, decision 17). */
export const healthShown = (
  onCreatureFloor: boolean,
  noCreatures: boolean,
): boolean => onCreatureFloor && !noCreatures;
