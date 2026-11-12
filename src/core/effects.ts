/**
 * The three bad effects of the mines and Immunity (`docs/design/94_defense_immunity_bad_effects.md`).
 * Slimed, chilled and burned, one per mine band. Immunity is a chance to resist
 * the effect a hit would inflict: 9.1 percent a point, added up, no cap (Stardew,
 * SC-159). Effects live in memory only: they clear on leaving the floor, on sleep
 * and on defeat. Pure rules, free of Phaser. Every number is a placeholder.
 */

export type EffectId = "slimed" | "chilled" | "burned";

export interface EffectDef {
  id: EffectId;
  name: string;
  /** Seconds the effect lasts. */
  seconds: number;
}

export const EFFECTS: EffectDef[] = [
  { id: "slimed", name: "Slimed", seconds: 8 },
  { id: "chilled", name: "Chilled", seconds: 8 },
  { id: "burned", name: "Burned", seconds: 4 },
];

export const effectById = (id: string): EffectDef | undefined =>
  EFFECTS.find((e) => e.id === id);

/** An optional `inflicts` field on a creature row: the effect and the chance a landed hit carries it. */
export interface Inflicts {
  effect: EffectId;
  chance: number;
}

/** Share of a bad effect each point of Immunity resists (Stardew, SC-159). */
export const RESIST_PER_POINT = 0.091;
/** Walk speed while slimed: down by a third. */
export const SLIMED_SPEED = 2 / 3;
/** Swing cooldown multiplier while chilled: the attack swing is 25 percent slower. */
export const CHILLED_SWING = 1 / 0.75;
/** Health a burn takes each second. */
export const BURN_PER_SECOND = 1;
/** Share of an effect's length left by the Sturdy ring. */
export const STURDY_LENGTH = 0.5;

/** Chance Immunity resists an effect, 0 to 1. No cap on the points, so eleven make a player immune. */
export const resistChance = (immunity: number): number =>
  Math.min(1, Math.max(0, immunity) * RESIST_PER_POINT);

export type InflictResult = "afflicted" | "resisted" | "proof";

export interface InflictOptions {
  /** Total Immunity from boots and rings. */
  immunity: number;
  /** A slime proof ring blocks slimed outright. */
  slimeProof?: boolean;
  /** The Sturdy ring halves the length of an effect that lands. */
  halfLength?: boolean;
}

/** What afflicts the player now: seconds left by effect. */
export class Effects {
  private left = new Map<EffectId, number>();

  /**
   * A hit carries an effect. One roll against Immunity. A landed effect starts, or
   * refreshes the timer of one already running (no stacking, note 94).
   */
  inflict(
    id: EffectId,
    random: () => number,
    opts: InflictOptions,
  ): InflictResult {
    if (id === "slimed" && opts.slimeProof) return "proof";
    if (random() < resistChance(opts.immunity)) return "resisted";
    const def = effectById(id)!;
    this.left.set(id, def.seconds * (opts.halfLength ? STURDY_LENGTH : 1));
    return "afflicted";
  }

  has(id: EffectId): boolean {
    return (this.left.get(id) ?? 0) > 0;
  }

  /** Seconds left of an effect, 0 when none. */
  remaining(id: EffectId): number {
    return this.left.get(id) ?? 0;
  }

  get any(): boolean {
    return this.left.size > 0;
  }

  /** Count timers down. Returns the health a burn took over this step. */
  tick(dt: number): number {
    const burn = this.has("burned")
      ? Math.min(dt, this.remaining("burned")) * BURN_PER_SECOND
      : 0;
    for (const [id, t] of this.left) {
      if (t - dt <= 0) this.left.delete(id);
      else this.left.set(id, t - dt);
    }
    return burn;
  }

  /** Cleared on leaving the floor, on sleep, on defeat and by a Life Elixir. */
  clear(): void {
    this.left.clear();
  }

  /** Multiplier on walk speed. */
  speedFactor(): number {
    return this.has("slimed") ? SLIMED_SPEED : 1;
  }

  /** Multiplier on the seconds between weapon swings. */
  swingFactor(): number {
    return this.has("chilled") ? CHILLED_SWING : 1;
  }

  /** A short line for the bar: "Slimed 5s". */
  describe(): string {
    return EFFECTS.filter((e) => this.has(e.id))
      .map((e) => `${e.name} ${Math.ceil(this.remaining(e.id))}s`)
      .join(" ");
  }
}
