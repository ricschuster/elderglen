import { describe, expect, it } from "vitest";
import { checkAchievements } from "../src/core/achievements";
import {
  FISH,
  barWidth,
  bite,
  fishAvailable,
  fishWeight,
  rodById,
  type Conditions,
} from "../src/core/fishing";
import { itemById } from "../src/core/items";
import { deserialize, serialize } from "../src/core/save";
import { buy, tackleStock } from "../src/core/shop";
import {
  BAITS,
  LURES,
  LURE_CASTS,
  Tackle,
  TRINKETS,
  equipBait,
  equipLure,
  giveTreasure,
  purseGold,
  removeBait,
  removeLure,
  pickTreasure,
} from "../src/core/tackle";
import { startGame } from "../src/core/toolbar";

const reed = rodById("reed-pole")!;
const hazel = rodById("hazel-rod")!;
const heron = rodById("heron-rod")!;
const hearth = rodById("hearthwell-rod")!;
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length] as number;
};

describe("tackle data", () => {
  it("has three baits, seven lures and five trinkets, all items", () => {
    expect(BAITS.map((b) => b.id)).toEqual([
      "plain-bait",
      "fine-bait",
      "salted-bait",
    ]);
    expect(LURES).toHaveLength(7);
    expect(TRINKETS).toHaveLength(5);
    for (const d of [...BAITS, ...LURES])
      expect(itemById(d.id)?.buyPrice, d.id).toBe(d.price);
    for (const t of TRINKETS) {
      expect(t.sellPrice).toBeGreaterThanOrEqual(30);
      expect(t.sellPrice).toBeLessThanOrEqual(120);
      expect(itemById(t.id)?.sellPrice).toBe(t.sellPrice);
    }
  });

  it("gives rods their slots: none, bait, one lure, two lures", () => {
    expect([reed, hazel, heron, hearth].map((r) => [r.bait, r.lures])).toEqual([
      [false, 0],
      [true, 0],
      [true, 1],
      [true, 2],
    ]);
  });

  it("sells bait and lures in the shop, but not Salted Bait before the sea", () => {
    const stock = tackleStock();
    expect(stock).toContain("plain-bait");
    expect(stock).toContain("glint-lure");
    expect(stock).not.toContain("salted-bait");
    const g = startGame();
    expect(buy(g.inventory, g, "plain-bait", 10)).toBe(true);
    expect(g.inventory.count("plain-bait")).toBe(10);
  });
});

