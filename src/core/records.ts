import {
  deserialize,
  isNewerSave,
  serialize,
  type GameState,
  type ResumeSpot,
} from "./save";

/**
 * The two records of a save slot (note 52). The night record is the state at
 * the morning, written by sleeping, a new game and an import. The resume
 * record is the day in progress, written all day and when the page is hidden.
 * A resume is valid only while its day is the night record's day. Free of
 * Phaser and the DOM.
 */

/** One stored record. `write` says whether the browser took it. */
export interface RecordStore {
  read(): string | null;
  write(text: string): boolean;
  clear(): void;
}

/** The records of one slot. */
export interface SlotStores {
  /** The state at the morning. */
  night: RecordStore;
  /** The day in progress. */
  resume: RecordStore;
  /** The night record before the latest one, kept as a backup. */
  prev: RecordStore;
}

export type WriteResult = { ok: true } | { ok: false; reason: "refused" };

const done = (took: boolean): WriteResult =>
  took ? { ok: true } : { ok: false, reason: "refused" };

/**
 * Write the night record, after sleeping or for a new game. The old night is
 * copied to the previous record only once the new one is stored, and the
 * resume record is cleared only then too, so a failed night write never
 * leaves an old resume paired with a night that looks current.
 */
export function saveNight(stores: SlotStores, g: GameState): WriteResult {
  const old = stores.night.read();
  // A save from a newer game is never overwritten by this older build.
  if (old !== null && isNewerSave(old)) return { ok: false, reason: "refused" };
  if (!stores.night.write(serialize(g, { kind: "night" })))
    return { ok: false, reason: "refused" };
  if (old !== null) stores.prev.write(old);
  stores.resume.clear();
  return { ok: true };
}

/** Write the resume record: the day in progress, with where the player stands. */
export function saveResume(
  stores: SlotStores,
  g: GameState,
  at?: ResumeSpot,
): WriteResult {
  const night = stores.night.read();
  if (night !== null && isNewerSave(night))
    return { ok: false, reason: "refused" };
  return done(
    stores.resume.write(
      serialize(g, { kind: "resume", ...(at ? { at } : {}) }),
    ),
  );
}

export type SlotNote = "resume-unreadable" | "night-unreadable";

export type LoadedSlot =
  | { status: "empty" }
  | { status: "broken" }
  /** A record was written by a newer game: nothing is played or overwritten. */
  | { status: "newer" }
  | {
      status: "used";
      night?: GameState;
      /** The resume record, only when it is valid (its day is the night's). */
      resume?: GameState;
      /** What Continue plays: the resume if valid, else the night. */
      play: GameState;
      note?: SlotNote;
    };

/** Read a slot's records and decide what Continue plays. */
export function loadSlot(stores: SlotStores): LoadedSlot {
  const nightText = stores.night.read();
  const resumeText = stores.resume.read();
  if (nightText === null && resumeText === null) return { status: "empty" };
  if (
    (nightText !== null && isNewerSave(nightText)) ||
    (resumeText !== null && isNewerSave(resumeText))
  )
    return { status: "newer" };
  const night = nightText === null ? undefined : deserialize(nightText);
  const parsed = resumeText === null ? undefined : deserialize(resumeText);
  // A resume of another day is stale: sleeping moved the day on.
  const resume =
    parsed && (!night || parsed.day.clock.day === night.day.clock.day)
      ? parsed
      : undefined;
  const play = resume ?? night;
  if (!play) return { status: "broken" };
  let note: SlotNote | undefined;
  if (resumeText !== null && !parsed && night) note = "resume-unreadable";
  if (nightText !== null && !night) note = "night-unreadable";
  return {
    status: "used",
    ...(night ? { night } : {}),
    ...(resume ? { resume } : {}),
    play,
    ...(note ? { note } : {}),
  };
}

/**
 * Restart this day: drop the resume record and return the night record to
 * play. Undefined when there is no valid resume or no readable night.
 */
export function restartDay(stores: SlotStores): GameState | undefined {
  const slot = loadSlot(stores);
  if (slot.status !== "used" || !slot.resume || !slot.night) return undefined;
  stores.resume.clear();
  return slot.night;
}

/** Empty a slot: all three records. */
export function clearSlot(stores: SlotStores): void {
  stores.night.clear();
  stores.resume.clear();
  stores.prev.clear();
}

/**
 * Decides when a resume write is worth making: never when the state has not
 * changed since the last write, and at most once per `minGapMs` unless forced
 * (the page hidden, `pagehide` and Exit are forced). No timer.
 */
export class ResumeGate {
  private last: string | undefined;
  private lastAt = -Infinity;

  constructor(private readonly minGapMs = 2000) {}

  /** `text` is the state serialized without the record header. */
  shouldWrite(text: string, now: number, force: boolean): boolean {
    if (force) return true;
    return text !== this.last && now - this.lastAt >= this.minGapMs;
  }

  wrote(text: string, now: number): void {
    this.last = text;
    this.lastAt = now;
  }

  /** The state a scene started from counts as already written. */
  seed(text: string): void {
    this.last = text;
  }
}
