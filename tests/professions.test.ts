import { describe, expect, it } from "vitest";
import { forage, harvest, plant, till, water } from "../src/core/actions";
import {
  bonusGeodeChance,
  choose,
  coalFactor,
  growthRate,
  LUMBERJACK_HARDWOOD_CHANCE,
  optionsFor,
  pendingChoice,
  pendingLevel,
  sellMultiplier,
  woodYield,
} from "../src/core/professions";
import { drops, mine } from "../src/core/mining";
import { sweep } from "./helpers/sweep";
import { seedId } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sell } from "../src/core/shop";
import { sleep } from "../src/core/sleep";
import { LEVEL_XP, Skills } from "../src/core/skills";

const level5 = LEVEL_XP[4]!;

describe("professions", () => {
  it("offers a choice at level 5, once", () => {
    const g = newGame();
    expect(pendingChoice(g.skills)).toBeUndefined();
    g.skills.gain("farming", level5);
    expect(pendingChoice(g.skills)).toBe("farming");
    expect(choose(g.skills, "farming", "gatherer")).toBe(false);
    expect(choose(g.skills, "farming", "tiller")).toBe(true);
    expect(pendingChoice(g.skills)).toBeUndefined();
    expect(choose(g.skills, "farming", "rancher")).toBe(false);
  });

  it("tillers sell crops, but not forage, for 10% more", () => {
    const g = newGame();
    g.skills.gain("farming", level5);
    choose(g.skills, "farming", "tiller");
    expect(sellMultiplier(g.skills, "parsnip@gold")).toBeCloseTo(1.1);
    expect(sellMultiplier(g.skills, "daffodil")).toBe(1);
    g.inventory.add("parsnip");
    expect(sell(g.inventory, g, "parsnip", 1, 1.1)).toBe(38);
  });

  it("agriculturists ripen a 12 day crop a day sooner", () => {
    const g = newGame();
    g.skills.gain("farming", LEVEL_XP[9]!);
    choose(g.skills, "farming", "tiller");
    choose(g.skills, "farming", "agriculturist");
    expect(growthRate(g.skills)).toBeGreaterThan(1);
    g.inventory.add(seedId("cauliflower"));
    till(g, 0, 0);
    plant(g, 0, 0, seedId("cauliflower"));
    for (let i = 0; i < 11; i++) {
      water(g, 0, 0);
      sleep(g, [], () => 0.99);
    }
    expect(harvest(g, 0, 0, () => 0.99).ok).toBe(true);
  });

  it("gatherers sometimes find two; botanists always find the top grade", () => {
    const spots = Array.from({ length: 8 }, (_, i) => ({ x: i, y: 3 }));
    const withForage = (skill: "gatherer" | "botanist") => {
      const g = newGame();
      g.skills.gain("foraging", LEVEL_XP[9]!);
      choose(g.skills, "foraging", "gatherer");
      if (skill === "botanist") choose(g.skills, "foraging", "botanist");
      g.forage.respawn("spring", spots, () => 0.99);
      const at = [...g.forage.each()][0]!;
      return { g, at };
    };
    const a = withForage("gatherer");
    forage(a.g, a.at.x, a.at.y, () => 0);
    expect(a.g.inventory.slot(0)!.count).toBe(2);

    const b = withForage("botanist");
    forage(b.g, b.at.x, b.at.y, () => 0.99);
    expect(b.g.inventory.slot(0)!.id).toMatch(/@hearthsilver$/);
  });

  it("offers the foraging level 10 pair under the level 5 pick", () => {
    const ids = (skills: Skills) =>
      optionsFor("foraging", skills).map((p) => p.id);
    const fresh = new Skills();
    expect(ids(fresh)).toEqual(["forester", "gatherer"]);
    const f = newGame();
    f.skills.gain("foraging", LEVEL_XP[9]!);
    choose(f.skills, "foraging", "forester");
    expect(pendingLevel(f.skills, "foraging")).toBe(10);
    expect(ids(f.skills)).toEqual(["lumberjack", "tapmaster"]);
    expect(choose(f.skills, "foraging", "botanist")).toBe(false);
    expect(choose(f.skills, "foraging", "tapmaster")).toBe(true);
    const g = newGame();
    g.skills.gain("foraging", LEVEL_XP[9]!);
    choose(g.skills, "foraging", "gatherer");
    expect(ids(g.skills)).toEqual(["botanist", "tracker"]);
    // Botanist is no longer open at level 5.
    const h = newGame();
    h.skills.gain("foraging", level5);
    choose(h.skills, "foraging", "gatherer");
    expect(pendingChoice(h.skills)).toBeUndefined();
  });

  it("foresters get a quarter more wood, tappers sell tapped goods for more", () => {
    const g = newGame();
    g.skills.gain("foraging", LEVEL_XP[9]!);
    choose(g.skills, "foraging", "forester");
    expect(woodYield(g.skills, 16)).toBe(20);
    expect(woodYield(newGame().skills, 16)).toBe(16);
    expect(sellMultiplier(g.skills, "maple-syrup")).toBe(1);
    choose(g.skills, "foraging", "tapmaster");
    expect(sellMultiplier(g.skills, "maple-syrup")).toBe(1.25);
    expect(sellMultiplier(g.skills, "maple-syrup@gold")).toBe(1.25);
    expect(sellMultiplier(g.skills, "parsnip")).toBe(1);
  });

  it("a Lumberjack's felled tree can hold a hardwood", () => {
    const g = newGame();
    g.skills.gain("foraging", LEVEL_XP[9]!);
    choose(g.skills, "foraging", "forester");
    choose(g.skills, "foraging", "lumberjack");
    expect(g.skills.has("lumberjack")).toBe(true);
    expect(LUMBERJACK_HARDWOOD_CHANCE).toBeGreaterThan(0);
  });

  it("an old save with a level 5 Botanist keeps it as a level 10 pick under Gatherer", () => {
    const g = newGame();
    const raw = JSON.parse(serialize(g));
    raw.professions = { foraging: "botanist" };
    raw.topProfessions = {};
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.skills.professionOf("foraging")).toBe("gatherer");
    expect(back.skills.topProfessionOf("foraging")).toBe("botanist");
    expect(back.skills.has("botanist")).toBe(true);
  });

  it("is saved", () => {
    const g = newGame();
    g.skills.gain("foraging", LEVEL_XP[9]!);
    choose(g.skills, "foraging", "gatherer");
    choose(g.skills, "foraging", "botanist");
    const back = deserialize(serialize(g))!;
    expect(back.skills.professionOf("foraging")).toBe("gatherer");
    expect(back.skills.topProfessionOf("foraging")).toBe("botanist");
    const raw = JSON.parse(serialize(g));
    raw.professions = { foraging: "tiller", farming: 7 };
    expect(
      deserialize(JSON.stringify(raw))!.skills.professionOf("foraging"),
    ).toBeUndefined();
  });
});

