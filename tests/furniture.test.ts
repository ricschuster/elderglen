import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  CATALOGUE_ITEM,
  CATALOGUE_PRICE,
  takeCatalogueCopy,
  DAILY_STOCK,
  buyCatalogue,
  catalogueProblem,
  FURNITURE,
  buyFurniture,
  carryFurniture,
  dailyStock,
  furnitureProblem,
  pickUpFurniture,
  placeFurniture,
} from "../src/core/furniture";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sell } from "../src/core/shop";
import { ShippingBin } from "../src/core/shipping";

const room = maps.get("house");
/** An open floor tile in the start room, away from the door and bed. */
const free = (() => {
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 20; x++) {
      const g = newGame();
      g.inventory.add("oak-chair");
      if (placeFurniture(g, room, "house", x, y, "oak-chair").ok)
        return { x, y };
    }
  throw new Error("no free tile");
})();

describe("furniture data", () => {
  it("has a pool bigger than a day's stock, as items that cannot be sold", () => {
    expect(FURNITURE.length).toBeGreaterThan(DAILY_STOCK);
    expect(new Set(FURNITURE.map((f) => f.id)).size).toBe(FURNITURE.length);
    for (const f of FURNITURE) {
      expect(itemById(f.id)?.keep, f.id).toBe(true);
      expect(f.price, f.id).toBeGreaterThan(0);
    }
  });

  it("cannot be sold or shipped", () => {
    const g = newGame();
    g.inventory.add("oak-chair");
    expect(sell(g.inventory, g, "oak-chair")).toBe(0);
    expect(new ShippingBin().ship(g.inventory, "oak-chair", 1)).toBe(0);
    expect(g.inventory.count("oak-chair")).toBe(1);
  });
});

describe("placing", () => {
  const stocked = () => {
    const g = newGame();
    g.inventory.add("oak-chair", 2);
    g.inventory.add("rag-rug");
    return g;
  };

  it("stands a piece from the pack and takes it up again", () => {
    const g = stocked();
    expect(
      placeFurniture(g, room, "house", free.x, free.y, "oak-chair").ok,
    ).toBe(true);
    expect(g.inventory.count("oak-chair")).toBe(1);
    expect(g.furniture.at("house", free.x, free.y)).toBe("oak-chair");
    expect(pickUpFurniture(g, "house", free.x, free.y).ok).toBe(true);
    expect(g.inventory.count("oak-chair")).toBe(2);
    expect(g.furniture.count).toBe(0);
  });

  it("refuses an occupied tile, a wall, a door and the farm", () => {
    const g = stocked();
    placeFurniture(g, room, "house", free.x, free.y, "oak-chair");
    const again = placeFurniture(g, room, "house", free.x, free.y, "oak-chair");
    expect(again).toEqual({ ok: false, reason: "cannot place here" });
    expect(placeFurniture(g, room, "house", 0, 0, "oak-chair").ok).toBe(false);
    const door = room.exits[0]!;
    expect(
      placeFurniture(g, room, "house", door.x, door.y, "oak-chair").ok,
    ).toBe(false);
    expect(
      placeFurniture(g, room, "farm", free.x, free.y, "oak-chair").ok,
    ).toBe(false);
  });

  it("keeps a piece in the pack if the pack is full on pick up", () => {
    const g = stocked();
    placeFurniture(g, room, "house", free.x, free.y, "rag-rug");
    for (let i = 0; g.inventory.room("rag-rug") > 0; i++)
      g.inventory.add(`wood`, 99);
    expect(pickUpFurniture(g, "house", free.x, free.y)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.furniture.at("house", free.x, free.y)).toBe("rag-rug");
  });

  it("lets a rug be walked on and blocks the rest", () => {
    const g = stocked();
    placeFurniture(g, room, "house", free.x, free.y, "oak-chair");
    expect(g.furniture.blocks("house", free.x, free.y)).toBe(true);
    pickUpFurniture(g, "house", free.x, free.y);
    placeFurniture(g, room, "house", free.x, free.y, "rag-rug");
    expect(g.furniture.blocks("house", free.x, free.y)).toBe(false);
  });
});

