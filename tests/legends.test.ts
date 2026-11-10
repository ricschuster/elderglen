import { describe, expect, it } from "vitest";
import { BUNDLES } from "../src/core/bundles";
import { ringProgress } from "../src/core/completion";
import { ACHIEVEMENTS, checkAchievements } from "../src/core/achievements";
import {
  FISH,
  Fight,
  LEGEND_ROD,
  bite,
  fishAvailable,
  fishById,
  landFish,
  legendFlag,
  legendGates,
  type Conditions,
  type Water,
} from "../src/core/fishing";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import { hasFlag } from "../src/core/worldflags";

const LEGENDS = FISH.filter((f) => f.rarity === "legend");
const open = (c: Partial<Conditions>): Conditions => ({
  season: "spring",
  minutes: 12 * 60,
  raining: false,
  rod: LEGEND_ROD,
  waterRoomDone: true,
  ...c,
});
const ids = (w: Water, c: Conditions) => fishAvailable(w, c).map((f) => f.id);

describe("the five legends (note 21)", () => {
  it("are five, each in its own water, priced 3000 to 4000g and as hard as 85 to 100", () => {
    expect(LEGENDS.map((f) => f.id).sort()).toEqual(
      [
        "grandmother-hush",
        "great-hearthfin",
        "hearthwell-carp",
        "moonlit-mother",
        "valley-king",
      ].sort(),
    );
    expect(new Set(LEGENDS.map((f) => f.water)).size).toBe(5);
    for (const f of LEGENDS) {
      expect(f.sellPrice).toBeGreaterThanOrEqual(3000);
      expect(f.sellPrice).toBeLessThanOrEqual(4000);
      expect(f.difficulty).toBeGreaterThanOrEqual(85);
      expect(itemById(f.id)?.sellPrice).toBe(f.sellPrice);
    }
    expect(fishById("hearthwell-carp")?.behaviour).toBe("smooth");
    expect(fishById("great-hearthfin")?.behaviour).toBe("floater");
  });

  it("are in no bundle", () => {
    const set = new Set(LEGENDS.map((f) => f.id));
    for (const b of BUNDLES)
      for (const i of b.items) expect(set.has(i.id)).toBe(false);
  });

  it("follow the season, time and weather columns", () => {
    const m = (h: number) => h * 60;
    expect(
      ids("cove", open({ season: "fall", minutes: m(18), raining: true })),
    ).toContain("hearthwell-carp");
    expect(
      ids("cove", open({ season: "fall", minutes: m(18), raining: false })),
    ).not.toContain("hearthwell-carp");
    expect(
      ids("cove", open({ season: "spring", minutes: m(18), raining: true })),
    ).not.toContain("hearthwell-carp");
    expect(
      ids("forest-lake", open({ minutes: m(18), raining: true })),
    ).toContain("grandmother-hush");
    expect(
      ids("river", open({ season: "fall", minutes: m(6), raining: true })),
    ).toContain("valley-king");
    expect(
      ids("mountain-lake", open({ season: "winter", minutes: m(23) })),
    ).toContain("moonlit-mother");
    expect(
      ids(
        "mountain-lake",
        open({ season: "winter", minutes: m(23), raining: true }),
      ),
    ).not.toContain("moonlit-mother");
    // The easy legend: summer day, any weather.
    for (const raining of [false, true])
      expect(
        ids("sea", open({ season: "summer", minutes: m(12), raining })),
      ).toContain("great-hearthfin");
  });

  it("need the Hearthwell Rod and a finished Water room", () => {
    const sea = open({ season: "summer" });
    expect(ids("sea", sea)).toContain("great-hearthfin");
    expect(ids("sea", { ...sea, rod: "heron-rod" })).not.toContain(
      "great-hearthfin",
    );
    expect(ids("sea", { ...sea, rod: undefined })).not.toContain(
      "great-hearthfin",
    );
    expect(ids("sea", { ...sea, waterRoomDone: false })).not.toContain(
      "great-hearthfin",
    );
  });

  it("never bite on the tutorial cast", () => {
    const sea = open({ season: "summer" });
    for (let i = 0; i < 50; i++) {
      const b = bite("sea", sea, Math.random, true);
      expect(b.kind === "fish" && b.fish.rarity).not.toBe("legend");
    }
  });

  it("can bite when everything is met, and are a lucky bite", () => {
    const sea = open({ season: "summer" });
    let hits = 0;
    for (let i = 0; i < 400; i++) {
      const b = bite("sea", sea, () => Math.random());
      if (b.kind === "fish" && b.fish.id === "great-hearthfin") hits++;
    }
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(200);
  });
});

describe("catching a legend once a year", () => {
  it("raises a flag for the year and the legend cannot bite again that year", () => {
    const g = newGame();
    const f = fishById("great-hearthfin")!;
    landFish(g, f, {
      perfect: false,
      distance: 0,
      random: () => 0.5,
      at: { x: 1, y: 1 },
    });
    expect(g.inventory.count(f.id) + g.inventory.count(`${f.id}@silver`)).toBe(
      1,
    );
    expect(hasFlag(g, legendFlag(f.id, g.day.clock.day))).toBe(true);
    const gates = legendGates(g, LEGEND_ROD);
    expect(gates.legendsTaken).toEqual([f.id]);
    expect(
      ids("sea", { ...open({ season: "summer" }), ...gates }),
    ).not.toContain(f.id);
    // Next year it bites again.
    g.day.clock.day += 112;
    expect(legendGates(g, LEGEND_ROD).legendsTaken).toEqual([]);
  });

  it("reads the Water room from the hall", () => {
    const g = newGame();
    expect(legendGates(g, LEGEND_ROD).waterRoomDone).toBe(false);
  });
});

describe("the crown and the tracker", () => {
  it("carries the crown into the fight setup", () => {
    const f = new Fight(
      {
        behaviour: "smooth",
        difficulty: 95,
        width: 0.5,
        assist: 0,
        legend: true,
      },
      Math.random,
    );
    expect(f.setup.legend).toBe(true);
  });

  it("counts the legends in the completion total and the Whole Roster", () => {
    const g = newGame();
    const total = () => ringProgress(g).reduce((n, r) => n + r.exact, 0);
    const before = total();
    for (const l of LEGENDS) g.fishing.note(l.id, 100);
    expect(total()).toBeGreaterThan(before);
    expect(ACHIEVEMENTS.find((a) => a.id === "whole-roster")?.threshold).toBe(
      52,
    );
    for (const f of FISH) g.fishing.note(f.id, 10);
    expect(checkAchievements(g).map((a) => a.id)).not.toContain("whole-roster");
  });
});
