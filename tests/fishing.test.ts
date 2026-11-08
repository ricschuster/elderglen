import { describe, expect, it } from "vitest";
import {
  FISH,
  CHEST,
  Fight,
  FishLog,
  RODS,
  barWidth,
  bite,
  castDistance,
  castEnergy,
  catchQuality,
  catchXp,
  distanceShare,
  fishAvailable,
  fishById,
  fishLength,
  landFish,
  landing,
  rodById,
  sizeRoll,
  timeSlot,
  waterAhead,
} from "../src/core/fishing";
import { deserialize, serialize } from "../src/core/save";
import { startGame } from "../src/core/toolbar";
import { itemById } from "../src/core/items";
import { FarmMap } from "../src/core/map";
import { maps } from "../src/content/maps";
import { COUNTERS } from "../src/core/completion";
import { buy } from "../src/core/shop";
import { pendingChoice } from "../src/core/professions";
import { Skills } from "../src/core/skills";

const reed = rodById("reed-pole")!;
const hazel = rodById("hazel-rod")!;
const fixed = (v: number) => () => v;

describe("fish data", () => {
  it("has unique ids and prices inside the bands of note 07", () => {
    expect(new Set(FISH.map((f) => f.id)).size).toBe(FISH.length);
    const band = { common: [40, 90], uncommon: [100, 200], rare: [250, 500] };
    for (const f of FISH) {
      const [lo, hi] = band[f.rarity] as [number, number];
      expect(f.sellPrice, f.id).toBeGreaterThanOrEqual(lo);
      expect(f.sellPrice, f.id).toBeLessThanOrEqual(hi);
      expect(f.length[0], f.id).toBeLessThan(f.length[1]);
      expect(itemById(f.id)?.sellPrice).toBe(f.sellPrice);
    }
  });

  it("gives the common fish a lower difficulty than the rare ones", () => {
    const top = (r: string) =>
      Math.max(...FISH.filter((f) => f.rarity === r).map((f) => f.difficulty));
    const low = (r: string) =>
      Math.min(...FISH.filter((f) => f.rarity === r).map((f) => f.difficulty));
    expect(top("common")).toBeLessThanOrEqual(40);
    expect(low("rare")).toBeGreaterThanOrEqual(55);
  });

  it("lists four rods, widening and reaching further", () => {
    expect(RODS.map((r) => r.price)).toEqual([50, 400, 1500, 4000]);
    for (let i = 1; i < RODS.length; i++) {
      expect(RODS[i]!.barWidth).toBeGreaterThan(RODS[i - 1]!.barWidth);
      expect(RODS[i]!.range).toBeGreaterThan(RODS[i - 1]!.range);
    }
  });
});

describe("the roster by season, time and weather", () => {
  const ids = (
    season: "spring" | "summer" | "fall" | "winter",
    minutes: number,
    raining = false,
  ) =>
    fishAvailable("river", { season, minutes, raining })
      .map((f) => f.id)
      .sort();

  it("buckets the day into dawn, day, dusk and night", () => {
    expect(timeSlot("spring", 6 * 60)).toBe("dawn");
    expect(timeSlot("spring", 12 * 60)).toBe("day");
    expect(timeSlot("spring", 18 * 60 + 30)).toBe("dusk");
    expect(timeSlot("spring", 21 * 60)).toBe("night");
    // Winter nightfall is earlier.
    expect(timeSlot("winter", 17 * 60)).toBe("dusk");
    expect(timeSlot("winter", 18 * 60)).toBe("night");
  });

  it("follows the season", () => {
    expect(ids("spring", 12 * 60)).toEqual(["brookslip", "reedling"]);
    expect(ids("summer", 12 * 60)).toEqual(["millrun", "reedling"]);
    expect(ids("fall", 12 * 60)).toContain("salmon");
    expect(ids("winter", 12 * 60)).toEqual(["reedling"]);
  });

  it("follows the time of day", () => {
    expect(ids("spring", 6.5 * 60)).toEqual(["silverthread"]);
    expect(ids("spring", 19 * 60)).toContain("hearthside-dace");
    expect(ids("winter", 20 * 60)).toEqual(["tallow-eel"]);
  });

  it("gives rain fish only in rain", () => {
    expect(ids("fall", 12 * 60)).not.toContain("old-mossback");
    expect(ids("fall", 12 * 60, true)).toContain("old-mossback");
    expect(ids("spring", 12 * 60, true)).not.toContain("old-mossback");
  });
});

