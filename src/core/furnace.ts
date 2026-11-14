import { barById, COAL, coalFor, orePerBatch } from "./ore";
import type { GameState } from "./save";

/** A batch in the furnace: the bar it makes and when it is done, in minutes since day 1 at midnight. */
export interface Job {
  bar: string;
  doneAt: number;
}

export interface FurnaceSave {
  gifted: boolean;
  job?: Job;
}

/** Minutes since the start of day 1, so a batch can finish overnight. */
export function absoluteMinutes(g: GameState): number {
  return (g.day.clock.day - 1) * 24 * 60 + g.day.clock.minutes;
}

/**
 * The smith's furnace (note 22): one batch at a time. 5 ore and 1 coal make
 * one bar after a wait in game time. A done batch waits in the furnace until
 * collected. More furnaces (crafted at mining level 4) are not built yet.
 */
export class Furnace {
  gifted = false;
  job: Job | undefined;

  save(): FurnaceSave {
    return { gifted: this.gifted, job: this.job ? { ...this.job } : undefined };
  }

  load(saved: FurnaceSave): void {
    this.gifted = saved.gifted;
    this.job = saved.job ? { ...saved.job } : undefined;
  }
}

/** Put a batch in. Returns a reason if it cannot start, otherwise undefined. */
export function smelt(g: GameState, barId: string): string | undefined {
  const bar = barById(barId);
  if (!bar) return "not a bar";
  if (!g.furnace.gifted) return "no furnace";
  if (g.furnace.job) return "furnace busy";
  const n = orePerBatch(bar);
  if (g.inventory.count(bar.ore) < n) return "not enough ore";
  if (g.inventory.count(COAL) < coalFor(bar)) return "not enough coal";
  g.inventory.remove(bar.ore, n);
  g.inventory.remove(COAL, coalFor(bar));
  g.furnace.job = { bar: bar.id, doneAt: absoluteMinutes(g) + bar.minutes };
  return undefined;
}

/** True when a batch is in and finished. */
export function ready(g: GameState): boolean {
  const job = g.furnace.job;
  return job !== undefined && absoluteMinutes(g) >= job.doneAt;
}

/** Game minutes left on the batch, or undefined with none. 0 when done. */
export function minutesLeft(g: GameState): number | undefined {
  const job = g.furnace.job;
  return job === undefined
    ? undefined
    : Math.max(job.doneAt - absoluteMinutes(g), 0);
}

/** Take a finished bar. Returns the bar id, or a reason it could not. */
export function collect(
  g: GameState,
): { ok: true; bar: string } | { ok: false; reason: string } {
  const job = g.furnace.job;
  if (!job) return { ok: false, reason: "nothing smelting" };
  if (!ready(g)) return { ok: false, reason: "not done" };
  if (!g.inventory.add(job.bar, 1))
    return { ok: false, reason: "backpack full" };
  g.furnace.job = undefined;
  return { ok: true, bar: job.bar };
}
