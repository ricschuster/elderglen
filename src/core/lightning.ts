import type { GameState } from "./save";

/**
 * Lightning rods and battery packs (`docs/design/34_crafting.md` and
 * `07_tuning_numbers.md`, from the saved Weather and Lightning Rod pages with our
 * numbers). On a storm day there is a small chance of a strike every 10 game
 * minutes. A strike lands on a rod with chance `1 - (charged / all)^2`. A hit rod
 * makes one battery pack the next morning and ignores more strikes that day.
 * With no rod, or on a miss, a strike only flashes: the farm is never harmed.
 * Pure rules. Placing a rod on the map is not wired yet.
 */
export const STRIKE_CHANCE = 0.03;
export const STRIKE_MINUTES = 10;
export const LIGHTNING_ROD = "lightning-rod";
export const BATTERY_PACK = "battery-pack";

export interface Rod {
  x: number;
  y: number;
  /** True once struck today: it makes a pack in the morning. */
  hit: boolean;
}

export class Rods {
  private rods: Rod[] = [];

  get count(): number {
    return this.rods.length;
  }

  /** The number struck and waiting for the morning. */
  get charged(): number {
    return this.rods.filter((r) => r.hit).length;
  }

  at(x: number, y: number): Rod | undefined {
    return this.rods.find((r) => r.x === x && r.y === y);
  }

  place(x: number, y: number): boolean {
    if (this.at(x, y)) return false;
    this.rods.push({ x, y, hit: false });
    return true;
  }

  remove(x: number, y: number): boolean {
    const n = this.rods.length;
    this.rods = this.rods.filter((r) => r.x !== x || r.y !== y);
    return this.rods.length < n;
  }

  /**
   * One strike falls. Returns true if a rod caught it. The chance of a catch is
   * `1 - (charged / all)^2`, so a spent rod does not take a second strike.
   */
  strike(random: () => number): boolean {
    const free = this.rods.filter((r) => !r.hit);
    if (free.length === 0) return false;
    const spent = this.rods.length - free.length;
    const chance = 1 - (spent / this.rods.length) ** 2;
    if (random() >= chance) return false;
    free[Math.floor(random() * free.length)]!.hit = true;
    return true;
  }

  /** A new day: every struck rod hands over one pack and resets. Returns the packs. */
  endDay(): number {
    const packs = this.charged;
    for (const r of this.rods) r.hit = false;
    return packs;
  }

  save(): Rod[] {
    return this.rods.map((r) => ({ ...r }));
  }

  load(rods: Rod[] | undefined): void {
    this.rods = (rods ?? []).map((r) => ({
      x: Math.floor(r.x),
      y: Math.floor(r.y),
      hit: r.hit === true,
    }));
  }
}

/**
 * Roll the strikes for a stretch of game minutes on the farm. Only a storm
 * strikes. Returns how many strikes fell and how many a rod caught.
 */
export function rollStrikes(
  g: GameState,
  minutes: number,
  random: () => number,
): { strikes: number; caught: number } {
  let strikes = 0;
  let caught = 0;
  if (g.weather !== "stormy") return { strikes, caught };
  for (let m = STRIKE_MINUTES; m <= minutes; m += STRIKE_MINUTES) {
    if (random() >= STRIKE_CHANCE) continue;
    strikes += 1;
    if (g.rods.strike(random)) caught += 1;
  }
  return { strikes, caught };
}

/** The morning: leave a battery pack in the pack for each struck rod, at most as many as fit. Returns packs given. */
export function collectPacks(g: GameState): number {
  const packs = g.rods.endDay();
  let given = 0;
  for (let i = 0; i < packs; i++) if (g.inventory.add(BATTERY_PACK)) given++;
  return given;
}
