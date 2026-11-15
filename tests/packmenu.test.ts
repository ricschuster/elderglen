import { describe, expect, it } from "vitest";
import { Inventory, STACK_SIZE } from "../src/core/inventory";
import { BOOTS, Equipment, RINGS } from "../src/core/equipment";
import {
  takeOff,
  wearFromPack,
  moveStack,
  needsTrashConfirm,
  sortPack,
  splitStack,
  trashSlot,
} from "../src/core/packmenu";

const inv = (...stacks: ([string, number] | null)[]): Inventory => {
  const i = new Inventory();
  i.load(stacks.map((s) => (s ? { id: s[0], count: s[1] } : null)));
  return i;
};

describe("moveStack", () => {
  it("moves into an empty slot", () => {
    const i = inv(["turnip", 3]);
    expect(moveStack(i, 0, 5)).toBe(true);
    expect(i.slot(0)).toBeUndefined();
    expect(i.slot(5)).toEqual({ id: "turnip", count: 3 });
  });
  it("swaps different items", () => {
    const i = inv(["turnip", 3], ["wood", 7]);
    moveStack(i, 0, 1);
    expect(i.slot(0)).toEqual({ id: "wood", count: 7 });
    expect(i.slot(1)).toEqual({ id: "turnip", count: 3 });
  });
  it("merges the same item and leaves the overflow", () => {
    const i = inv(["wood", 10], ["wood", STACK_SIZE - 4]);
    moveStack(i, 0, 1);
    expect(i.slot(1)?.count).toBe(STACK_SIZE);
    expect(i.slot(0)?.count).toBe(6);
  });
  it("refuses an empty source, the same slot and out of range", () => {
    const i = inv(["wood", 1]);
    expect(moveStack(i, 3, 4)).toBe(false);
    expect(moveStack(i, 0, 0)).toBe(false);
    expect(moveStack(i, 0, 99)).toBe(false);
  });
});

describe("splitStack", () => {
  it("moves half, rounded down", () => {
    const i = inv(["wood", 7]);
    expect(splitStack(i, 0, 1)).toBe(true);
    expect(i.slot(0)?.count).toBe(4);
    expect(i.slot(1)?.count).toBe(3);
  });
  it("adds to the same item and refuses a different one", () => {
    const i = inv(["wood", 4], ["wood", 1], ["stone", 2]);
    splitStack(i, 0, 1);
    expect(i.slot(1)?.count).toBe(3);
    expect(splitStack(i, 0, 2)).toBe(false);
  });
  it("cannot split a single item", () => {
    expect(splitStack(inv(["wood", 1]), 0, 1)).toBe(false);
  });
});

describe("sortPack", () => {
  it("merges stacks and packs to the front", () => {
    const i = inv(["wood", 2], null, ["wood", 3], null, ["stone", 1]);
    expect(sortPack(i)).toBe(true);
    const ids = i.save().filter(Boolean);
    expect(ids).toHaveLength(2);
    expect(i.count("wood")).toBe(5);
    expect(i.slot(0)).toBeDefined();
    expect(i.slot(2)).toBeUndefined();
  });
  it("reports no change on a sorted pack", () => {
    const i = inv(["wood", 2]);
    sortPack(i);
    expect(sortPack(i)).toBe(false);
  });
});

describe("trashSlot", () => {
  it("destroys the stack and returns it", () => {
    const i = inv(["wood", 4]);
    expect(trashSlot(i, 0)).toEqual({ id: "wood", count: 4 });
    expect(i.slot(0)).toBeUndefined();
    expect(trashSlot(i, 0)).toBeUndefined();
  });
  it("asks first for unknown or valuable stacks", () => {
    expect(needsTrashConfirm("no-such-item", 1)).toBe(true);
    expect(needsTrashConfirm("wood", 1)).toBe(false);
  });
});

describe("wearFromPack and takeOff", () => {
  const ringId = RINGS[0]!.id;
  const bootId = BOOTS[0]!.id;
  it("wears a ring into the first free slot", () => {
    const i = inv([ringId, 2]);
    const eq = new Equipment();
    expect(wearFromPack(eq, i, ringId)).toBe("ring");
    expect(wearFromPack(eq, i, ringId)).toBe("ring");
    expect(eq.worn()).toEqual([ringId, ringId]);
    expect(i.count(ringId)).toBe(0);
  });
  it("swaps into slot 1 when both are taken", () => {
    const other = RINGS[1]!.id;
    const i = inv([ringId, 1], [other, 1]);
    const eq = new Equipment();
    eq.wear(i, 0, ringId);
    eq.wear(i, 1, other);
    i.add(ringId, 1);
    expect(wearFromPack(eq, i, ringId)).toBe("ring");
    expect(eq.worn()[0]).toBe(ringId);
  });
  it("wears boots and takes them off", () => {
    const i = inv([bootId, 1]);
    const eq = new Equipment();
    expect(wearFromPack(eq, i, bootId)).toBe("boots");
    expect(eq.wornBoots()).toBe(bootId);
    expect(takeOff(eq, i, "boots")).toBe(true);
    expect(i.count(bootId)).toBe(1);
    expect(takeOff(eq, i, "boots")).toBe(false);
  });
  it("refuses a non-wearable item", () => {
    expect(wearFromPack(new Equipment(), inv(["turnip", 1]), "turnip")).toBe(
      "none",
    );
  });
});