describe("what bites", () => {
  const fall = { season: "fall", minutes: 12 * 60, raining: false } as const;

  it("bites nothing when no fish is in season", () => {
    const night = {
      season: "spring",
      minutes: 22 * 60,
      raining: false,
    } as const;
    expect(bite("river", night, fixed(0)).kind).toBe("none");
  });

  it("hooks an uncommon fish", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const b = bite("river", fall, fixed(i / 40));
      if (b.kind === "fish") seen.add(b.fish.rarity);
    }
    expect(seen.has("uncommon")).toBe(true);
  });

  it("hooks a rare fish at any level when the conditions allow", () => {
    const dawn = {
      season: "spring",
      minutes: 6.5 * 60,
      raining: false,
    } as const;
    const b = bite("river", dawn, fixed(0));
    expect(b.kind === "fish" && b.fish.id).toBe("silverthread");
  });

  it("makes the first catch a common fish, even when none is in season", () => {
    const night = {
      season: "winter",
      minutes: 22 * 60,
      raining: false,
    } as const;
    const b = bite("river", night, fixed(0), true);
    expect(b.kind === "fish" && b.fish.rarity).toBe("common");
    const dawn = {
      season: "spring",
      minutes: 6.5 * 60,
      raining: false,
    } as const;
    const c = bite("river", dawn, fixed(0), true);
    expect(c.kind === "fish" && c.fish.rarity).toBe("common");
  });

  it("weights common fish over uncommon ones", () => {
    let common = 0;
    for (let i = 0; i < 100; i++) {
      const b = bite("river", fall, fixed(i / 100));
      if (b.kind === "fish" && b.fish.rarity === "common") common++;
    }
    expect(common).toBeGreaterThan(30);
    expect(common).toBeLessThan(70);
  });
});

describe("the cast", () => {
  const map = {
    isWater: (x: number, y: number) => y === 0 && x >= 3 && x <= 6,
  };

  it("finds the water along a line", () => {
    expect(waterAhead(map, 0, 0, 1, 0, 8)).toEqual([3, 4, 5, 6]);
    expect(waterAhead(map, 0, 0, 1, 0, 4)).toEqual([3, 4]);
    expect(waterAhead(map, 0, 0, 0, 1, 8)).toEqual([]);
  });

  it("maps a charge to a distance within the rod's range", () => {
    expect(castDistance(0, 6)).toBe(1);
    expect(castDistance(1, 6)).toBe(6);
    expect(castDistance(2, 6)).toBe(6);
    expect(castDistance(0.5, 5)).toBe(3);
  });

  it("lands on water, misses dry ground and fixes the middle with assist", () => {
    const water = [3, 4, 5, 6];
    expect(landing(water, 6, 0.4, 0)).toBe(3);
    expect(landing(water, 6, 0, 0)).toBeUndefined();
    expect(landing(water, 6, 0, 1)).toBe(4);
    expect(landing([], 6, 1, 1)).toBeUndefined();
  });

  it("scores a farther cast higher", () => {
    expect(distanceShare(1, 6)).toBe(0);
    expect(distanceShare(6, 6)).toBe(1);
    expect(distanceShare(4, 6)).toBeCloseTo(0.6);
  });

  it("keeps the water when a door moves", () => {
    const map = maps.get("farm");
    const exit = map.exits[0]!;
    const moved = map.withDoor(exit.id, map.entries[0]!.name, { x: 5, y: 5 });
    expect(moved.isWater(30, 5)).toBe(true);
  });

  it("finds water on both farm maps", () => {
    for (const id of ["farm", "farm-woodland"]) {
      const map = maps.get(id);
      expect(map instanceof FarmMap).toBe(true);
      let n = 0;
      for (let y = 0; y < map.height; y++)
        for (let x = 0; x < map.width; x++) if (map.isWater(x, y)) n++;
      expect(n, id).toBeGreaterThan(8);
      expect(map.isWater(-1, 0)).toBe(false);
    }
  });
});

