import type { Outcome } from "./actions";
import { DAY_START } from "./clock";
import { dateOf } from "./calendar";
import { HONEY } from "./artisan";
import { itemById } from "./items";
import type { FarmMap } from "./map";
import {
  BEE_MINUTES,
  machineById,
  MINUTES_PER_DAY,
  processFor,
} from "./processing";
import type { GameState } from "./save";
import { isClear } from "./actions";
import { mayPlaceOn, placeTag } from "./placeables";

/** A batch in a machine: what it makes and when it is done, in machine minutes. */
export interface MachineJob {
  output: string;
  count: number;
  doneAt: number;
  /** What was put in, given back if the machine is picked up while working. */
  input?: { item: string; use: number; also?: { item: string; use: number } };
}

export interface PlacedMachine {
  x: number;
  y: number;
  id: string;
  job?: MachineJob;
}

const key = (x: number, y: number) => `${x},${y}`;

/**
 * Machine time: 1,600 minutes a day, the 1,200 awake plus 400 overnight
 * (`07_tuning_numbers.md`). A batch finishes overnight and while the player
 * is away.
 */
export function machineMinutes(g: GameState): number {
  return (
    (g.day.clock.day - 1) * MINUTES_PER_DAY + (g.day.clock.minutes - DAY_START)
  );
}

/** The machines standing on the farm. */
export class Machines {
  private placed = new Map<string, PlacedMachine>();

  save(): PlacedMachine[] {
    return [...this.placed.values()].map((m) => ({
      ...m,
      job: m.job ? { ...m.job } : undefined,
    }));
  }

  load(saved: PlacedMachine[]): void {
    this.placed = new Map(
      saved.map((m) => [
        key(m.x, m.y),
        { ...m, job: m.job ? { ...m.job } : undefined },
      ]),
    );
  }

  *each(): Generator<PlacedMachine> {
    yield* this.placed.values();
  }

  /** The machine on a tile, if any. */
  get(x: number, y: number): PlacedMachine | undefined {
    return this.placed.get(key(x, y));
  }

  /** The machine id on a tile, if any. */
  at(x: number, y: number): string | undefined {
    return this.get(x, y)?.id;
  }

  get count(): number {
    return this.placed.size;
  }

  add(m: PlacedMachine): boolean {
    if (!machineById(m.id) || this.placed.has(key(m.x, m.y))) return false;
    this.placed.set(key(m.x, m.y), m);
    return true;
  }

