import { describe, expect, it } from "vitest";
import { Inventory } from "../src/core/inventory";
import { ShippingBin } from "../src/core/shipping";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { reportLines } from "../src/core/report";

const PARSNIP = "parsnip";

function stocked(n: number) {
  const inv = new Inventory();
  inv.add(PARSNIP, n);
  return inv;
}

describe("ShippingBin", () => {
  it("moves goods out of the backpack and totals them", () => {
    const inv = stocked(5);
    const bin = new ShippingBin();
    expect(bin.ship(inv, PARSNIP, 3)).toBe(3);
    expect(inv.count(PARSNIP)).toBe(2);
    expect(bin.total()).toBe(3 * bin.each()[0]!.unit);
  });

  it("ships no more than the backpack holds, and ignores unknown items", () => {
    const inv = stocked(2);
    const bin = new ShippingBin();
    expect(bin.ship(inv, PARSNIP, 9)).toBe(2);
    expect(bin.ship(inv, PARSNIP, 1)).toBe(0);
    expect(bin.ship(inv, "no-such-item", 1)).toBe(0);
  });

  it("locks the price when the item goes in", () => {
    const inv = stocked(4);
    const bin = new ShippingBin();
    bin.ship(inv, PARSNIP, 2, 1);
    bin.ship(inv, PARSNIP, 2, 1.1);
    const [a, b] = bin.each();
    expect(a!.unit).toBeLessThan(b!.unit);
    expect(bin.total()).toBe(2 * a!.unit + 2 * b!.unit);
  });

  it("merges lines of the same price", () => {
    const inv = stocked(4);
    const bin = new ShippingBin();
    bin.ship(inv, PARSNIP, 1);
    bin.ship(inv, PARSNIP, 3);
    expect(bin.each()).toHaveLength(1);
    expect(bin.each()[0]!.count).toBe(4);
  });

  it("takes goods back, only as far as there is room", () => {
    const inv = stocked(3);
    const bin = new ShippingBin();
    bin.ship(inv, PARSNIP, 3);
    expect(bin.takeBack(inv, 0, 1)).toBe(1);
    expect(inv.count(PARSNIP)).toBe(1);
    expect(bin.takeBack(inv, 0, 99)).toBe(2);
    expect(bin.isEmpty).toBe(true);
    expect(bin.takeBack(inv, 0, 1)).toBe(0);
  });

  it("keeps goods in the bin when the backpack is full", () => {
    const inv = new Inventory();
    const bin = new ShippingBin();
    inv.add(PARSNIP, 1);
    bin.ship(inv, PARSNIP, 1);
    for (let i = 0; inv.add("wood", 1); i++);
    expect(bin.takeBack(inv, 0, 1)).toBe(0);
    expect(bin.each()[0]!.count).toBe(1);
  });

  it("pays and empties the bin when settled, and counts what shipped", () => {
    const inv = stocked(4);
    const bin = new ShippingBin();
    bin.ship(inv, PARSNIP, 4);
    const total = bin.total();
    const wallet = { money: 10 };
    const done = bin.settle(wallet);
    expect(wallet.money).toBe(10 + total);
    expect(done.total).toBe(total);
    expect(done.lines[0]!.count).toBe(4);
    expect(bin.isEmpty).toBe(true);
    expect(bin.shippedCount(PARSNIP)).toBe(4);
  });

  it("saves and loads", () => {
    const inv = stocked(4);
    const bin = new ShippingBin();
    bin.ship(inv, PARSNIP, 2);
    const copy = new ShippingBin();
    copy.load(bin.save());
    expect(copy.save()).toEqual(bin.save());
  });
});

describe("the bin and the night", () => {
  it("pays at sleep and reports what sold", () => {
    const g = newGame();
    g.inventory.add(PARSNIP, 3);
    g.bin.ship(g.inventory, PARSNIP, 3);
    const expected = g.bin.total();
    const before = g.money;
    const report = sleep(g, [], () => 0.5);
    expect(g.money).toBe(before + expected);
    expect(report.shipped.total).toBe(expected);
    expect(report.shipped.lines).toHaveLength(1);
    expect(g.bin.isEmpty).toBe(true);
  });

  it("does not take the pass-out cost from bin money", () => {
    const g = newGame();
    g.day.energy.spend(g.day.energy.current);
    g.inventory.add(PARSNIP, 3);
    g.bin.ship(g.inventory, PARSNIP, 3);
    const paid = g.bin.total();
    const before = g.money;
    const report = sleep(g, [], () => 0.5);
    expect(report.passedOut).toBe(true);
    expect(g.money).toBe(before - report.moneyLost + paid);
  });

  it("says nothing about the bin when it was empty", () => {
    const report = sleep(newGame(), [], () => 0.5);
    expect(report.shipped.total).toBe(0);
    expect(reportLines(report).join(" ")).not.toMatch(/sold/i);
  });

  it("survives a save", () => {
    const g = newGame();
    g.inventory.add(PARSNIP, 3);
    g.bin.ship(g.inventory, PARSNIP, 2);
    const back = deserialize(serialize(g))!;
    expect(back.bin.save()).toEqual(g.bin.save());
  });

  it("the mine hall's bin takes raw ore only, into the same bin", () => {
    const inv = new Inventory();
    inv.add("copper-ore", 4);
    inv.add("copper-bar", 2);
    inv.add("stone", 3);
    inv.add("coal", 1);
    const bin = new ShippingBin();
    expect(bin.shipOre(inv, "copper-ore", 4)).toBe(4);
    expect(bin.shipOre(inv, "copper-bar", 2)).toBe(0);
    expect(bin.shipOre(inv, "stone", 3)).toBe(0);
    expect(bin.shipOre(inv, "coal", 1)).toBe(0);
    expect(inv.count("copper-bar")).toBe(2);
    expect(bin.total()).toBe(4 * 5);
  });
});
