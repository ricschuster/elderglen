import { describe, expect, it } from "vitest";
import { startGame } from "../src/core/toolbar";
import { bite } from "../src/core/fishing";
import {
  choose,
  optionsFor,
  pendingChoice,
  pendingLevel,
  potPrice,
  sellMultiplier,
  treasureChance,
} from "../src/core/professions";
import { landLobster, Pots, rollCatch } from "../src/core/pots";
import { deserialize, serialize } from "../src/core/save";
import { buy } from "../src/core/shop";
import { LEVEL_XP } from "../src/core/skills";
import { TREASURE_CHANCE } from "../src/core/tackle";

const lvl5 = LEVEL_XP[4]!;
const lvl10 = LEVEL_XP[9]!;
const day = { season: "summer", minutes: 600, raining: false } as const;

describe("fishing professions", () => {
  it("offers Fisher or Trapper at level 5, then the pair under the pick at level 10", () => {
    const g = startGame();
    g.skills.gain("fishing", lvl5);
    expect(pendingChoice(g.skills)).toBe("fishing");
    expect(pendingLevel(g.skills, "fishing")).toBe(5);
    expect(optionsFor("fishing", g.skills).map((p) => p.id)).toEqual([
      "fisher",
      "trapper",
    ]);
    expect(choose(g.skills, "fishing", "angler")).toBe(false);
    expect(choose(g.skills, "fishing", "trapper")).toBe(true);
    expect(pendingChoice(g.skills)).toBeUndefined();
    g.skills.gain("fishing", lvl10);
    expect(pendingLevel(g.skills, "fishing")).toBe(10);
    expect(optionsFor("fishing", g.skills).map((p) => p.id)).toEqual([
      "mariner",
      "luremaster",
    ]);
    expect(choose(g.skills, "fishing", "pirate")).toBe(false);
    expect(choose(g.skills, "fishing", "mariner")).toBe(true);
    expect(pendingChoice(g.skills)).toBeUndefined();
    expect(g.skills.has("mariner")).toBe(true);
    expect(g.skills.has("trapper")).toBe(true);
  });

  it("asks nothing at level 10 for skills with no level 10 options", () => {
    const g = startGame();
    g.skills.gain("mining", lvl10);
    choose(g.skills, "mining", "prospector");
    expect(pendingChoice(g.skills)).toBeUndefined();
  });

  it("Fisher and Angler raise fish prices, not shellfish", () => {
    const g = startGame();
    g.skills.setProfession("fishing", "fisher");
    expect(sellMultiplier(g.skills, "silverthread@gold")).toBe(1.25);
    expect(sellMultiplier(g.skills, "crayfish")).toBe(1);
    g.skills.setTopProfession("fishing", "angler");
    expect(sellMultiplier(g.skills, "silverthread")).toBe(1.5);
  });

  it("Trapper halves the pot price at the counter", () => {
    const g = startGame();
    g.money = 1000;
    g.skills.setProfession("fishing", "trapper");
    expect(potPrice(g.skills, 150)).toBe(75);
    expect(buy(g.inventory, g, "shellfish-pot", 1, 75)).toBe(true);
    expect(g.money).toBe(925);
  });

  it("Pirate doubles the treasure chance", () => {
    const g = startGame();
    expect(treasureChance(g.skills, TREASURE_CHANCE)).toBe(0.2);
    g.skills.setProfession("fishing", "fisher");
    g.skills.setTopProfession("fishing", "pirate");
    expect(treasureChance(g.skills, TREASURE_CHANCE)).toBeCloseTo(0.4);
  });

  it("Mariner pots never give junk, Luremaster pots need no bait", () => {
    for (let i = 0; i < 20; i++)
      expect(rollCatch("fresh", "plain-bait", () => i / 20, true)).not.toMatch(
        /boot|jar|line|rope|spoon/,
      );
    const pots = new Pots();
    pots.add("farm", 1, 1, "fresh");
    pots.endDay(() => 0.9);
    expect(pots.get("farm", 1, 1)?.catch).toBeUndefined();
    pots.endDay(() => 0.9, { noBait: true });
    expect(pots.get("farm", 1, 1)?.catch).toBeDefined();
  });

  it("saves and loads both picks, dropping a mismatched level 10 pick", () => {
    const g = startGame();
    g.skills.setProfession("fishing", "fisher");
    g.skills.setTopProfession("fishing", "pirate");
    const back = deserialize(serialize(g))!;
    expect(back.skills.topProfessionOf("fishing")).toBe("pirate");
    g.skills.setTopProfession("fishing", "mariner");
    expect(
      deserialize(serialize(g))!.skills.topProfessionOf("fishing"),
    ).toBeUndefined();
  });
});

describe("the Pearl Lobster on the rod", () => {
  it("bites in the sea about 3 in 100, never in rivers or on the first cast", () => {
    expect(bite("sea", day, () => 0.01).kind).toBe("lobster");
    expect(bite("sea", day, () => 0.5).kind).not.toBe("lobster");
    expect(bite("river", day, () => 0.01).kind).not.toBe("lobster");
    expect(bite("sea", day, () => 0.01, true).kind).not.toBe("lobster");
  });

  it("lands without a fight, counts as a shellfish and gives XP", () => {
    const g = startGame();
    const r = landLobster(g, { x: 0, y: 0 }, 0.5, () => 0.5);
    expect(r.dropped).toBe(false);
    expect(g.pots.countOf("pearl-lobster")).toBe(1);
    expect(g.skills.xpOf("fishing")).toBeGreaterThan(0);
    expect(
      g.inventory.count("pearl-lobster") +
        g.inventory.count("pearl-lobster@silver") +
        g.inventory.count("pearl-lobster@gold"),
    ).toBe(1);
  });
});
