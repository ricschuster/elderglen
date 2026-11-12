/** Player energy. Can be fractional (tool upgrades and skills trim swings). Constants match Stardew for now. */
export const MAX_ENERGY = 270;

export class Energy {
  current = MAX_ENERGY;
  /** The ceiling: 270 plus the elderfruit eaten (`elderfruit.ts`, note 39). */
  max = MAX_ENERGY;

  /** Spend n points, stopping at zero. Returns true if energy is now empty. */
  spend(n: number): boolean {
    this.current = Math.max(this.current - n, 0);
    return this.current === 0;
  }

  /** Restore n points, stopping at the maximum. */
  restore(n: number): void {
    this.current = Math.min(this.current + n, this.max);
  }

  get empty(): boolean {
    return this.current === 0;
  }
}
