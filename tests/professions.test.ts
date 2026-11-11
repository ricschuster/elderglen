import { describe, expect, it } from "vitest";
import { forage, harvest, plant, till, water } from "../src/core/actions";
import {
  choose,
  growthRate,
  pendingChoice,
  sellMultiplier,
} from "../src/core/professions";
import { seedId } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sell } from "../src/core/shop";
import { sleep } from "../src/core/sleep";
import { LEVEL_XP } from "../src/core/skills";

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

  it("gatherers sometimes find two; botanists never find plain forage", () => {
    const spots = Array.from({ length: 8 }, (_, i) => ({ x: i, y: 3 }));
    const withForage = (skill: "gatherer" | "botanist") => {
      const g = newGame();
      g.skills.gain("foraging", level5);
      choose(g.skills, "foraging", skill);
      g.forage.respawn("spring", spots, () => 0.99);
      const at = [...g.forage.each()][0]!;
      return { g, at };
    };
    const a = withForage("gatherer");
    forage(a.g, a.at.x, a.at.y, () => 0);
    expect(a.g.inventory.slot(0)!.count).toBe(2);

    const b = withForage("botanist");
    forage(b.g, b.at.x, b.at.y, () => 0.99);
    expect(b.g.inventory.slot(0)!.id).toMatch(/@silver$/);
  });

  it("is saved", () => {
    const g = newGame();
    g.skills.gain("foraging", level5);
    choose(g.skills, "foraging", "botanist");
    const back = deserialize(serialize(g))!;
    expect(back.skills.professionOf("foraging")).toBe("botanist");
    const raw = JSON.parse(serialize(g));
    raw.professions = { foraging: "tiller", farming: 7 };
    expect(
      deserialize(JSON.stringify(raw))!.skills.professionOf("foraging"),
    ).toBeUndefined();
  });
});