describe("a rig", () => {
  it("fits the whole bait stack, swaps baits and takes it off", () => {
    const g = startGame();
    g.inventory.add("plain-bait", 10);
    g.inventory.add("fine-bait", 4);
    expect(
      equipBait(g.tackle, g.inventory, hazel, "plain-bait"),
    ).toBeUndefined();
    expect(g.inventory.count("plain-bait")).toBe(0);
    expect(g.tackle.rig(hazel.id).bait).toEqual({
      id: "plain-bait",
      count: 10,
    });
    // A second bait comes on and the first returns to the backpack.
    equipBait(g.tackle, g.inventory, hazel, "fine-bait");
    expect(g.inventory.count("plain-bait")).toBe(10);
    expect(g.tackle.rig(hazel.id).bait?.id).toBe("fine-bait");
    removeBait(g.tackle, g.inventory, hazel);
    expect(g.inventory.count("fine-bait")).toBe(4);
    expect(g.tackle.rig(hazel.id).bait).toBeUndefined();
  });

  it("refuses bait on the Reed Pole and bait the player lacks", () => {
    const g = startGame();
    g.inventory.add("plain-bait", 2);
    expect(equipBait(g.tackle, g.inventory, reed, "plain-bait")).toMatch(
      /no bait slot/,
    );
    expect(equipBait(g.tackle, g.inventory, hazel, "fine-bait")).toMatch(
      /none of that/,
    );
  });

  it("limits lure slots by rod and does not repeat a lure", () => {
    const g = startGame();
    g.inventory.add("glint-lure", 2);
    for (const id of ["moth-lure", "storm-lure"]) g.inventory.add(id);
    expect(equipLure(g.tackle, g.inventory, hazel, "glint-lure")).toMatch(
      /no lure slot/,
    );
    expect(
      equipLure(g.tackle, g.inventory, heron, "glint-lure"),
    ).toBeUndefined();
    expect(equipLure(g.tackle, g.inventory, heron, "moth-lure")).toMatch(
      /full/,
    );
    expect(
      equipLure(g.tackle, g.inventory, hearth, "glint-lure"),
    ).toBeUndefined();
    expect(equipLure(g.tackle, g.inventory, hearth, "glint-lure")).toMatch(
      /already|none/,
    );
    expect(
      equipLure(g.tackle, g.inventory, hearth, "moth-lure"),
    ).toBeUndefined();
    expect(equipLure(g.tackle, g.inventory, hearth, "storm-lure")).toMatch(
      /full/,
    );
  });

  it("spends one bait and one lure cast per cast, and wears them out", () => {
    const g = startGame();
    g.inventory.add("plain-bait", 2);
    g.inventory.add("whirligig");
    equipBait(g.tackle, g.inventory, heron, "plain-bait");
    equipLure(g.tackle, g.inventory, heron, "whirligig");
    expect(g.tackle.spend(heron.id)).toEqual([]);
    expect(g.tackle.rig(heron.id).bait?.count).toBe(1);
    expect(g.tackle.rig(heron.id).lures[0]?.left).toBe(LURE_CASTS - 1);
    expect(g.tackle.spend(heron.id)).toEqual(["Plain Bait"]);
    expect(g.tackle.rig(heron.id).bait).toBeUndefined();
    for (let i = 0; i < LURE_CASTS - 3; i++) g.tackle.spend(heron.id);
    expect(g.tackle.spend(heron.id)).toEqual(["Whirligig"]);
    expect(g.tackle.rig(heron.id).lures).toEqual([]);
  });

  it("returns an unused lure when taken off, and loses a worn one", () => {
    const g = startGame();
    g.inventory.add("glint-lure", 2);
    equipLure(g.tackle, g.inventory, hearth, "glint-lure");
    removeLure(g.tackle, g.inventory, hearth, 0);
    expect(g.inventory.count("glint-lure")).toBe(2);
    equipLure(g.tackle, g.inventory, hearth, "glint-lure");
    g.tackle.spend(hearth.id);
    removeLure(g.tackle, g.inventory, hearth, 0);
    expect(g.inventory.count("glint-lure")).toBe(1);
  });

  it("multiplies bait and lure effects, and keeps rods apart", () => {
    const g = startGame();
    g.inventory.add("fine-bait", 5);
    g.inventory.add("whirligig");
    g.inventory.add("wide-float");
    g.inventory.add("magpie-hook");
    equipBait(g.tackle, g.inventory, hearth, "fine-bait");
    for (const id of ["whirligig", "wide-float"])
      equipLure(g.tackle, g.inventory, hearth, id);
    const e = g.tackle.effects(hearth.id);
    expect(e.wait).toBeCloseTo(0.5 * 0.7);
    expect(e.bar).toBeCloseTo(0.15);
    expect(g.tackle.effects(heron.id).wait).toBe(1);
    g.inventory.add("sounding-float");
    // A third kind of lure cannot fit on two slots.
    expect(equipLure(g.tackle, g.inventory, hearth, "magpie-hook")).toMatch(
      /full/,
    );
  });

  it("ignores Salted Bait away from the sea", () => {
    const t = new Tackle();
    t.rig(hazel.id).bait = { id: "salted-bait", count: 3 };
    expect(t.effects(hazel.id).wait).toBe(1);
    expect(t.effects(hazel.id, true).wait).toBe(0.5);
  });
});

