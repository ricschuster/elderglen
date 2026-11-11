import { deserialize, type GameState, type SaveStore } from "./save";

/** Five fixed save slots (note 52). */
export const SLOT_COUNT = 5;

/** The key the one save used before slots, and the working-title key before it. */
export const LEGACY_SAVE_KEY = "elderglen-save";
export const LEGACY_WORKING_TITLE_KEY = "beaver-valley-save";
/** Which slot the game last played in; `?new` and Start over use it. */
export const ACTIVE_SLOT_KEY = "elderglen-active-slot";

/** Plain key and value storage, so the slot rules run without a browser. */
export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const slotKey = (slot: number): string => `elderglen-save-slot-${slot}`;

export const isSlot = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= SLOT_COUNT;

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

/** A save store over one slot. */
export function slotStore(kv: KeyValue, slot: number): SaveStore {
  return {
    read: () => kv.get(slotKey(slot)),
    write: (text) => kv.set(slotKey(slot), text),
  };
}

export type SlotInfo =
  | { slot: number; status: "empty" }
  | { slot: number; status: "broken" }
  | { slot: number; status: "used"; game: GameState };

/** What a slot holds: nothing, a save that cannot be read, or a game. */
export function slotInfo(kv: KeyValue, slot: number): SlotInfo {
  const text = kv.get(slotKey(slot));
  if (text === null) return { slot, status: "empty" };
  const game = deserialize(text);
  return game ? { slot, status: "used", game } : { slot, status: "broken" };
}

/** Every slot, in order. */
export function allSlots(kv: KeyValue): SlotInfo[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => slotInfo(kv, i + 1));
}

/** Empty one slot. The others are untouched. */
export function deleteSlot(kv: KeyValue, slot: number): void {
  if (isSlot(slot)) kv.remove(slotKey(slot));
}
