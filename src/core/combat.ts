import weaponData from "../content/weapons.json";
import { BUNDLES } from "./bundles";
import { itemById } from "./items";
import { splitQuality } from "./quality";
import type { Creature } from "./creatures";
import type { Facing, Vec } from "./movement";
import type { GameState } from "./save";
import type { LetterDef } from "./mail";

/**
 * Gentle combat (`docs/design/22_mines.md`, build slice 3, part one): one health
 * bar, weapons of three families, the training dummy, the trainer and the defeat
 * rule. Pure rules, free of Phaser. Every number is a placeholder (note 07).
 */

/** Health at the start, and per combat level (the skill itself waits for part two). */
export const BASE_HEALTH = 100;
export const HEALTH_PER_LEVEL = 5;
/** Seconds of grace after a hit, so a hit never chains (note 22). */
export const GRACE_SECONDS = 1.5;
/** Assist halves damage taken (note 22). */
export const ASSIST_DAMAGE = 0.5;
/** Health restored by food as a share of its energy value (placeholder, note 22 leaves the share open). */
export const HEALTH_PER_ENERGY = 0.5;

export const maxHealth = (combatLevel = 0): number =>
  BASE_HEALTH + HEALTH_PER_LEVEL * combatLevel;

/** The one health bar. Not saved with a clock: grace is a moment of play. */
export class Health {
  current = BASE_HEALTH;
  max = BASE_HEALTH;
  /** Seconds of grace left. */
  grace = 0;

  /**
   * Take a hit. Nothing happens during grace. Assist halves the hit (rounded up,
   * so a hit is never free). Returns the health actually lost.
   */
  hurt(amount: number, assist = false): number {
    if (this.grace > 0 || this.down) return 0;
    const lost = Math.min(
      this.current,
      Math.max(1, Math.ceil(amount * (assist ? ASSIST_DAMAGE : 1))),
    );
    this.current -= lost;
    this.grace = GRACE_SECONDS;
    return lost;
  }

  tick(dt: number): void {
    this.grace = Math.max(0, this.grace - dt);
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
 * flies straight and hits the first creature on its line.
 */
export function swingTargets(
  w: WeaponDef,
  facing: Facing,
  at: Vec,
  creatures: Creature[],
  tileSize = 16,
): Creature[] {
  const f = FACE[facing];
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
  return BUNDLES.some((b) => b.items.some((i) => i.id === base));
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
 * flip, and posts one of them back in the morning mail from the trainer
 * (note 22). Assist loses no items. Money is the day rule's job. Returns what
 * was lost. `due` is the morning the post arrives.
 */
export function loseItems(
  g: GameState,
  random: () => number,
  assist: boolean,
  due: number,
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
  const back = lost[0];
  if (back) g.mail.queue(`lost-${due}`, due, postedBack(due, back));
  return lost;
}

/** The trainer's note with the one stack she found. Placeholder words. */
function postedBack(due: number, back: Lost): LetterDef {
  return {
    id: `lost-${due}`,
    sender: "The trainer",
    title: "Something of yours",
    body: "I found this at the foot of the lift. Rest up, and go gently next time.",
    trigger: { kind: "first-achievement" },
    attachment: { items: [{ id: back.id, count: back.count }] },
  };
}

export interface CombatSave {
  health: number;
  trainerMet: boolean;
  kills: Record<string, number>;
}

/** What the player carries into a fight: health, the trainer's progress and the kill tally. */
export class Combat {
  readonly health = new Health();
  /** True once the trainer has handed a first weapon over. */
  trainerMet = false;
  /** Set when health ran out: the day ends and the defeat rule runs (see `sleep`). */
  defeatPending = false;
  /** Beaten creatures by kind, for the slayer list later (note 22). */
  kills: Record<string, number> = {};
  /** The Assist toggle, synced from the device settings by the scene. Never saved here. */
  assist = false;
  /** The "no creatures" setting, synced from the device settings. Never saved here. */
  noCreatures = false;

  noteKill(kind: string): void {
    this.kills[kind] = (this.kills[kind] ?? 0) + 1;
  }

  save(): CombatSave {
    return {
      health: this.health.current,
      trainerMet: this.trainerMet,
      kills: { ...this.kills },
    };
  }

  load(saved: unknown): void {
    const raw =
      typeof saved === "object" && saved !== null
        ? (saved as Partial<CombatSave>)
        : undefined;
    this.health.max = maxHealth();
    this.health.grace = 0;
    this.health.current =
      typeof raw?.health === "number"
        ? Math.min(Math.max(Math.round(raw.health), 1), this.health.max)
        : this.health.max;
    this.trainerMet = raw?.trainerMet === true;
    this.kills = {};
    for (const [k, v] of Object.entries(raw?.kills ?? {}))
      if (Number.isInteger(v) && v > 0) this.kills[k] = v;
  }
}

/** True where health can be lost, so the bar shows (note 22, decision 17). */
export const healthShown = (
  onCreatureFloor: boolean,
  noCreatures: boolean,
): boolean => onCreatureFloor && !noCreatures;
