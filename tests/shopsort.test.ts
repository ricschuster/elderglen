import { describe, expect, it } from "vitest";
import { itemById } from "../src/core/items";
import { byName, byPrice, saplingStock, seedStock } from "../src/core/shop";

const price = (id: string) => itemById(id)?.buyPrice ?? 0;

describe("shop order", () => {
  it("lists seeds and saplings cheapest first", () => {
    for (const stock of [seedStock("spring"), saplingStock()])
      expect(stock.map(price)).toEqual(
        [...stock.map(price)].sort((a, b) => a - b),
      );
  });

  it("breaks price ties by name", () => {
    const ids = byPrice(seedStock("spring"));
    for (let i = 1; i < ids.length; i++)
      if (price(ids[i]!) === price(ids[i - 1]!))
        expect(
          itemById(ids[i - 1]!)!.name.localeCompare(itemById(ids[i]!)!.name),
        ).toBeLessThanOrEqual(0);
  });

  it("sorts what the player holds A to Z", () => {
    const names = byName(seedStock("spring")).map((id) => itemById(id)!.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