  remove(x: number, y: number): PlacedMachine | undefined {
    const m = this.get(x, y);
    this.placed.delete(key(x, y));
    return m;
  }
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

const nameOf = (id: string) => itemById(id)?.name ?? id;

/** True in winter, when a bee house keeps its timer but makes no honey (SC-50). */
export function restingBees(g: GameState, m: PlacedMachine): boolean {
  return m.id === "bee-house" && dateOf(g.day.clock.day).season === "winter";
}

/** True when a job is in and finished. A bee house is not ready in winter. */
export function jobDone(g: GameState, m: PlacedMachine): boolean {
  return (
    m.job !== undefined &&
    machineMinutes(g) >= m.job.doneAt &&
    !restingBees(g, m)
  );
}

/** Machine minutes left, or undefined with no job. 0 when done. */
export function minutesLeft(
  g: GameState,
  m: PlacedMachine,
): number | undefined {
  return m.job ? Math.max(m.job.doneAt - machineMinutes(g), 0) : undefined;
}

/** Words for how long a batch has left: "about 2 days", "about 3 hours". */
export function waitText(minutes: number): string {
  if (minutes <= 0) return "done";
  if (minutes >= MINUTES_PER_DAY)
    return `about ${Math.round(minutes / MINUTES_PER_DAY)} day${minutes >= 1.5 * MINUTES_PER_DAY ? "s" : ""}`;
  if (minutes >= 60) return `about ${Math.round(minutes / 60)} hours`;
  return "under an hour";
}

/** What a machine is doing, for the message when the player uses it. */
export function statusText(g: GameState, x: number, y: number): string {
  const m = g.machines.get(x, y);
  if (!m) return "";
  const name = nameOf(m.id);
  if (!m.job) return `The ${name.toLowerCase()} is empty.`;
  if (restingBees(g, m)) return "The bees rest until spring.";
  const left = minutesLeft(g, m) ?? 0;
  return left <= 0
    ? `The ${nameOf(m.job.output).toLowerCase()} is ready.`
    : `${nameOf(m.job.output)}: ${waitText(left)}.`;
}

/**
 * Stand a machine from the backpack on clear, diggable ground. Free, like a
 * sprinkler. A bee house starts its first batch at once.
 */
export function placeMachine(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const def = machineById(id);
  if (!def) return fail("not a machine");
  if (def.cellar) return fail("cellar only");
  if (g.inventory.count(id) < 1) return fail("no machine");
  if (!mayPlaceOn(id, placeTag(map)) || !isClear(g, map, x, y))
    return fail("cannot place here");
  g.inventory.remove(id);
  g.machines.add({
    x,
    y,
    id,
    job: def.auto
      ? {
          output: HONEY,
          count: 1,
          doneAt: machineMinutes(g) + BEE_MINUTES,
        }
      : undefined,
  });
  return { ok: true };
}

/** Put the held item into the machine on a tile and start a batch. */
export function loadMachine(
  g: GameState,
  x: number,
  y: number,
  item: string,
  random: () => number = Math.random,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const m = g.machines.get(x, y);
  if (!m) return fail("no machine here");
  if (machineById(m.id)?.auto) return fail("takes nothing");
  if (m.job) return fail("machine busy");
  const p = processFor(m.id, item, random);
  if (!p) return fail("machine will not take that");
  if (g.inventory.count(item) < p.use) return fail("not enough input");
  if (p.also && g.inventory.count(p.also.item) < p.also.use)
    return fail(`needs ${p.also.use} ${nameOf(p.also.item).toLowerCase()}`);
  g.inventory.remove(item, p.use);
  if (p.also) g.inventory.remove(p.also.item, p.also.use);
  m.job = {
    output: p.output,
    count: p.count,
    doneAt: machineMinutes(g) + p.minutes,
    input: { item, use: p.use, also: p.also && { ...p.also } },
  };
  return {
    ok: true,
    note: `${nameOf(p.output)}: ${waitText(p.minutes)}.`,
  };
}

/** Take a finished batch. A bee house starts the next one. */
export function collectMachine(g: GameState, x: number, y: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const m = g.machines.get(x, y);
  if (!m) return fail("no machine here");
  if (!m.job) return fail("machine empty");
  if (!jobDone(g, m)) return fail("machine busy");
  if (g.inventory.room(m.job.output) < m.job.count)
    return fail("backpack full");
  const { output, count } = m.job;
  g.inventory.add(output, count);
  const def = machineById(m.id);
  const again =
    def?.repeats && m.job.input
      ? processFor(m.id, m.job.input.item)
      : undefined;
  m.job = def?.auto
    ? { output, count: 1, doneAt: machineMinutes(g) + BEE_MINUTES }
    : again
      ? {
          output,
          count: 1,
          doneAt: machineMinutes(g) + again.minutes,
          input: m.job.input,
        }
      : undefined;
  return { ok: true, item: output };
}

/**
 * The hand on a machine: collect a done batch, else take the machine up. A
 * working machine can be picked up too: the batch is cancelled and the input
 * comes back (SC-50, SC-66). A bee house loses its batch. If the backpack
 * cannot hold the machine and its input, nothing changes.
 */
export function handOnMachine(g: GameState, x: number, y: number): Outcome {
  const m = g.machines.get(x, y);
  if (!m) return fail("no machine here");
  if (jobDone(g, m)) return collectMachine(g, x, y);
  if (g.day.over) return fail("exhausted");
  const counts: Record<string, number> = { [m.id]: 1 };
  const input = m.job?.input;
  if (input) {
    counts[input.item] = (counts[input.item] ?? 0) + input.use;
    if (input.also)
      counts[input.also.item] = (counts[input.also.item] ?? 0) + input.also.use;
  }
  // Try the lot, and undo if any of it does not fit.
  const added: [string, number][] = [];
  for (const [id, n] of Object.entries(counts)) {
    if (g.inventory.room(id) < n || !g.inventory.add(id, n)) {
      for (const [a, k] of added) g.inventory.remove(a, k);
      return fail("backpack full");
    }
    added.push([id, n]);
  }
  g.machines.remove(x, y);
  return { ok: true, item: m.id };
}
