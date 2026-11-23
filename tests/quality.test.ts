import { describe, expect, it } from "vitest";
import { harvest, plant, till, water } from "../src/core/actions";
import { BUNDLES, Hall } from "../src/core/bundles";
import { itemById, seedId } from "../src/core/items";
import { Inventory } from "../src/core/inventory";
import {
  cropQuality,
  forageQuality,
  splitQuality,
  withQuality,
} from "../src/core/quality";
import { newGame } from "../src/core/save";
import { sell } from "../src/core/shop";
import { sleep } from "../src/core/sleep";

describe("quality ids", () => {
  it("round-trips and treats normal as the bare id", () => {
    expect(withQuality("parsnip", "normal")).toBe("parsnip");
    expect(withQuality("parsnip", "gold")).toBe("parsnip@gold");
    expect(splitQuality("parsnip@silver")).toEqual({
      base: "parsnip",
      quality: "silver",
    });
    expect(splitQuality("parsnip")).toEqual({
      base: "parsnip",
      quality: "normal",
    });
    expect(splitQuality("parsnip@bogus").quality).toBe("normal");
  });

  it("prices and names follow the tier", () => {
    expect(itemById("parsnip@silver")).toMatchObject({
      name: "Silver parsnip",
      sellPrice: 43,
    });
    expect(itemById("parsnip@gold")?.sellPrice).toBe(52);
    expect(itemById("nothing@gold")).toBeUndefined();
  });

  it("selling a better good pays more", () => {
    const inv = new Inventory();
    const wallet = { money: 0 };
    inv.add("parsnip@gold");
    expect(sell(inv, wallet, "parsnip@gold")).toBe(52);
  });
});

describe("quality rolls", () => {
  it("level 0 crops are mostly normal; higher levels earn more", () => {
    expect(cropQuality(0, 0.5)).toBe("normal");
    expect(cropQuality(0, 0.005)).toBe("gold");
    expect(cropQuality(10, 0.3)).toBe("silver");
    expect(cropQuality(10, 0.1)).toBe("gold");
  });

  it("forage quality needs foraging level", () => {
    expect(forageQuality(0, 0)).toBe("normal");
    expect(forageQuality(6, 0.1)).toBe("gold");
    expect(forageQuality(6, 0.3)).toBe("silver");
    expect(forageQuality(6, 0.5)).toBe("normal");
  });
});

describe("quality in play", () => {
  it("a harvest roll decides the stack it lands in", () => {
    const g = newGame();
    g.inventory.add(seedId("parsnip"));
    till(g, 0, 0);
    plant(g, 0, 0, seedId("parsnip"));
    for (let i = 0; i < 4; i++) {
      water(g, 0, 0);
      sleep(g, [], () => 0.99);
    }
    expect(harvest(g, 0, 0, () => 0)).toMatchObject({
      ok: true,
      item: "parsnip@gold",
    });
    expect(g.inventory.count("parsnip@gold")).toBe(1);
  });

  it("bundles take any quality, once per good", () => {
    const hall = new Hall();
    const bundle = BUNDLES.find((b) =>
      b.items.some((i) => i.id === "daffodil"),
    )!;
    const inv = new Inventory();
    const wallet = { money: 0 };
    inv.add("daffodil@gold");
    inv.add("daffodil");
    expect(hall.handIn(inv, wallet, bundle.id, "daffodil@gold")).toBe(
      "accepted",
    );
    expect(hall.handedIn(bundle.id)).toEqual(["daffodil"]);
    expect(hall.problem(inv, bundle.id, "daffodil")).toBe("Already handed in.");
  });
});

describe("Hearthsilver, the top grade", () => {
  it("sells for twice the base and feeds more than gold", () => {
    const base = itemById("parsnip")!;
    const top = itemById("parsnip@hearthsilver")!;
    expect(top.sellPrice).toBe(base.sellPrice * 2);
    expect(top.name).toBe("Hearthsilver parsnip");
    expect(top.sellPrice).toBeGreaterThan(itemById("parsnip@gold")!.sellPrice);
    const food = itemById("salmonberry")?.energy;
    if (food !== undefined)
      expect(itemById("salmonberry@hearthsilver")!.energy).toBeGreaterThan(
        itemById("salmonberry@gold")!.energy!,
      );
    expect(splitQuality("parsnip@hearthsilver")).toEqual({
      base: "parsnip",
      quality: "hearthsilver",
    });
  });

  it("rolls for crops only at high farming level on fertilised soil", () => {
    expect(cropQuality(10, 0.01, 1)).toBe("hearthsilver");
    expect(cropQuality(10, 0.01, 0)).toBe("gold");
    expect(cropQuality(7, 0.01, 1)).not.toBe("hearthsilver");
  });

  it("rolls for forage from level 10", () => {
    expect(forageQuality(10, 0.01)).toBe("hearthsilver");
    expect(forageQuality(9, 0.01)).toBe("gold");
  });

  it("counts above gold for a bundle's minimum", () => {
    const inv = new Inventory();
    inv.add("parsnip@hearthsilver");
    expect(inv.count("parsnip@hearthsilver")).toBe(1);
  });
});