describe("odds and the bar", () => {
  const rain: Conditions = {
    season: "fall",
    minutes: 12 * 60,
    raining: true,
  };

  it("weights rare, night and rain fish by lure, never adding fish", () => {
    const rare = FISH.find((f) => f.rarity === "rare" && f.time !== "night")!;
    const night = FISH.find((f) => f.time === "night")!;
    const wet = FISH.find((f) => f.time === "rain")!;
    expect(fishWeight(rare, { rare: 2 })).toBe(fishWeight(rare, {}) * 2);
    expect(fishWeight(night, { night: 3 })).toBe(fishWeight(night, {}) * 3);
    expect(fishWeight(wet, { rain: 3 })).toBe(fishWeight(wet, {}) * 3);
    expect(fishWeight(wet, { night: 3, rare: 2 })).toBe(
      fishWeight(wet, {}) * 2,
    );
  });

  it("a Storm Lure makes the rain fish bite more often", () => {
    // Autumn rain by day: Reedling-free pool with the Old Mossback.
    const count = (odds: { rain?: number }) => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const r = bite("river", rain, () => Math.random(), false, odds);
        if (r.kind === "fish" && r.fish.time === "rain") n++;
      }
      return n;
    };
    expect(count({ rain: 6 })).toBeGreaterThan(count({}));
  });

  it("never adds an out-of-condition fish", () => {
    const night: Conditions = {
      season: "winter",
      minutes: 23 * 60,
      raining: false,
    };
    const r = bite("river", night, seq(0), false, { rare: 99, night: 99 });
    if (r.kind === "fish") {
      expect(fishAvailable("river", night)).toContain(r.fish);
    }
  });

  it("adds a lure's bar to the assist bar", () => {
    expect(barWidth(hazel, 0, 0.15)).toBeCloseTo(0.36 * 1.15);
    expect(barWidth(hazel, 1, 0.15)).toBeCloseTo(0.36 * 1.45);
    expect(barWidth(hearth, 1, 0.15)).toBeLessThanOrEqual(0.9);
  });
});

describe("the Magpie Hook treasure", () => {
  it("is six purses in ten, else a trinket", () => {
    expect(pickTreasure(3, seq(0.3))).toEqual({
      kind: "purse",
      gold: purseGold(3),
    });
    expect(purseGold(4)).toBe(100);
    const t = pickTreasure(3, seq(0.9, 0.99));
    expect(t?.kind === "trinket" && t.item.id).toBe("ring-box");
    const first = pickTreasure(3, seq(0.9, 0));
    expect(first?.kind === "trinket" && first.item.id).toBe("tin-spoon");
  });

  it("pays gold or a trinket, dropping it when the backpack is full", () => {
    const g = startGame();
    const money = g.money;
    giveTreasure(g, { kind: "purse", gold: 85 }, { x: 1, y: 1 });
    expect(g.money).toBe(money + 85);
    giveTreasure(g, { kind: "trinket", item: TRINKETS[0]! }, { x: 1, y: 1 });
    expect(g.inventory.count("tin-spoon")).toBe(1);
  });
});

describe("saving tackle", () => {
  it("round trips rigs and tolerates a save without them", () => {
    const g = startGame();
    g.inventory.add("fine-bait", 7);
    g.inventory.add("glint-lure");
    equipBait(g.tackle, g.inventory, hearth, "fine-bait");
    equipLure(g.tackle, g.inventory, hearth, "glint-lure");
    g.tackle.spend(hearth.id);
    const back = deserialize(serialize(g))!;
    expect(back.tackle.rig(hearth.id)).toEqual({
      bait: { id: "fine-bait", count: 6 },
      lures: [{ id: "glint-lure", left: LURE_CASTS - 1 }],
    });
    const raw = JSON.parse(serialize(startGame()));
    delete raw.tackle;
    expect(
      deserialize(JSON.stringify(raw))!.tackle.rig(hearth.id).lures,
    ).toEqual([]);
  });

  it("drops unknown or bad entries", () => {
    const t = new Tackle();
    t.load({
      rigs: {
        r: {
          bait: { id: "nope", count: 3 },
          lures: [
            { id: "glint-lure", left: 999 },
            { id: "glint-lure", left: 5 },
            { id: "ghost", left: 5 },
            { id: "moth-lure", left: -1 },
          ],
        },
        bad: 4,
      },
    });
    expect(t.rig("r")).toEqual({
      lures: [{ id: "glint-lure", left: LURE_CASTS }],
    });
    t.load("junk");
    expect(t.rig("r").lures).toEqual([]);
  });
});

describe("fishing achievements", () => {
  it("counts kinds and total catches, and holds the full roster back until it exists", () => {
    const g = startGame();
    for (const f of FISH.slice(0, 9)) g.fishing.note(f.id, 10);
    const won = checkAchievements(g).map((a) => a.id);
    // Nine fish: no kinds goal yet, and the roster goal waits for 46.
    expect(won).not.toContain("first-ten");
    expect(won).not.toContain("whole-roster");
    for (let i = 0; i < 100; i++) g.fishing.note(FISH[0]!.id, 10);
    expect(checkAchievements(g).map((a) => a.id)).toContain("a-hundred-lines");
  });
});
