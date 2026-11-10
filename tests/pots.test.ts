import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { ringProgress } from "../src/core/completion";
import { FISH } from "../src/core/fishing";
import { itemById } from "../src/core/items";
import {
  JUNK,
  POT_ITEM,
  Pots,
  SHELLFISH,
  baitPot,
  collectPot,
  pickUpPot,
  placePot,
  rollCatch,
} from "../src/core/pots";
import { deserialize, serialize } from "../src/core/save";
import { buy, tackleStock } from "../src/core/shop";
import { startGame } from "../src/core/toolbar";
import { sleep } from "../src/core/sleep";

const delta = maps.get("delta");
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length] as number;
};

function ready() {
  const g = startGame();
  g.inventory.add(POT_ITEM, 3);
  g.inventory.add("plain-bait", 5);
  g.inventory.add("fine-bait", 5);
  return g;
}

describe("pot data", () => {
  it("has four catches a water, odds of 100, and 5 junk", () => {
    for (const water of ["fresh", "salt"] as const) {
      const pool = SHELLFISH.filter((s) => s.water === water);
      expect(pool).toHaveLength(4);
      expect(pool.reduce((n, s) => n + s.odds, 0)).toBe(100);
    }
    expect(JUNK).toHaveLength(5);
  });

  it("matches the note's prices and sells the pot for 150g at the fisher", () => {
    expect(itemById("crab")?.sellPrice).toBe(60);
    expect(itemById("pearl-lobster")?.sellPrice).toBe(800);
    expect(itemById("marsh-clam")?.sellPrice).toBe(90);
    expect(itemById(POT_ITEM)?.buyPrice).toBe(150);
    expect(tackleStock()).toContain(POT_ITEM);
    const g = startGame();
    expect(buy(g.inventory, g, POT_ITEM, 2)).toBe(true);
    expect(g.inventory.count(POT_ITEM)).toBe(2);
  });
});

describe("rolling a catch", () => {
  it("gives junk below the junk chance and a shellfish above it", () => {
    expect(JUNK.map((j) => j.id)).toContain(
      rollCatch("fresh", "plain-bait", seq(0.37, 0)),
    );
    expect(rollCatch("fresh", "plain-bait", seq(0.38, 0))).toBe("crayfish");
  });

  it("lowers the junk chance with Fine Bait", () => {
    expect(rollCatch("salt", "fine-bait", seq(0.34, 0))).toBe("crab");
    expect(JUNK.map((j) => j.id)).toContain(
      rollCatch("salt", "fine-bait", seq(0.29, 0)),
    );
  });

  it("picks by the table's odds and never fish or the other water", () => {
    const at = (r: number) => rollCatch("fresh", "plain-bait", seq(0.9, r));
    expect(at(0.0)).toBe("crayfish");
    expect(at(0.34)).toBe("crayfish");
    expect(at(0.36)).toBe("river-mussel");
    expect(at(0.71)).toBe("ladle-snail");
    expect(at(0.95)).toBe("marsh-clam");
    expect(rollCatch("salt", "plain-bait", seq(0.9, 0.95))).toBe(
      "pearl-lobster",
    );
  });
});

