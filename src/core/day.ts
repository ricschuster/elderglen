import { Clock, DAY_END, DAY_START } from "./clock";
import { ENERGY_FLOOR, Energy } from "./energy";
import { morningEnergy } from "./energyrules";

/**
 * Passing out is a mild, recoverable loss: a share of money, capped, and a
 * half-energy morning (`energyrules.ts`). Numbers match Stardew for now and are tunable.
 */
export const PASS_OUT_MONEY_SHARE = 0.1;
export const PASS_OUT_MONEY_CAP = 1000;

export type DayEnd =
  | { passedOut: false }
  | { passedOut: true; reason: "energy" | "time"; moneyLost: number };

/** One day: the clock and energy together. Money lives elsewhere and is passed in. */
export class Day {
  readonly clock = new Clock();
  readonly energy = new Energy();

  /** Put the player back in a saved day, at the saved time (morning if none). */
  restore(day: number, energy: number, minutes = DAY_START): void {
    this.clock.day = day;
    this.clock.minutes = Math.min(Math.max(minutes, DAY_START), DAY_END);
    this.energy.current = Math.min(
      Math.max(energy, ENERGY_FLOOR),
      this.energy.max,
    );
  }

  /** True once energy is at the floor (-15) or time has run out, so the day must end. */
  get over(): boolean {
    return this.energy.empty || this.clock.minutes >= DAY_END;
  }

  /** Spend energy and time on an action. Returns true if the day is now over. */
  act(energy: number, minutes: number): boolean {
    this.energy.spend(energy);
    this.clock.advance(minutes);
    return this.over;
  }

  /**
   * End the day and start the next. Sleeping early (before the day is over) is free; the morning
   * energy follows `morningEnergy` (late bedtime, exhaustion, a level-up today). Otherwise the
   * player passes out, and loses money unless `safe` (asleep inside the farmhouse).
   * `levelled` is the player's level-up flag, which the caller clears.
   */
  end(money: number, safe = false, levelled = false): DayEnd {
    const passedOut = this.over;
    const reason = this.energy.empty ? "energy" : "time";
    const minutes = this.clock.minutes;
    this.energy.current = morningEnergy({
      max: this.energy.max,
      minutes,
      exhausted: this.energy.wasExhausted,
      levelled,
      atFloor: this.energy.empty,
    });
    this.energy.wasExhausted = false;
    this.clock.nextDay();
    if (!passedOut) return { passedOut: false };
    return {
      passedOut: true,
      reason,
      moneyLost: safe
        ? 0
        : Math.min(
            Math.floor(Math.max(money, 0) * PASS_OUT_MONEY_SHARE),
            PASS_OUT_MONEY_CAP,
          ),
    };
  }
}
