// Energy rules decided with the owner on 2026-10-31 (note 07, "Energy rules"). Pure, free of Phaser
// and the DOM. Placeholder numbers except where the note says Stardew's.
import { DAY_END } from "./clock";

/** Minutes since midnight of the last bedtime that costs nothing (12:10 am, as Stardew). */
export const LATE_FREE_UNTIL = 24 * 60 + 10;

/**
 * Percent of maximum energy lost by going to bed late, one entry per 10 minutes after midnight:
 * 12:00 and 12:10 nothing, small steps to 12:50, a bigger drop at 1:00, then to half at 2:00.
 * Placeholders in the Stardew shape.
 */
export const LATE_SLEEP_LOSS = [
  0, 0, 2, 4, 6, 8, 20, 25, 30, 35, 40, 45, 50,
] as const;

/** Share of maximum energy the morning gives after exhaustion or a pass-out at 2 am. */
export const HALF_MORNING = 0.5;

/** Energy at which the "getting tired" warnings show, once each as it falls past them. */
export const TIRED_WARNINGS = [20, 15] as const;

/** Speed multiplier while exhausted (placeholder). */
export const EXHAUSTED_SPEED = 0.6;

/** Percent of energy lost by going to bed at `minutes` since midnight (0 to 50). */
export function lateSleepLoss(minutes: number): number {
  if (minutes <= LATE_FREE_UNTIL) return 0;
  const step = Math.floor((minutes - 24 * 60) / 10);
  return LATE_SLEEP_LOSS[Math.min(step, LATE_SLEEP_LOSS.length - 1)]!;
}

/** Walking speed factor for the energy left: slow at 0 or below. */
export function exhaustedSpeed(energy: number): number {
  return energy <= 0 ? EXHAUSTED_SPEED : 1;
}

/** The warning line for energy that just fell from `before` to `after`, if it crossed 20, 15 or 0. */
export function tiredWarning(
  before: number,
  after: number,
): string | undefined {
  if (before > 0 && after <= 0)
    return "You are exhausted. You move slowly, and may pass out.";
  for (const w of [...TIRED_WARNINGS].reverse())
    if (before > w && after <= w)
      return w === TIRED_WARNINGS[0]
        ? "You are getting tired."
        : "You are very tired. Better head home.";
  return undefined;
}

export interface MorningInput {
  max: number;
  /** Minutes since midnight when the day ended. */
  minutes: number;
  /** Energy hit 0 at some point today. */
  exhausted: boolean;
  /** A skill leveled up today. */
  levelled: boolean;
  /** Energy fell to the floor, ending the day. */
  atFloor?: boolean;
}

/** Energy on waking. A level-up day gives full energy over everything; exhaustion gives half. */
export function morningEnergy(m: MorningInput): number {
  if (m.levelled) return m.max;
  if (m.exhausted || m.atFloor || m.minutes >= DAY_END)
    return Math.round(m.max * HALF_MORNING);
  return Math.round((m.max * (100 - lateSleepLoss(m.minutes))) / 100);
}
