import { describe, expect, it } from "vitest";
import { DEEPMARK_KEY, HOMEWARD_PIN } from "../src/core/items";
import {
  animalRows,
  giftLogRows,
  hiddenTabs,
  skillExtras,
  socialRows,
  specialItems,
  unmetCount,
} from "../src/core/menupages";
import { newGame } from "../src/core/save";
import { VILLAGERS } from "../src/core/villagers";

const first = VILLAGERS[0]!.id;

describe("socialRows", () => {
  it("lists only people met, with hearts and today's doings", () => {
    const g = newGame();
    expect(socialRows(g)).toEqual([]);
    expect(unmetCount(g)).toBe(VILLAGERS.length);
    const day = g.day.clock.day;
    g.friendship.talk(first, day);
    const rows = socialRows(g);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.talkedToday).toBe(true);
    expect(rows[0]!.giftedToday).toBe(false);
    expect(unmetCount(g)).toBe(VILLAGERS.length - 1);
  });
});

describe("giftLogRows", () => {
  it("names the items and their tastes, in name order", () => {
    const g = newGame();
    g.friendship.meet(first);
    g.inventory.add("turnip", 1);
    g.friendship.gift(first, "turnip", g.day.clock.day);
    const rows = giftLogRows(g, first);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.item.length).toBeGreaterThan(0);
  });
});

describe("animalRows and tabs", () => {
  it("is empty and hides the tab with no animals or horse", () => {
    const g = newGame();
    expect(animalRows(g)).toEqual([]);
    expect(hiddenTabs(g)).toContain("animals");
  });
  it("shows the horse once the stable stands", () => {
    const g = newGame();
    g.animals.stableBuilt = true;
    expect(animalRows(g)).toEqual([{ name: "Not named yet", kind: "Horse" }]);
    expect(hiddenTabs(g)).not.toContain("animals");
  });
  it("shows hearts and petting for a farm animal", () => {
    const g = newGame();
    g.animals.animals.push({
      id: 1,
      species: "chicken",
      name: "Hen",
      age: 5,
      friendship: 430,
      mood: 128,
      fed: true,
      petted: true,
      outside: false,
      fresh: false,
      lay: 0,
      grazed: false,
    });
    const [row] = animalRows(g);
    expect(row).toMatchObject({
      name: "Hen",
      hearts: 2,
      maxHearts: 5,
      petted: true,
    });
  });
});

describe("specialItems", () => {
  it("is empty at first and hides the tab", () => {
    const g = newGame();
    expect(specialItems(g)).toEqual([]);
    expect(hiddenTabs(g)).toContain("special");
  });
  it("lists keys held and the catalogue", () => {
    const g = newGame();
    g.inventory.add(HOMEWARD_PIN, 1);
    g.inventory.add(DEEPMARK_KEY, 1);
    g.catalogue = true;
    expect(specialItems(g).map((s) => s.id)).toEqual([
      HOMEWARD_PIN,
      DEEPMARK_KEY,
      "catalogue",
    ]);
    expect(hiddenTabs(g)).not.toContain("special");
  });
});

describe("skillExtras", () => {
  it("shows the farmhouse always, and the rest when they exist", () => {
    const g = newGame();
    expect(skillExtras(g)).toEqual(["Farmhouse upgrade: 0 of 3"]);
    g.mines.deepest = 12;
    g.elderfruit = 2;
    expect(skillExtras(g)).toHaveLength(3);
  });
});
