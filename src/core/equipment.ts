import ringData from "../content/rings.json";
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
}

export const RINGS = ringData as RingDef[];

export const RING_SLOTS = 2;

export function ringById(id: string): RingDef | undefined {
  return RINGS.find((r) => r.id === id);
}

export interface EquipmentSave {
  rings: (string | null)[];
}

/** What the player wears. A worn ring leaves the pack, so the bin cannot take it. */
export class Equipment {
  private rings: (string | undefined)[] = [undefined, undefined];

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
    return { rings: this.rings.map((r) => r ?? null) };
  }

  /** Restore from a save, dropping unknown rings. A ring is never duplicated. */
  load(raw: unknown): void {
    this.rings = [undefined, undefined];
    if (typeof raw !== "object" || raw === null) return;
    const list = (raw as Partial<EquipmentSave>).rings;
    if (!Array.isArray(list)) return;
    for (let i = 0; i < RING_SLOTS; i++) {
      const id = list[i];
      if (typeof id === "string" && ringById(id)) this.rings[i] = id;
    }
  }
}
