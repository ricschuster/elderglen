import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { categoryOf, DYE_INPUTS, dyeOf } from "../src/core/artisan";
import {
  CASK,
  caskQuality,
  caskStatus,
  caskTakes,
  collectCask,
  handOnCask,
  loadCask,
  pickUpCask,
  placeCask,
} from "../src/core/cask";
import { craft, knownRecipes } from "../src/core/crafting";
import { CELLAR_MAP } from "../src/core/house";
import { MINUTES_PER_DAY, processFor } from "../src/core/processing";
import { jobDone, loadMachine, placeMachine } from "../src/core/machines";
import { deserialize, newGame, serialize } from "../src/core/save";
import { splitQuality } from "../src/core/quality";
import { itemById } from "../src/core/items";
import { RECIPES } from "../src/core/crafting";

const cellar = () => maps.get(CELLAR_MAP);
const game = () => {
  const g = newGame();
  g.inventory.add(CASK, 3);
  return g;
};
/** A free floor tile of the cellar, clear of the stairs. */
const FREE = { x: 8, y: 8 };

describe("the cask", () => {
  it("is a cellar-only item that the farm will not stand", () => {
    expect(itemById(CASK)?.name).toBe("Cask");
    const g = game();
    const farm = maps.get("farm");
    expect(placeMachine(g, farm, 5, 5, CASK)).toEqual({
      ok: false,
      reason: "cellar only",
    });
    expect(g.inventory.count(CASK)).toBe(3);
  });

  it("is placed on clear cellar floor, not on the stairs or twice", () => {
    const g = game();
    const m = cellar();
    expect(placeCask(g, m, FREE.x, FREE.y).ok).toBe(true);
    expect(g.inventory.count(CASK)).toBe(2);
    expect(placeCask(g, m, FREE.x, FREE.y)).toMatchObject({ ok: false });
    expect(placeCask(g, m, 0, 0)).toMatchObject({ ok: false });
    expect(placeCask(g, m, 2, 2)).toMatchObject({ ok: false }); // the stairs
    expect(g.casks.count).toBe(1);
  });

  it("holds Stardew's most, 189 casks, with no cap on the count", () => {
    const g = newGame();
    const m = cellar();
    g.inventory.add(CASK, 189);
    let placed = 0;
    for (let y = 0; y < m.height && placed < 189; y++)
      for (let x = 0; x < m.width && placed < 189; x++)
        if (placeCask(g, m, x, y).ok) placed++;
    expect(placed).toBe(189);
    expect(g.casks.count).toBe(189);
  });

  it("takes wine, mead and cheese only", () => {
    for (const ok of ["melon-wine", "mead", "cheese", "goat-cheese@silver"])
      expect(caskTakes(ok), ok).toBe(true);
    for (const no of ["melon-jam", "honey", "parsnip", "cloth", "oil"])
      expect(caskTakes(no), no).toBe(false);
    expect(categoryOf("melon-wine")).toBe("wine");
  });

  it("ages wine to silver at 14 days and gold at 28", () => {
    const g = game();
    g.casks.add({ x: 8, y: 8 });
    g.inventory.add("melon-wine");
    g.day.clock.day = 3;
    expect(loadCask(g, 8, 8, "melon-wine").ok).toBe(true);
    const job = g.casks.get(8, 8)!.job!;
    expect(caskQuality(g, job)).toBe("normal");
    g.day.clock.day = 3 + 13;
    expect(caskQuality(g, job)).toBe("normal");
    g.day.clock.day = 3 + 14;
    expect(caskQuality(g, job)).toBe("silver");
    g.day.clock.day = 3 + 28;
    expect(caskQuality(g, job)).toBe("gold");
    expect(collectCask(g, 8, 8)).toMatchObject({
      ok: true,
      item: "melon-wine@gold",
    });
    expect(g.inventory.count("melon-wine@gold")).toBe(1);
    expect(g.casks.get(8, 8)!.job).toBeUndefined();
  });

  it("ages cheese faster and never lowers the quality it went in at", () => {
    const g = game();
    g.casks.add({ x: 8, y: 8 });
    g.inventory.add("cheese@silver");
    g.day.clock.day = 2;
    loadCask(g, 8, 8, "cheese@silver");
    const job = g.casks.get(8, 8)!.job!;
    expect(caskQuality(g, job)).toBe("silver");
    g.day.clock.day = 2 + 7;
    expect(caskQuality(g, job)).toBe("gold");
  });

  it("can be emptied early at the quality reached, and says how long is left", () => {
    const g = game();
    g.casks.add({ x: 8, y: 8 });
    g.inventory.add("cheese");
    g.day.clock.day = 1;
    loadCask(g, 8, 8, "cheese");
    g.day.clock.day = 3;
    expect(caskStatus(g, 8, 8)).toBe("Cheese: normal, silver in 1 day.");
    expect(loadCask(g, 8, 8, "cheese")).toMatchObject({ reason: "cask busy" });
    expect(pickUpCask(g, 8, 8)).toMatchObject({ reason: "cask not empty" });
    expect(handOnCask(g, 8, 8)).toMatchObject({ ok: true, item: "cheese" });
    expect(caskStatus(g, 8, 8)).toBe("The cask is empty.");
  });

  it("refuses a good it cannot age and an empty hand", () => {
    const g = game();
    g.casks.add({ x: 8, y: 8 });
    g.inventory.add("melon-jam");
    expect(loadCask(g, 8, 8, "melon-jam")).toMatchObject({
      reason: "cask will not take that",
    });
    expect(collectCask(g, 8, 8)).toMatchObject({ reason: "cask empty" });
  });

  it("is picked up empty, with the hand tool as well", () => {
    const g = newGame();
    g.casks.add({ x: 8, y: 8 });
    expect(handOnCask(g, 8, 8)).toMatchObject({ ok: true, item: CASK });
    expect(g.casks.count).toBe(0);
    expect(g.inventory.count(CASK)).toBe(1);
  });

  it("is crafted once the cellar stairs are built", () => {
    const g = newGame();
    g.inventory.add("wood", 40);
    expect(knownRecipes(g).some((r) => r.id === "cask")).toBe(false);
    expect(craft(g, "cask")).toBe("recipe not known");
    g.houseTier = 3;
    expect(craft(g, "cask")).toBeUndefined();
    expect(g.inventory.count(CASK)).toBe(1);
  });

  it("round trips through a save, and an old save loads with no casks", () => {
    const g = game();
    g.casks.add({ x: 8, y: 8 });
    g.inventory.add("melon-wine@silver");
    g.day.clock.day = 4;
    loadCask(g, 8, 8, "melon-wine@silver");
    const back = deserialize(serialize(g))!;
    const job = back.casks.get(8, 8)!.job!;
    expect(job).toEqual({ item: "melon-wine", quality: "silver", since: 4 });

    const old = JSON.parse(serialize(newGame()));
    delete old.casks;
    expect(deserialize(JSON.stringify(old))!.casks.count).toBe(0);

    const bad = JSON.parse(serialize(g));
    bad.casks = [{ x: 1 }, { x: 8, y: 8, job: { item: "parsnip" } }];
    const loaded = deserialize(JSON.stringify(bad))!;
    expect(loaded.casks.count).toBe(1);
    expect(loaded.casks.get(8, 8)!.job).toBeUndefined();
  });
});

