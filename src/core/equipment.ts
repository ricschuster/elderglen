import bootData from "../content/boots.json";
import ringData from "../content/rings.json";
import { resistChance } from "./effects";
import type { Inventory } from "./inventory";

/**
 * Equipment (`docs/design/37_equipment.md`): two ring slots. The first build
 * carries the light and magnet rings, the two that need no combat stats. Boots,
 * Defense, Immunity and the combat rings come later in the same note.
 * Content lives in `src/content/rings.json`.
 */
export interface RingDef {
  id: string;
  name: string;
  /** Light radius in tiles, added across worn rings (stacks, as Stardew). */
  light: number;
  /** Extra pickup radius in tiles, added across worn rings (stacks). */
  magnet: number;
  /** Health taken off every hit, added across worn rings and the boots. */
  defense?: number;
  /** Immunity points, added across worn rings and the boots (note 94). */
  immunity?: number;
  /** Blocks the slimed effect outright (note 37). */
  slimeProof?: boolean;
  /** Bad effects that land last half as long (note 37, the Sturdy ring). */
  halfEffects?: boolean;
  /** Sold at the trainer's counter (note 94). `minFloor` is the deepest mine floor reached that unlocks it. */
  shop?: { price: number; minFloor?: number };
  /** The slayer goal whose completion hands this ring over (note 22). */
  slayer?: string;
  /** What the trainer charges to hand a lost slayer reward over again (placeholder, note 07). */
  rebuy?: number;
}

export const RINGS = ringData as RingDef[];

/**
 * Boots give Defense and Immunity (note 37). Stat pairs are Stardew's, names and
 * prices are ours and placeholders. The smith sells them (`buyBoots`).
 */
export interface BootsDef {
  id: string;
  name: string;
  /** Health taken off every hit, to a floor of 1 (placeholder rule, note 37 leaves it open). */
  defense: number;
  /** Immunity points: each resists 9.1 percent of bad effects (note 94). */
  immunity: number;
  /** Smith price in coin (placeholder). */
  price: number;
}

export const BOOTS = bootData as BootsDef[];

/** A custom-tailored pair's id joins the look pair and the stats pair with this (note 96). */
export const TAILORED_SEP = "@";

/** The look pair and stats pair of a custom-tailored pair, undefined for any other id. */
export function tailoredParts(id: string): [string, string] | undefined {
  const parts = id.split(TAILORED_SEP);
  if (parts.length !== 2) return undefined;
  const [look, stats] = parts as [string, string];
  if (look === stats) return undefined;
  if (!BOOTS.some((b) => b.id === look) || !BOOTS.some((b) => b.id === stats))
    return undefined;
  return [look, stats];
}

/**
 * Boots by id. A custom-tailored pair (note 96) is made, not listed: it keeps the look
 * and price of its look pair, takes the stats of its stats pair and is named
 * "Custom-tailored [look name]".
 */
export function bootsById(id: string): BootsDef | undefined {
  const base = BOOTS.find((b) => b.id === id);
  if (base) return base;
  const parts = tailoredParts(id);
  if (!parts) return undefined;
  const look = BOOTS.find((b) => b.id === parts[0])!;
  const stats = BOOTS.find((b) => b.id === parts[1])!;
  return {
    id,
    name: `Custom-tailored ${look.name.toLowerCase()}`,
    defense: stats.defense,
    immunity: stats.immunity,
    price: look.price,
  };
}

export const RING_SLOTS = 2;

/** A combined ring's id joins its two base ring ids with this (note 95). */
export const COMBO_SEP = "+";

/** The id of the ring made from two different base rings, order-free. */
export function comboId(a: string, b: string): string {
  return [a, b].sort().join(COMBO_SEP);
}

/** The two base ring ids of a combined ring, undefined for any other id. */
export function comboParts(id: string): [string, string] | undefined {
  const parts = id.split(COMBO_SEP);
  if (parts.length !== 2) return undefined;
  const [a, b] = parts as [string, string];
  if (a === b || a > b) return undefined;
  if (!RINGS.some((r) => r.id === a) || !RINGS.some((r) => r.id === b))
    return undefined;
  return [a, b];
}

/**
 * A ring by id. A combined ring (note 95) is built from its two parts and
 * stacks both effects as if worn together.
 */
export function ringById(id: string): RingDef | undefined {
  const base = RINGS.find((r) => r.id === id);
  if (base) return base;
  const parts = comboParts(id);
  if (!parts) return undefined;
  const a = RINGS.find((r) => r.id === parts[0])!;
  const b = RINGS.find((r) => r.id === parts[1])!;
  const def: RingDef = {
    id,
    name: `${a.name} and ${b.name.toLowerCase()}`,
    light: a.light + b.light,
    magnet: a.magnet + b.magnet,
  };
  const defense = (a.defense ?? 0) + (b.defense ?? 0);
  const immunity = (a.immunity ?? 0) + (b.immunity ?? 0);
  if (defense) def.defense = defense;
  if (immunity) def.immunity = immunity;
  if (a.slimeProof || b.slimeProof) def.slimeProof = true;
  if (a.halfEffects || b.halfEffects) def.halfEffects = true;
  return def;
}