describe("the bar", () => {
  const setup = (over = {}) => ({
    behaviour: "mixed" as const,
    difficulty: 30,
    width: 0.3,
    assist: 0 as const,
    ...over,
  });

  it("widens with the rod and with assist", () => {
    expect(barWidth(reed, 0)).toBeCloseTo(0.3);
    expect(barWidth(reed, 1)).toBeCloseTo(0.39);
    expect(barWidth(hazel, 0)).toBeGreaterThan(barWidth(reed, 0));
  });

  it("starts with the fish in the bar", () => {
    const f = new Fight(setup(), fixed(0.5));
    expect(f.inZone).toBe(true);
    expect(f.progress).toBeCloseTo(0.3);
    expect(f.state).toBe("playing");
  });

  it("catches a fish that stays in the bar and calls it perfect", () => {
    // A still fish: difficulty 0, smooth, and a bar wide enough to cover it.
    const f = new Fight(
      setup({ behaviour: "smooth", difficulty: 0, width: 0.9 }),
      fixed(0.5),
    );
    for (let i = 0; i < 2000 && f.state === "playing"; i++)
      f.step(0.02, i % 2 === 0, fixed(0.5));
    expect(f.state).toBe("caught");
    expect(f.perfect).toBe(true);
  });

  it("shows a chest 1 to 3 seconds in and fetches it with the bar, keeping a perfect catch", () => {
    // random 0 puts the chest at the bottom, appearing after 1 second. A wide bar covers it and the still fish.
    const f = new Fight(
      setup({ behaviour: "smooth", difficulty: 0, width: 0.9, chest: true }),
      fixed(0),
    );
    expect(f.chestShown).toBe(false);
    for (let i = 0; i < 40; i++) f.step(0.02, false, fixed(0));
    expect(f.chestShown).toBe(false);
    f.step(0.3, false, fixed(0));
    expect(f.chestShown).toBe(true);
    for (let i = 0; i < 400 && !f.chestGot; i++) f.step(0.02, false, fixed(0));
    expect(f.chestGot).toBe(true);
    expect(f.chestShown).toBe(false);
    expect(f.perfect).toBe(true);
  });

  it("loses fetch progress when the bar leaves the chest, and has no chest unless asked", () => {
    const f = new Fight(
      setup({ behaviour: "smooth", difficulty: 0, width: 0.3, chest: true }),
      fixed(1),
    );
    expect(f.chestAt).toBeCloseTo(1 - CHEST.size / 2);
    for (let i = 0; i < 400; i++) f.step(0.02, false, fixed(1));
    expect(f.chestGot).toBe(false);
    expect(f.chestProgress).toBe(0);
    expect(new Fight(setup(), fixed(0)).chestAt).toBeUndefined();
  });

  it("lets the fish get away when the bar never follows it", () => {
    // The bar falls to the bottom; the fish darts up and stays there.
    const f = new Fight(
      setup({ behaviour: "floater", difficulty: 100 }),
      fixed(1),
    );
    for (let i = 0; i < 4000 && f.state === "playing"; i++)
      f.step(0.02, false, fixed(1));
    expect(f.state).toBe("lost");
    expect(f.perfect).toBe(false);
  });

  it("never drains in the tutorial", () => {
    const f = new Fight(
      setup({ behaviour: "floater", difficulty: 100, tutorial: true }),
      fixed(1),
    );
    for (let i = 0; i < 4000; i++) f.step(0.02, false, fixed(1));
    expect(f.state).not.toBe("lost");
    expect(f.progress).toBeGreaterThanOrEqual(0.3);
  });

  it("lifts the bar when held and drops it when released", () => {
    const f = new Fight(setup(), fixed(0.5));
    for (let i = 0; i < 20; i++) f.step(0.02, true, fixed(0.5));
    const up = f.barPos;
    expect(up).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) f.step(0.02, false, fixed(0.5));
    expect(f.barPos).toBeLessThan(up);
    expect(f.barPos).toBeGreaterThanOrEqual(0);
    expect(f.barPos).toBeLessThanOrEqual(0.7);
  });

  it("calms the fish and softens the drain with assist", () => {
    const loss = (assist: 0 | 1) => {
      const f = new Fight(
        setup({ behaviour: "smooth", difficulty: 0, width: 0.05, assist }),
        fixed(0.5),
      );
      // Move the bar away from the fish for one second.
      for (let i = 0; i < 50; i++) f.step(0.02, true, fixed(0.5));
      return 0.3 - f.progress;
    };
    expect(loss(1)).toBeLessThan(loss(0));
  });
});

