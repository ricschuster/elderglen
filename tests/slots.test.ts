import { describe, expect, it } from "vitest";
import { newGame, serialize } from "../src/core/save";
import {
  ACTIVE_SLOT_KEY,
  LEGACY_SAVE_KEY,
  LEGACY_WORKING_TITLE_KEY,
  MAX_SAVE_SLOTS,
  MIN_SLOTS,
  activeSlot,
  allSlots,
  deleteSlot,
  migrateLegacySave,
  setActiveSlot,
  slotInfo,
  slotCount,
  slotKey,
  slotStores,
  type KeyValue,
} from "../src/core/slots";

function memory(start: Record<string, string> = {}): KeyValue & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(start));
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => (data.set(k, v), true),
    remove: (k) => void data.delete(k),
  };
}

describe("save slots", () => {
  it("starts with five empty slots", () => {
    const kv = memory();
    const all = allSlots(kv);
    expect(all).toHaveLength(MIN_SLOTS);
    expect(all.every((s) => s.status === "empty")).toBe(true);
  });

  it("keeps each slot apart", () => {
    const kv = memory();
    const a = newGame();
    a.money = 111;
    const b = newGame();
    b.money = 222;
    slotStores(kv, 1).night.write(serialize(a));
    slotStores(kv, 3).night.write(serialize(b));
    const one = slotInfo(kv, 1);
    const three = slotInfo(kv, 3);
    expect(one.status === "used" && one.game.money).toBe(111);
    expect(three.status === "used" && three.game.money).toBe(222);
    expect(slotInfo(kv, 2).status).toBe("empty");
  });

  it("reports an unreadable save as broken, not empty", () => {
    const kv = memory({ [slotKey(2)]: "not json" });
    expect(slotInfo(kv, 2).status).toBe("broken");
  });

  it("deletes only the chosen slot", () => {
    const kv = memory();
    slotStores(kv, 1).night.write(serialize(newGame()));
    slotStores(kv, 2).night.write(serialize(newGame()));
    deleteSlot(kv, 1);
    expect(slotInfo(kv, 1).status).toBe("empty");
    expect(slotInfo(kv, 2).status).toBe("used");
  });

  it("remembers the active slot and ignores a bad one", () => {
    const kv = memory();
    expect(activeSlot(kv)).toBe(1);
    setActiveSlot(kv, 4);
    expect(activeSlot(kv)).toBe(4);
    kv.set(ACTIVE_SLOT_KEY, "99");
    expect(activeSlot(kv)).toBe(1);
  });
});

describe("moving the old single save", () => {
  it("copies an old save into slot 1 and drops the old key", () => {
    const g = newGame();
    g.money = 4321;
    const text = serialize(g);
    const kv = memory({ [LEGACY_SAVE_KEY]: text });
    migrateLegacySave(kv);
    expect(kv.data.get(slotKey(1))).toBe(text);
    expect(kv.data.has(LEGACY_SAVE_KEY)).toBe(false);
    const one = slotInfo(kv, 1);
    expect(one.status === "used" && one.game.money).toBe(4321);
  });

  it("also takes a save from the working title key", () => {
    const text = serialize(newGame());
    const kv = memory({ [LEGACY_WORKING_TITLE_KEY]: text });
    migrateLegacySave(kv);
    expect(kv.data.get(slotKey(1))).toBe(text);
    expect(kv.data.has(LEGACY_WORKING_TITLE_KEY)).toBe(false);
  });

  it("never overwrites a used slot 1", () => {
    const mine = serialize(newGame());
    const kv = memory({
      [LEGACY_SAVE_KEY]: serialize(newGame()),
      [slotKey(1)]: mine,
    });
    migrateLegacySave(kv);
    expect(kv.data.get(slotKey(1))).toBe(mine);
  });

  it("does nothing, and does not repeat after a delete", () => {
    const kv = memory();
    migrateLegacySave(kv);
    expect(kv.data.size).toBe(0);
    kv.set(LEGACY_SAVE_KEY, serialize(newGame()));
    migrateLegacySave(kv);
    deleteSlot(kv, 1);
    migrateLegacySave(kv);
    expect(slotInfo(kv, 1).status).toBe("empty");
  });

  it("grows past five when all are used, up to the cap", () => {
    const kv = memory();
    for (let n = 1; n <= MIN_SLOTS; n++)
      slotStores(kv, n).night.write(serialize(newGame()));
    expect(slotCount(kv)).toBe(MIN_SLOTS + 1);
    expect(allSlots(kv)[MIN_SLOTS]!.status).toBe("empty");
    slotStores(kv, MIN_SLOTS + 1).night.write(serialize(newGame()));
    expect(allSlots(kv)).toHaveLength(MIN_SLOTS + 2);
    slotStores(kv, MAX_SAVE_SLOTS).night.write(serialize(newGame()));
    expect(slotCount(kv)).toBe(MAX_SAVE_SLOTS);
    expect(allSlots(kv)).toHaveLength(MAX_SAVE_SLOTS);
  });

  it("shrinks back when the top slot is deleted", () => {
    const kv = memory();
    slotStores(kv, 8).night.write(serialize(newGame()));
    expect(slotCount(kv)).toBe(9);
    deleteSlot(kv, 8);
    expect(slotCount(kv)).toBe(MIN_SLOTS);
  });

  it("accepts slots above five and still loads a slot 1 save", () => {
    const kv = memory();
    slotStores(kv, 1).night.write(serialize(newGame()));
    setActiveSlot(kv, 7);
    expect(activeSlot(kv)).toBe(7);
    setActiveSlot(kv, MAX_SAVE_SLOTS + 1);
    expect(activeSlot(kv)).toBe(7);
    expect(slotInfo(kv, 1).status).toBe("used");
  });
});