describe("the dye vat", () => {
  it("turns any plant in the table into its colour's dye in a day", () => {
    const expected: Record<string, string> = {
      daffodil: "yellow-dye",
      "sweet-pea": "pink-dye",
      "red-cabbage": "purple-dye",
      cranberry: "red-dye",
      "bramble-berry": "indigo-dye",
      crocus: "violet-dye",
      pumpkin: "orange-dye",
      kale: "green-dye",
      snowdrop: "blue-dye",
    };
    for (const [input, dye] of Object.entries(expected)) {
      expect(processFor("dye-vat", `${input}@silver`)).toMatchObject({
        input,
        use: 1,
        output: dye,
        count: 1,
        minutes: MINUTES_PER_DAY,
      });
      expect(categoryOf(dye)).toBe("dye");
      expect(itemById(dye)?.sellPrice).toBe(120);
    }
    expect(processFor("dye-vat", "parsnip")).toBeUndefined();
    expect(processFor("dye-vat", "wool")).toBeUndefined();
    expect(splitQuality("yellow-dye").base).toBe("yellow-dye");
  });

  it("has a real item and a known dye for every table row", () => {
    expect(Object.keys(DYE_INPUTS).length).toBeGreaterThan(6);
    for (const input of Object.keys(DYE_INPUTS)) {
      expect(itemById(input), input).toBeDefined();
      const dye = dyeOf(input);
      expect(dye, input).toBeDefined();
      expect(categoryOf(dye!)).toBe("dye");
    }
  });

  it("runs a batch in the machine", () => {
    const g = newGame();
    g.inventory.add("dye-vat");
    g.inventory.add("daffodil");
    const at = { x: 61, y: 20 }; // bare field south of the house (gen-farm-map.mjs)
    expect(placeMachine(g, maps.get("farm"), at.x, at.y, "dye-vat").ok).toBe(
      true,
    );
    expect(loadMachine(g, at.x, at.y, "daffodil").ok).toBe(true);
    const m = g.machines.get(at.x, at.y)!;
    expect(jobDone(g, m)).toBe(false);
    g.day.clock.day += 1;
    expect(jobDone(g, m)).toBe(true);
  });

  it("is the Dyer's bundle reward and crafts from that bundle", () => {
    const recipe = RECIPES.find((r) => r.id === "dye-vat")!;
    expect(recipe.sources).toEqual([{ kind: "bundle", bundle: "dyers" }]);
    const g = newGame();
    expect(knownRecipes(g).some((r) => r.id === "dye-vat")).toBe(false);
  });
});