describe("the carpenter", () => {
  it("shows the same pick all day and a different one on other days", () => {
    expect(dailyStock(5)).toEqual(dailyStock(5));
    expect(dailyStock(5)).toHaveLength(DAILY_STOCK);
    const seen = new Set<string>();
    for (let d = 1; d <= 30; d++) for (const f of dailyStock(d)) seen.add(f.id);
    expect(seen.size).toBe(
      FURNITURE.filter(
        (f) => !f.festival && !f.station && !f.catalogue && !f.catalogueBook,
      ).length,
    );
    const differs = [2, 3, 4, 5].some(
      (d) =>
        dailyStock(d)
          .map((f) => f.id)
          .join() !==
        dailyStock(1)
          .map((f) => f.id)
          .join(),
    );
    expect(differs).toBe(true);
  });

  it("sells today's stock for coin, and nothing else", () => {
    const g = newGame();
    const pick = dailyStock(g.day.clock.day)[0]!;
    const other = FURNITURE.find(
      (f) => !dailyStock(g.day.clock.day).includes(f),
    )!;
    g.money = pick.price - 1;
    expect(furnitureProblem(g, pick.id)).toMatch(/more/);
    expect(buyFurniture(g, pick.id)).toBe(false);
    g.money = pick.price + 3;
    expect(buyFurniture(g, pick.id)).toBe(true);
    expect(g.money).toBe(3);
    expect(g.inventory.count(pick.id)).toBe(1);
    g.money = 99999;
    expect(buyFurniture(g, other.id)).toBe(false);
  });
});

describe("house upgrade and save", () => {
  it("leaves furniture where it is when the house grows", () => {
    const g = newGame();
    g.furniture.add("house", free.x, free.y, "oak-chair");
    g.houseTier = 1;
    carryFurniture(g, maps.get("house", 1), "house");
    expect(g.furniture.at("house", free.x, free.y)).toBe("oak-chair");
    expect(g.inventory.count("oak-chair")).toBe(0);
    expect(g.furniture.stash).toEqual([]);
  });

  it("carries pieces from the old tier 1 map, or the pack, or the stash", () => {
    const g = newGame();
    const big = maps.get("house", 1);
    g.furniture.add("house-1", free.x, free.y, "oak-chair");
    g.furniture.add("house-1", 0, 0, "bookshelf"); // a wall tile
    carryFurniture(g, big, "house");
    expect([...g.furniture.each("house-1")]).toEqual([]);
    expect(g.furniture.at("house", free.x, free.y)).toBe("oak-chair");
    // The wall tile cannot hold the bookshelf, so it went to the pack.
    expect(g.furniture.at("house", 0, 0)).toBeUndefined();
    expect(g.inventory.count("bookshelf")).toBe(1);
    expect(g.furniture.stash).toEqual([]);
  });

  it("keeps a piece in the stash while the pack is full", () => {
    const g = newGame();
    g.furniture.add("house-1", 0, 0, "bookshelf");
    while (g.inventory.room("bookshelf") > 0) g.inventory.add("wood", 99);
    carryFurniture(g, maps.get("house", 1), "house");
    expect(g.furniture.stash).toEqual(["bookshelf"]);
    g.inventory.remove("wood", 99);
    carryFurniture(g, maps.get("house", 1), "house");
    expect(g.furniture.stash).toEqual([]);
    expect(g.inventory.count("bookshelf")).toBe(1);
  });

  it("moves a save from before the merged house map into its frame", () => {
    const g = newGame();
    g.furniture.add("house", 3, 3, "armchair");
    g.furniture.add("house-1", 12, 6, "oak-chair");
    g.chests.add("house", 4, 3, "chest");
    const raw = JSON.parse(serialize(g));
    delete raw.houseLayout;
    const back = deserialize(JSON.stringify(raw))!;
    // The old start room sat at the corner; it now sits at (11, 12).
    expect(back.furniture.at("house", 14, 15)).toBe("armchair");
    expect(back.furniture.at("house", 3, 3)).toBeUndefined();
    expect(back.chests.at("house", 15, 15)).toBe("chest");
    // The old tier 1 map moves right by the widening and down by the band.
    carryFurniture(back, maps.get("house", 1), "house");
    expect(back.furniture.at("house", 14, 16)).toBe("oak-chair");
  });

  it("moves a save in the 12 row frame (layout 2) down by the band and right by the widening", () => {
    const g = newGame();
    g.furniture.add("house", 12, 5, "armchair");
    g.chests.add("house", 13, 5, "chest");
    const raw = JSON.parse(serialize(g));
    raw.houseLayout = 2;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.furniture.at("house", 14, 15)).toBe("armchair");
    expect(back.furniture.at("house", 12, 5)).toBeUndefined();
    expect(back.chests.at("house", 15, 15)).toBe("chest");
    // Saving writes the current layout, so loading again does not move it twice.
    const again = deserialize(serialize(back))!;
    expect(again.furniture.at("house", 14, 15)).toBe("armchair");
  });

  it("moves a layout 3 save right by the widening", () => {
    const g = newGame();
    g.furniture.add("house", 12, 15, "armchair");
    g.chests.add("house", 13, 15, "chest");
    const raw = JSON.parse(serialize(g));
    raw.houseLayout = 3;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.furniture.at("house", 14, 15)).toBe("armchair");
    expect(back.chests.at("house", 15, 15)).toBe("chest");
  });

  it("does not move a save already in the new frame", () => {
    const g = newGame();
    g.furniture.add("house", 12, 15, "armchair");
    const back = deserialize(serialize(g))!;
    expect(back.furniture.at("house", 12, 15)).toBe("armchair");
  });

  it("round trips, and old or bad saves load with none", () => {
    const g = newGame();
    g.furniture.add("house", free.x, free.y, "armchair");
    g.furniture.stash.push("bookshelf");
    const back = deserialize(serialize(g))!;
    expect(back.furniture.at("house", free.x, free.y)).toBe("armchair");
    expect(back.furniture.stash).toEqual(["bookshelf"]);
    const raw = JSON.parse(serialize(g));
    delete raw.furniture;
    expect(deserialize(JSON.stringify(raw))!.furniture.count).toBe(0);
    raw.furniture = {
      placed: [
        { map: "farm", x: 1, y: 1, id: "armchair" },
        { map: "house", x: 1.5, y: 1, id: "armchair" },
        { map: "house", x: 2, y: 2, id: "nope" },
      ],
      stash: ["nope"],
    };
    const odd = deserialize(JSON.stringify(raw))!;
    expect(odd.furniture.count).toBe(0);
    expect(odd.furniture.stash).toEqual([]);
  });
});