/** A ring that is itself a combination (it cannot be combined again). */
export function isCombo(id: string): boolean {
  return comboParts(id) !== undefined;
}

export interface EquipmentSave {
  rings: (string | null)[];
  boots?: string | null;
}

/** What the player wears. A worn ring leaves the pack, so the bin cannot take it. */
export class Equipment {
  private rings: (string | undefined)[] = [undefined, undefined];

  private boots: string | undefined;

  /** The ring in each slot, undefined when empty. */
  worn(): (string | undefined)[] {
    return [...this.rings];
  }

  /**
   * Put a ring from the pack into a slot. A ring already there goes back to the
   * pack first. False for an unknown ring, a bad slot, none in the pack, or no
   * room to hand the old ring back.
   */
  wear(inv: Inventory, slot: number, id: string): boolean {
    if (!ringById(id) || slot < 0 || slot >= RING_SLOTS) return false;
    if (inv.count(id) < 1) return false;
    const old = this.rings[slot];
    if (old !== undefined) {
      // Swap in place: the new ring takes the pack space the old one needs.
      inv.remove(id, 1);
      if (!inv.add(old, 1)) {
        inv.add(id, 1);
        return false;
      }
    } else inv.remove(id, 1);
    this.rings[slot] = id;
    return true;
  }

  /** Take a ring off into the pack. False if the slot is empty or the pack is full. */
  remove(inv: Inventory, slot: number): boolean {
    const id = this.rings[slot];
    if (id === undefined) return false;
    if (!inv.add(id, 1)) return false;
    this.rings[slot] = undefined;
    return true;
  }

  /** The boots worn, undefined when none. */
  wornBoots(): string | undefined {
    return this.boots;
  }

  /** Put boots from the pack on. Boots already worn go back to the pack. */
  wearBoots(inv: Inventory, id: string): boolean {
    if (!bootsById(id) || inv.count(id) < 1) return false;
    const old = this.boots;
    inv.remove(id, 1);
    if (old !== undefined && !inv.add(old, 1)) {
      inv.add(id, 1);
      return false;
    }
    this.boots = id;
    return true;
  }

  /** Take the boots off into the pack. False if none or the pack is full. */
  removeBoots(inv: Inventory): boolean {
    if (this.boots === undefined || !inv.add(this.boots, 1)) return false;
    this.boots = undefined;
    return true;
  }

  /** Health taken off each hit, from the boots and the rings. */
  defense(): number {
    return (
      ((this.boots && bootsById(this.boots)?.defense) || 0) +
      this.sum((r) => r.defense ?? 0)
    );
  }

  /** Immunity points, from the boots and the rings. */
  immunity(): number {
    return (
      ((this.boots && bootsById(this.boots)?.immunity) || 0) +
      this.sum((r) => r.immunity ?? 0)
    );
  }

  /** True with a slime proof ring on. */
  slimeProof(): boolean {
    return this.rings.some(
      (id) => id !== undefined && ringById(id)?.slimeProof,
    );
  }

  /** True with a ring on that halves bad effects. */
  halvesEffects(): boolean {
    return this.rings.some(
      (id) => id !== undefined && ringById(id)?.halfEffects,
    );
  }

  /** Immunity as a percent chance to resist, rounded, for the equipment screen. */
  resistPercent(): number {
    return Math.round(resistChance(this.immunity()) * 100);
  }

  /** Light radius from rings, in tiles. Zero with none worn. */
  lightRadius(): number {
    return this.sum((r) => r.light);
  }

  /** Extra pickup radius from rings, in tiles. */
  magnetBonus(): number {
    return this.sum((r) => r.magnet);
  }

  private sum(pick: (r: RingDef) => number): number {
    let total = 0;
    for (const id of this.rings) {
      const def = id === undefined ? undefined : ringById(id);
      if (def) total += pick(def);
    }
    return total;
  }

  save(): EquipmentSave {
    return {
      rings: this.rings.map((r) => r ?? null),
      boots: this.boots ?? null,
    };
  }

  /** Restore from a save, dropping unknown rings. A ring is never duplicated. */
  load(raw: unknown): void {
    this.rings = [undefined, undefined];
    this.boots = undefined;
    if (typeof raw !== "object" || raw === null) return;
    const boots = (raw as Partial<EquipmentSave>).boots;
    if (typeof boots === "string" && bootsById(boots)) this.boots = boots;
    const list = (raw as Partial<EquipmentSave>).rings;
    if (!Array.isArray(list)) return;
    for (let i = 0; i < RING_SLOTS; i++) {
      const id = list[i];
      if (typeof id === "string" && ringById(id)) this.rings[i] = id;
    }
  }
}