describe("a pot on the water", () => {
  it("is placed on fresh water and salt water by the tile's kind", () => {
    const g = ready();
    expect(placePot(g, delta, "delta", 63, 10).ok).toBe(true);
    expect(placePot(g, delta, "delta", 70, 60).ok).toBe(true);
    expect(g.pots.get("delta", 63, 10)?.kind).toBe("fresh");
    expect(g.pots.get("delta", 70, 60)?.kind).toBe("salt");
    expect(g.inventory.count(POT_ITEM)).toBe(1);
  });

  it("is refused on land, twice on a tile, or with none held", () => {
    const g = ready();
    expect(placePot(g, delta, "delta", 1, 1)).toEqual({
      ok: false,
      reason: "pot needs water",
    });
    placePot(g, delta, "delta", 63, 10);
    expect(placePot(g, delta, "delta", 63, 10).ok).toBe(false);
    g.inventory.remove(POT_ITEM, 2);
    expect(placePot(g, delta, "delta", 63, 11)).toEqual({
      ok: false,
      reason: "no pot",
    });
  });

  it("catches nothing unbaited, and one catch overnight when baited", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    g.pots.endDay(seq(0.9, 0));
    expect(g.pots.get("delta", 63, 10)?.catch).toBeUndefined();
    expect(baitPot(g, "delta", 63, 10, "plain-bait").ok).toBe(true);
    expect(g.inventory.count("plain-bait")).toBe(4);
    expect(baitPot(g, "delta", 63, 10, "fine-bait").ok).toBe(false);
    g.pots.endDay(seq(0.9, 0));
    const pot = g.pots.get("delta", 63, 10)!;
    expect(pot.catch).toBe("crayfish");
    expect(pot.bait).toBeUndefined();
    // A pot holding a catch takes no bait, and is not emptied by another night.
    expect(baitPot(g, "delta", 63, 10, "plain-bait")).toEqual({
      ok: false,
      reason: "pot full",
    });
  });

  it("refuses things that are not bait", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    g.inventory.add("crab");
    expect(baitPot(g, "delta", 63, 10, "crab").ok).toBe(false);
    expect(baitPot(g, "delta", 1, 1, "plain-bait").ok).toBe(false);
  });

  it("is emptied by hand: quality, XP, the tracker count, and junk gives XP too", () => {
    const g = ready();
    placePot(g, delta, "delta", 70, 60);
    baitPot(g, "delta", 70, 60, "plain-bait");
    g.pots.endDay(seq(0.9, 0.95));
    const xp0 = g.skills.xpOf("fishing");
    const r = collectPot(g, "delta", 70, 60, seq(0.9));
    expect(r.ok).toBe(true);
    expect(g.inventory.count("pearl-lobster@silver")).toBe(1);
    expect(g.pots.has("pearl-lobster")).toBe(true);
    expect(g.skills.xpOf("fishing")).toBeGreaterThan(xp0);
    expect(g.pots.get("delta", 70, 60)?.catch).toBeUndefined();
    expect(collectPot(g, "delta", 70, 60, seq(0.1))).toEqual({
      ok: false,
      reason: "pot empty",
    });

    baitPot(g, "delta", 70, 60, "plain-bait");
    g.pots.endDay(seq(0.1, 0));
    const xp1 = g.skills.xpOf("fishing");
    collectPot(g, "delta", 70, 60, seq(0.1));
    expect(g.skills.xpOf("fishing")).toBeGreaterThan(xp1);
    expect(g.pots.countOf("pearl-lobster")).toBe(1);
  });

  it("gives a normal shellfish on a low roll and keeps a full backpack's catch", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    baitPot(g, "delta", 63, 10, "plain-bait");
    g.pots.endDay(seq(0.9, 0));
    collectPot(g, "delta", 63, 10, seq(0));
    expect(g.inventory.count("crayfish")).toBe(1);
  });

  it("is picked up when it holds no catch, bait coming back", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    baitPot(g, "delta", 63, 10, "plain-bait");
    expect(pickUpPot(g, "delta", 63, 10).ok).toBe(true);
    expect(g.inventory.count(POT_ITEM)).toBe(3);
    expect(g.inventory.count("plain-bait")).toBe(5);
    placePot(g, delta, "delta", 63, 10);
    baitPot(g, "delta", 63, 10, "plain-bait");
    g.pots.endDay(seq(0.9, 0));
    expect(pickUpPot(g, "delta", 63, 10)).toEqual({
      ok: false,
      reason: "pot full",
    });
  });

  it("works through the night's sleep", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    baitPot(g, "delta", 63, 10, "plain-bait");
    sleep(g, [], () => 0.5);
    expect(g.pots.get("delta", 63, 10)?.catch).toBeDefined();
  });
});

describe("saving and the tracker", () => {
  it("round-trips pots, bait, catches and the shellfish landed", () => {
    const g = ready();
    placePot(g, delta, "delta", 63, 10);
    placePot(g, delta, "delta", 70, 60);
    baitPot(g, "delta", 63, 10, "fine-bait");
    baitPot(g, "delta", 70, 60, "plain-bait");
    g.pots.endDay(seq(0.9, 0));
    baitPot(g, "delta", 63, 10, "plain-bait");
    collectPot(g, "delta", 70, 60, seq(0.5));
    const back = deserialize(serialize(g))!;
    expect(back.pots.save()).toEqual(g.pots.save());
    expect(back.pots.get("delta", 63, 10)?.catch).toBe("crayfish");
    const landed = SHELLFISH.filter((x) => g.pots.has(x.id));
    expect(landed).toHaveLength(1);
    expect(back.pots.has(landed[0]!.id)).toBe(true);
  });

  it("loads an old save with no pots and ignores bad rows", () => {
    const p = new Pots();
    p.load(undefined);
    expect(p.count).toBe(0);
    p.load({
      pots: [
        { map: "delta", x: 1, y: 2, kind: "fresh", bait: "nope", catch: "x" },
        { map: "delta", x: "a", y: 2, kind: "fresh" },
        { map: "delta", x: 3, y: 2, kind: "lava" },
      ],
      caught: { crab: 2, dragon: 1 },
    });
    expect(p.count).toBe(1);
    expect(p.get("delta", 1, 2)?.bait).toBeUndefined();
    expect(p.countOf("crab")).toBe(2);
    expect(p.has("dragon")).toBe(false);
  });

  it("counts shellfish in the completion tracker's fish row", () => {
    const g = startGame();
    const row = () =>
      ringProgress(g)
        .flatMap((r) => r.categories)
        .find((c) => c.id === "fish")!;
    const before = row();
    g.pots.note("crab");
    const after = row();
    expect(after.total).toBe(before.total);
    expect(after.done).toBe(before.done + 1);
    expect(before.total).toBe(FISH.length + SHELLFISH.length);
  });
});