describe("furniture catalogue", () => {
  it("needs house tier 1 and the money, once", () => {
    const g = newGame();
    g.money = CATALOGUE_PRICE;
    expect(catalogueProblem(g)).toMatch(/first house upgrade/);
    g.houseTier = 1;
    expect(buyCatalogue(g)).toBe(true);
    expect(g.money).toBe(0);
    expect(buyCatalogue(g)).toBe(false);
    g.money = CATALOGUE_PRICE;
    expect(catalogueProblem(g)).toMatch(/already/);
  });
  it("buying gives the placeable catalogue item", () => {
    const g = newGame();
    g.money = CATALOGUE_PRICE;
    g.houseTier = 1;
    expect(buyCatalogue(g)).toBe(true);
    expect(g.inventory.count(CATALOGUE_ITEM)).toBe(1);
    expect(itemById(CATALOGUE_ITEM)?.sellPrice).toBe(0);
    expect(
      placeFurniture(g, room, "house", free.x, free.y, CATALOGUE_ITEM).ok,
    ).toBe(true);
    expect(g.furniture.at("house", free.x, free.y)).toBe(CATALOGUE_ITEM);
  });
  it("the shop never lists catalogue-only pieces or the book", () => {
    const g = newGame();
    g.money = 10_000;
    const only = FURNITURE.find((f) => f.catalogue)!;
    expect(dailyStock(1).some((f) => f.catalogue || f.catalogueBook)).toBe(
      false,
    );
    expect(buyFurniture(g, only.id)).toBe(false);
    expect(buyFurniture(g, CATALOGUE_ITEM)).toBe(false);
  });
  it("copies are free, repeatable, and stop when the pack is full", () => {
    const g = newGame();
    const only = FURNITURE.find((f) => f.catalogue)!;
    expect(takeCatalogueCopy(g, only.id).ok).toBe(true);
    expect(takeCatalogueCopy(g, only.id).ok).toBe(true);
    expect(g.inventory.count(only.id)).toBe(2);
    expect(g.money).toBe(newGame().money);
    expect(takeCatalogueCopy(g, CATALOGUE_ITEM).ok).toBe(false);
    expect(takeCatalogueCopy(g, "wood").ok).toBe(false);
  });
  it("an old save with the flag is given the item once", () => {
    const g = newGame();
    g.catalogue = true;
    const raw = JSON.parse(serialize(g));
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded.furniture.stash).toEqual([CATALOGUE_ITEM]);
    expect(deserialize(serialize(loaded))!.furniture.stash).toEqual([
      CATALOGUE_ITEM,
    ]);
    loaded.furniture.stash = [];
    loaded.inventory.add(CATALOGUE_ITEM);
    expect(deserialize(serialize(loaded))!.furniture.stash.length).toBe(0);
  });
  it("saves, and an old save has no catalogue", () => {
    const g = newGame();
    g.catalogue = true;
    expect(deserialize(serialize(g))?.catalogue).toBe(true);
    const raw = JSON.parse(serialize(newGame()));
    delete raw.catalogue;
    expect(deserialize(JSON.stringify(raw))?.catalogue).toBe(false);
  });
});