describe("mining level 10 professions", () => {
  const miner = (first: string, top?: string) => {
    const g = newGame();
    g.day.clock.day = 5;
    g.skills.gain("mining", LEVEL_XP[9]!);
    choose(g.skills, "mining", first);
    if (top) expect(choose(g.skills, "mining", top)).toBe(true);
    return g;
  };

  it("offers a pair under each level 5 pick, and only that pair", () => {
    const ids = (first: string) =>
      optionsFor("mining", miner(first).skills).map((p) => p.id);
    expect(ids("prospector")).toEqual(["barwright", "coalseeker"]);
    expect(ids("rockhound")).toEqual(["geodehunter", "gemcutter"]);
    const g = miner("prospector");
    expect(pendingLevel(g.skills, "mining")).toBe(10);
    expect(choose(g.skills, "mining", "gemcutter")).toBe(false);
    expect(choose(g.skills, "mining", "barwright")).toBe(true);
    expect(pendingChoice(g.skills)).toBeUndefined();
  });

  it("barwrights sell metal bars, Hearthsilver included, for 50% more", () => {
    const g = miner("prospector", "barwright");
    for (const id of ["copper-bar", "iron-bar", "gold-bar", "hearthsilver-bar"])
      expect(sellMultiplier(g.skills, id)).toBe(1.5);
    expect(sellMultiplier(g.skills, "iron-bar@gold")).toBe(1.5);
    expect(sellMultiplier(g.skills, "refined-crystal")).toBe(1);
    expect(sellMultiplier(g.skills, "copper-ore")).toBe(1);
    expect(sellMultiplier(g.skills, "river-garnet")).toBe(1);
    expect(sellMultiplier(miner("prospector").skills, "iron-bar")).toBe(1);
  });

  it("gemcutters sell gems and minerals for 30% more", () => {
    const g = miner("rockhound", "gemcutter");
    for (const id of ["river-garnet", "loam-crystal", "glimmerstone"])
      expect(sellMultiplier(g.skills, id)).toBe(1.3);
    expect(sellMultiplier(g.skills, "iron-bar")).toBe(1);
    expect(sellMultiplier(g.skills, "geode")).toBe(1);
    expect(sellMultiplier(g.skills, "parsnip")).toBe(1);
    expect(sellMultiplier(miner("rockhound").skills, "river-garnet")).toBe(1);
  });

  it("Coalseekers double coal from hard rock and find coal in plain rock", () => {
    const plain = miner("prospector");
    const g = miner("prospector", "coalseeker");
    expect(coalFactor(plain.skills)).toBe(1);
    expect(coalFactor(g.skills)).toBe(2);
    // 0.45 misses the 30% hard rock chance but meets the doubled 60%.
    expect(drops("hard", 1, false, () => 0.45, 1, 1).id).toBe("stone");
    expect(drops("hard", 1, false, () => 0.45, 1, 2).id).toBe("coal");
    // Capped at certain, never above.
    expect(drops("hard", 1, false, () => 0.99, 1, 10).id).toBe("coal");
    g.mines.visit(1, 5).rocks.add(2, 2, "stone");
    mine(g, 2, 2, 1, () => 0.05);
    mine(g, 2, 2, 1, () => 0.05);
    sweep(g);
    expect(g.inventory.count("coal")).toBe(1);
    const p = plain;
    p.mines.visit(1, 5).rocks.add(2, 2, "stone");
    mine(p, 2, 2, 1, () => 0.05);
    mine(p, 2, 2, 1, () => 0.05);
    sweep(p);
    expect(p.inventory.count("coal")).toBe(0);
  });

  it("Geode Hunters stack with Rockhound for four times the base, capped at 1", () => {
    const hound = miner("rockhound");
    const hunter = miner("rockhound", "geodehunter");
    expect(bonusGeodeChance(newGame().skills, 0.05)).toBe(0);
    expect(bonusGeodeChance(hound.skills, 0.05)).toBeCloseTo(0.05);
    expect(bonusGeodeChance(hunter.skills, 0.05)).toBeCloseTo(0.15);
    expect(bonusGeodeChance(hunter.skills, 0.5)).toBe(1);
    // 0.1 misses a Rockhound's 5% but meets a Hunter's 15% of extra geodes.
    for (const [g, want] of [
      [hound, 0],
      [hunter, 1],
    ] as const) {
      g.mines.visit(1, 5).rocks.add(2, 2, "stone");
      mine(g, 2, 2, 1, () => 0.1);
      mine(g, 2, 2, 1, () => 0.1);
      sweep(g);
      expect(g.inventory.count("geode")).toBe(want);
    }
  });
});