describe("quality, length and XP", () => {
  it("rolls the size from level and distance, as in the note", () => {
    expect(sizeRoll(0, 0, fixed(1))).toBeCloseTo(0.5);
    expect(sizeRoll(10, 1, fixed(1))).toBeCloseTo(1.1);
    expect(sizeRoll(0, 0, fixed(1))).toBeLessThan(0.67);
  });

  it("cuts the grades at a third and two thirds, and lifts silver on a perfect catch", () => {
    expect(catchQuality(0.2, false)).toBe("normal");
    expect(catchQuality(0.4, false)).toBe("silver");
    expect(catchQuality(0.7, false)).toBe("gold");
    expect(catchQuality(0.4, true)).toBe("gold");
    expect(catchQuality(0.2, true)).toBe("normal");
    expect(catchQuality(0.9, true)).toBe("gold");
  });

  it("never gives gold at level 0 without a perfect catch", () => {
    for (let r = 0; r <= 1; r += 0.05)
      expect(catchQuality(sizeRoll(0, 0, fixed(r)), false)).not.toBe("gold");
  });

  it("gives gold about 43 percent of the time at level 10 and full distance", () => {
    let gold = 0;
    for (let i = 0; i < 1000; i++)
      if (catchQuality(sizeRoll(10, 1, fixed(i / 1000)), false) === "gold")
        gold++;
    expect(gold / 1000).toBeGreaterThan(0.38);
    expect(gold / 1000).toBeLessThan(0.48);
  });

  it("keeps a fish's length inside its range", () => {
    const f = fishById("salmon")!;
    expect(fishLength(f, 0, 0)).toBe(f.length[0]);
    expect(fishLength(f, 9, 0)).toBe(f.length[1]);
    const mid = fishLength(f, 0.3, 0);
    expect(mid).toBeGreaterThan(f.length[0]);
    expect(mid).toBeLessThan(f.length[1]);
  });

  it("gives the harvest XP formula, one and a half times for a perfect catch", () => {
    const f = fishById("salmon")!;
    expect(catchXp(f, false)).toBe(Math.floor(16 * Math.log(0.018 * 150 + 1)));
    expect(catchXp(f, true)).toBe(Math.floor(catchXp(f, false) * 1.5));
  });
});

