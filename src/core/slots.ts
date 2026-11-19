import {
  clearSlot,
  loadSlot,
  type LoadedSlot,
  type SlotNote,
  type SlotStores,
} from "./records";
import { clockText } from "./clock";
import type { GameState } from "./save";

/** Slots always listed, even when empty (note 52). */
export const MIN_SLOTS = 5;
/** The most slots there can be (note 52). One place to change the cap. */
export const MAX_SAVE_SLOTS = 20;

/** The key the one save used before slots, and the working-title key before it. */
export const LEGACY_SAVE_KEY = "elderglen-save";
export const LEGACY_WORKING_TITLE_KEY = "beaver-valley-save";
/** Which slot the game last played in; `?new` and Start over use it. */
export const ACTIVE_SLOT_KEY = "elderglen-active-slot";

/** Plain key and value storage, so the slot rules run without a browser. */
export interface KeyValue {
  get(key: string): string | null;
  /** False when the store refused the write (private window, full storage). */
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

/** The night record of a slot. Unchanged from before the split, so no save moves. */
export const slotKey = (slot: number): string => `elderglen-save-slot-${slot}`;
/** The resume record: the day in progress (note 52). */
export const resumeKey = (slot: number): string =>
  `elderglen-resume-slot-${slot}`;
/** The night record before the latest, kept as a backup. */
export const prevKey = (slot: number): string => `elderglen-prev-slot-${slot}`;

export const isSlot = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_SAVE_SLOTS;

/**
 * Move the old single save into slot 1 the first time the slots load. The old
 * key is dropped only after the copy reads back identical, so nothing is lost.
 * A slot 1 that is already used is never overwritten.
 */
export function migrateLegacySave(kv: KeyValue): void {
  const old = kv.get(LEGACY_SAVE_KEY) ?? kv.get(LEGACY_WORKING_TITLE_KEY);
  if (old === null) return;
  const target = slotKey(1);
  if (kv.get(target) === null) {
    kv.set(target, old);
    if (kv.get(target) !== old) return;
  }
  kv.remove(LEGACY_SAVE_KEY);
  kv.remove(LEGACY_WORKING_TITLE_KEY);
}

/** The slot last played, or 1. */
export function activeSlot(kv: KeyValue): number {
  const n = Number(kv.get(ACTIVE_SLOT_KEY));
  return isSlot(n) ? n : 1;
}

export function setActiveSlot(kv: KeyValue, slot: number): void {
  if (isSlot(slot)) kv.set(ACTIVE_SLOT_KEY, String(slot));
}

/** The records of one slot over plain key and value storage. */
export function slotStores(kv: KeyValue, slot: number): SlotStores {
  const over = (key: string) => ({
    read: () => kv.get(key),
    write: (text: string) => kv.set(key, text),
    clear: () => kv.remove(key),
  });
  return {
    night: over(slotKey(slot)),
    resume: over(resumeKey(slot)),
    prev: over(prevKey(slot)),
  };
}

export type SlotInfo =
  | { slot: number; status: "empty" }
  | { slot: number; status: "broken" }
  | { slot: number; status: "newer" }
  | (Extract<LoadedSlot, { status: "used" }> & {
      slot: number;
      /** What Continue plays. Same as `play`. */
      game: GameState;
    });

/** What a slot holds: nothing, records that cannot be read, or a game. */
export function slotInfo(kv: KeyValue, slot: number): SlotInfo {
  const loaded = loadSlot(slotStores(kv, slot));
  if (loaded.status !== "used") return { slot, status: loaded.status };
  return { ...loaded, slot, game: loaded.play };
}

/**
 * How many slots are listed: at least `MIN_SLOTS`, and one empty slot past the
 * highest used one, up to `MAX_SAVE_SLOTS`. So slots grow on demand when all
 * are full, and a gap left by Delete stays usable.
 */
export function slotCount(kv: KeyValue): number {
  let top = 0;
  for (let n = MAX_SAVE_SLOTS; n >= 1 && top === 0; n--)
    if (slotInfo(kv, n).status !== "empty") top = n;
  return Math.min(MAX_SAVE_SLOTS, Math.max(MIN_SLOTS, top + 1));
}

/** Every listed slot, in order. */
export function allSlots(kv: KeyValue): SlotInfo[] {
  return Array.from({ length: slotCount(kv) }, (_, i) => slotInfo(kv, i + 1));
}

/** Empty one slot, all its records. The others are untouched. */
export function deleteSlot(kv: KeyValue, slot: number): void {
  if (isSlot(slot)) clearSlot(slotStores(kv, slot));
}

/** The title card's second line for a day in progress, from the resume record. */
export function resumeLine(g: GameState): string {
  const gold = g.money.toLocaleString("en-US");
  return `Day in progress, ${clockText(g.day.clock.minutes)}, ${gold}g`;
}

/** What the title says once about a record that could not be read. */
export function slotNote(note: SlotNote | undefined): string | undefined {
  if (note === "resume-unreadable")
    return "Today's progress could not be read. Continuing from the morning.";
  if (note === "night-unreadable")
    return "The morning save could not be read. Continuing the day in progress.";
  return undefined;
}
