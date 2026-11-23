/** Player energy. Can be fractional (tool upgrades and skills trim swings). Constants match Stardew for now. */
export const MAX_ENERGY = 270;

/** Energy at which the player is exhausted: slow, but tools still work (`energyrules.ts`). */
export const EXHAUSTED_AT = 0;
/** The lowest energy can go: reaching it ends the day with a pass-out (note 07, 2026-10-31). */
export const ENERGY_FLOOR = -15;

export class Energy {
  current = MAX_ENERGY;
  /** The ceiling: 270 plus the elderfruit eaten (`elderfruit.ts`, note 39). */
  max = MAX_ENERGY;
  /** True once energy hit 0 today. Eating does not clear it: the morning after is half energy. */
  wasExhausted = false;

  /** Spend n points, stopping at the floor. Returns true if the player is now exhausted. */
  spend(n: number): boolean {
    this.current = Math.max(this.current - n, ENERGY_FLOOR);
    if (this.current <= EXHAUSTED_AT) this.wasExhausted = true;
    return this.exhausted;
  }

  /** Restore n points, stopping at the maximum. */
  restore(n: number): void {
    this.current = Math.min(this.current + n, this.max);
  }

  /** At 0 or below: slowed, still able to work. */
  get exhausted(): boolean {
    return this.current <= EXHAUSTED_AT;
  }

  /** At the floor: the day is over. */
  get empty(): boolean {
    return this.current <= ENERGY_FLOOR;
  }
}