describe("landing a fish", () => {
  it("adds the fish to the backpack, logs it and gives XP", () => {
    const g = startGame();
    const f = fishById("reedling")!;
    const r = landFish(g, f, {
      perfect: false,
      distance: 0,
      random: fixed(0.1),
      at: { x: 1, y: 1 },
    });
    expect(g.inventory.count("reedling")).toBe(1);
    expect(r.first).toBe(true);
    expect(g.fishing.total).toBe(1);
    expect(g.skills.xpOf("fishing")).toBe(r.xp);
    const again = landFish(g, f, {
      perfect: true,
      distance: 1,
      random: fixed(0.99),
      at: { x: 1, y: 1 },
    });
    expect(again.first).toBe(false);
    expect(again.quality).not.toBe("normal");
    expect(g.inventory.count(`reedling@${again.quality}`)).toBe(1);
  });

  it("drops the fish at the player's feet when the pack is full", () => {
    const g = startGame();
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk${i}`);
    const r = landFish(g, fishById("reedling")!, {
      perfect: false,
      distance: 0,
      random: fixed(0),
      at: { x: 4, y: 5 },
    });
    expect(r.dropped).toBe(true);
    expect(g.ground.at(4, 5)[0]?.id).toBe("reedling");
  });

  it("levels the fishing skill", () => {
    const g = startGame();
    const f = fishById("silverthread")!;
    let up: number | undefined;
    for (let i = 0; i < 40 && up === undefined; i++)
      up = landFish(g, f, {
        perfect: true,
        distance: 0,
        random: fixed(0),
        at: { x: 0, y: 0 },
      }).levelUp;
    expect(up).toBe(1);
    expect(g.skills.level("fishing")).toBeGreaterThanOrEqual(1);
  });
});

describe("the fish log", () => {
  it("notes firsts and records", () => {
    const log = new FishLog();
    expect(log.note("reedling", 20)).toEqual({ first: true, record: false });
    expect(log.note("reedling", 18)).toEqual({ first: false, record: false });
    expect(log.note("reedling", 25)).toEqual({ first: false, record: true });
    expect(log.record("reedling")).toEqual({ count: 3, longest: 25 });
    expect(log.kinds).toBe(1);
  });

  it("round trips and drops bad entries", () => {
    const log = new FishLog();
    log.note("salmon", 50);
    const copy = new FishLog();
    copy.load(JSON.parse(JSON.stringify(log.save())));
    expect(copy.record("salmon")).toEqual({ count: 1, longest: 50 });
    const bad = new FishLog();
    bad.load({
      caught: {
        nofish: { count: 1, longest: 1 },
        salmon: { count: -1, longest: 1 },
        reedling: "x",
      },
    });
    expect(bad.kinds).toBe(0);
    bad.load(undefined);
    expect(bad.total).toBe(0);
  });
});

describe("saving, skills and the rest of the game", () => {
  it("saves and loads the fish log and fishing XP", () => {
    const g = startGame();
    landFish(g, fishById("salmon")!, {
      perfect: false,
      distance: 0,
      random: fixed(0.5),
      at: { x: 0, y: 0 },
    });
    const back = deserialize(serialize(g))!;
    expect(back.fishing.has("salmon")).toBe(true);
    expect(back.skills.xpOf("fishing")).toBe(g.skills.xpOf("fishing"));
  });

  it("loads a save from before fishing with no fishing row or log", () => {
    const raw = JSON.parse(serialize(startGame()));
    delete raw.skills.fishing;
    delete raw.fishing;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back).toBeDefined();
    expect(back.skills.level("fishing")).toBe(0);
    expect(back.fishing.total).toBe(0);
  });

  it("starts fishing at level 0 and counts it in the skill list", () => {
    const s = new Skills();
    expect(s.skills).toContain("fishing");
    expect(s.level("fishing")).toBe(0);
  });

  it("asks for no profession at fishing level 5 until some exist", () => {
    const s = new Skills();
    s.gain("fishing", 2150);
    expect(s.level("fishing")).toBe(5);
    expect(pendingChoice(s)).toBeUndefined();
  });

  it("counts fish in the completion tracker", () => {
    const g = startGame();
    expect(COUNTERS.fish!(g)).toMatchObject({ done: 0, total: FISH.length });
    g.fishing.note("reedling", 20);
    const c = COUNTERS.fish!(g);
    expect(c.done).toBe(1);
    expect(c.missing).not.toContain("Reedling");
  });

  it("sells rods in the shop, and the fish sell for more at higher quality", () => {
    const g = startGame();
    g.money = 100;
    expect(buy(g.inventory, g, "reed-pole")).toBe(true);
    expect(g.money).toBe(50);
    expect(buy(g.inventory, g, "hazel-rod")).toBe(false);
    expect(itemById("reed-pole")?.keep).toBe(true);
    expect(itemById("salmon@gold")?.sellPrice).toBeGreaterThan(
      itemById("salmon")!.sellPrice,
    );
  });
});

describe("cast energy", () => {
  it("falls 0.1 per level from 8 to 7", () => {
    expect(castEnergy(0)).toBe(8);
    expect(castEnergy(5)).toBe(7.5);
    expect(castEnergy(10)).toBe(7);
    expect(castEnergy(15)).toBe(7);
    expect(castEnergy(-1)).toBe(8);
  });

  it("is spent with the 20 minute cast", () => {
    const g = startGame();
    const before = g.day.energy.current;
    g.day.act(castEnergy(0), 20);
    expect(g.day.energy.current).toBe(before - 8);
  });
});
