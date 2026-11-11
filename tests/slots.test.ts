import { describe, expect, it } from "vitest";
import { newGame, serialize } from "../src/core/save";
import {
  ACTIVE_SLOT_KEY,
  LEGACY_SAVE_KEY,
  LEGACY_WORKING_TITLE_KEY,
  SLOT_COUNT,
  activeSlot,
  allSlots,
  deleteSlot,
  migrateLegacySave,
  setActiveSlot,
  slotInfo,
  slotKey,
  slotStore,
  type KeyValue,
} from "../src/core/slots";

function memory(start: Record<string, string> = {}): KeyValue & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(start));
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
}

describe("save slots", () => {
  it("starts with five empty slots", () => {
    const kv = memory();
    const all = allSlots(kv);
    expect(all).toHaveLength(SLOT_COUNT);
    expect(all.every((s) => s.status === "empty")).toBe(true);
  });

  it("keeps each slot apart", () => {
    const kv = memory();
    const a = newGame();
    a.money = 111;
    const b = newGame();
    b.money = 222;
    slotStore(kv, 1).write(serialize(a));
    slotStore(kv, 3).write(serialize(b));
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
    slotStore(kv, 1).write(serialize(newGame()));
    slotStore(kv, 2).write(serialize(newGame()));
    deleteSlot(kv, 1);
    expect(slotInfo(kv, 1).status).toBe("empty");
    expect(slotInfo(kv, 2).status).toBe("used");
  });

  it("remembers the active slot and ignores a bad one", () => {
    const kv = memory();
    expect(activeSlot(kv)).toBe(1);
    setActiveSlot(kv, 4);
    expect(activeSlot(kv)).toBe(4);
    kv.set(ACTIVE_SLOT_KEY, "9");
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
});
