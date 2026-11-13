import { Clock, DAY_END, DAY_START } from "./clock";
import { Energy } from "./energy";

/**
 * Passing out is a mild, recoverable loss: a share of money, capped, and a
 * reduced morning. Numbers match Stardew for now and are tunable.
 */
export const PASS_OUT_MONEY_SHARE = 0.1;
export const PASS_OUT_MONEY_CAP = 1000;
export const PASS_OUT_WAKE_ENERGY = { energy: 0.5, time: 0.75 };

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
    this.energy.current = Math.min(Math.max(energy, 0), this.energy.max);
  }

  /** True once energy or time has run out, so the day must end. */
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
   * End the day and start the next. Sleeping early (before the day is over)
   * is free and gives a full morning. Otherwise the player passes out.
   */
  end(money: number): DayEnd {
    const passedOut = this.over;
    const reason = this.energy.empty ? "energy" : "time";
    this.clock.nextDay();
    if (!passedOut) {
      this.energy.restore(this.energy.max);
      return { passedOut: false };
    }
    this.energy.current = Math.round(
      this.energy.max * PASS_OUT_WAKE_ENERGY[reason],
    );
    return {
      passedOut: true,
      reason,
      moneyLost: Math.min(
        Math.floor(Math.max(money, 0) * PASS_OUT_MONEY_SHARE),
        PASS_OUT_MONEY_CAP,
      ),
    };
  }
}
