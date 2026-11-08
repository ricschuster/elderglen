import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  buyHat,
  checkAchievements,
  hatsOnSale,
} from "../src/core/achievements";
import { craft } from "../src/core/crafting";
import { CROPS } from "../src/core/crops";
import { hatById } from "../src/core/hats";
import { reportLines } from "../src/core/report";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";

describe("achievements", () => {
  it("each have a unique id, a real hat and a price", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(
      ACHIEVEMENTS.length,
    );
    expect(new Set(ACHIEVEMENTS.map((a) => a.hat.id)).size).toBe(
      ACHIEVEMENTS.length,
    );
    for (const a of ACHIEVEMENTS) {
      expect(hatById(a.hat.id), a.id).toBeDefined();
      expect(a.hat.price, a.id).toBeGreaterThan(0);
    }
  });

  it("earns the money goals from gold received, and hides the top one until earned", () => {
    const g = newGame();
    expect(checkAchievements(g)).toEqual([]);
    g.cave.addEarnings(60000, 99);
    const won = checkAchievements(g).map((a) => a.id);
    expect(won).toEqual(["pocketful", "full-purse"]);
    expect(checkAchievements(g)).toEqual([]);
    expect(ACHIEVEMENTS.find((a) => a.id === "hoard-of-ages")?.secret).toBe(
      true,
    );
  });

  it("counts different recipes crafted, not repeats", () => {
    const g = newGame();
    g.inventory.add("wood", 100);
    craft(g, "chest");
    g.inventory.add("wood", 50);
    craft(g, "chest");
    expect(g.achievements.craftedCount).toBe(1);
    for (let i = 0; i < 14; i++) g.achievements.noteCrafted(`r${i}`);
    expect(checkAchievements(g).map((a) => a.id)).toEqual(["tinkerer"]);
  });

  it("counts shipping across qualities, for one crop and for each crop", () => {
    const g = newGame();
    g.inventory.add("parsnip", 200);
    g.inventory.add("parsnip@silver", 100);
    g.bin.ship(g.inventory, "parsnip", 200);
    g.bin.ship(g.inventory, "parsnip@silver", 100);
    g.bin.settle(g);
    expect(checkAchievements(g).map((a) => a.id)).toEqual(["one-field"]);
    for (const c of CROPS) {
      g.inventory.add(c.id, 15);
      g.bin.ship(g.inventory, c.id, 15);
    }
    g.bin.settle(g);
    expect(checkAchievements(g).map((a) => a.id)).toContain("every-furrow");
  });

  it("earns a skill and the house goals", () => {
    const g = newGame();
    g.skills.gain("mining", 100000);
    g.houseTier = 3;
    expect(checkAchievements(g).map((a) => a.id)).toEqual([
      "one-trade",
      "roof-over",
      "room-to-spare",
    ]);
  });

  it("puts the hat on sale once earned, takes the price, and lists it as owned", () => {
    const g = newGame();
    expect(hatsOnSale(g)).toEqual([]);
    g.cave.addEarnings(15000, 99);
    checkAchievements(g);
    expect(hatsOnSale(g).map((a) => a.hat.id)).toEqual(["clay-cap"]);
    expect(buyHat(g, "clay-cap")).toBe("Not enough money.");
    g.money = 1500;
    expect(buyHat(g, "clay-cap")).toBeUndefined();
    expect(g.money).toBe(500);
    expect(g.wardrobe.has("clay-cap")).toBe(true);
    expect(hatsOnSale(g)).toEqual([]);
    expect(buyHat(g, "brass-bow")).toBe("The hatter does not have that.");
  });

  it("checks at day end and names the achievement in the morning report", () => {
    const g = newGame();
    g.cave.addEarnings(15000, 99);
    const r = sleep(g, [], () => 0.5);
    expect(r.achievements).toEqual(["Pocketful"]);
    expect(reportLines(r)).toContain(
      "Achievement: Pocketful. The hatter has a new hat on sale.",
    );
  });

  it("keeps what was earned and crafted through a save, and rechecks on load", () => {
    const g = newGame();
    g.cave.addEarnings(15000, 99);
    checkAchievements(g);
    g.achievements.noteCrafted("sprinkler");
    const back = deserialize(serialize(g))!;
    expect(back.achievements.has("pocketful")).toBe(true);
    expect(back.achievements.hasCrafted("sprinkler")).toBe(true);
    const raw = JSON.parse(serialize(g));
    delete raw.achievements;
    expect(
      deserialize(JSON.stringify(raw))!.achievements.has("pocketful"),
    ).toBe(true);
  });
});
