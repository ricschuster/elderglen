import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { isClear } from "../src/core/actions";
import { bite } from "../src/core/fishing";
import { WATER_KINDS, type WaterKind } from "../src/core/map";
import {
  POND_BUILD_DAYS,
  advancePonds,
  orderPond,
  pondAt,
  pondNews,
  pondNight,
  pondStatus,
  pondUse,
  putFish,
  stateOf,
} from "../src/core/pond";
import { reportLines } from "../src/core/report";
import { newGame } from "../src/core/save";
import type { GameState } from "../src/core/save";
import { START } from "../src/core/maps";
import { findsAvailable, WATER_FINDS } from "../src/core/waterfinds";
import { SleepReport } from "../src/core/sleep";

const farm = maps.get(START.map);

function built(): { g: GameState; at: { x: number; y: number } } {
  const g = newGame();
  g.money = 10000;
  g.inventory.add("stone", 200);
  g.inventory.add("seaweed", 5);
  g.inventory.add("pondweed", 5);
  let at = { x: 0, y: 0 };
  search: for (let y = 0; y < farm.height - 5; y++)
    for (let x = 0; x < farm.width - 5; x++) {
      let ok = true;
      for (let dy = 0; dy < 5 && ok; dy++)
        for (let dx = 0; dx < 5 && ok; dx++)
          ok = isClear(g, farm, x + dx, y + dy);
      if (ok && orderPond(g, farm, "farm", x, y).ok) {
        at = { x, y };
        break search;
      }
    }
  for (let i = 0; i < POND_BUILD_DAYS; i++) advancePonds(g);
  return { g, at };
}

const day = { season: "winter", minutes: 10 * 60, raining: false } as const;

describe("cave water (note 93)", () => {
  it("is a water kind", () => {
    expect(WATER_KINDS).toContain<WaterKind>("cave-pool");
  });

  it("lets Pale lichen and Glow jelly bite there, and nowhere else", () => {
    const ids = (w: WaterKind, season: "spring" | "winter") =>
      findsAvailable(w, season).map((f) => f.id);
    expect(ids("cave-pool", "spring")).toContain("pale-lichen");
    expect(ids("cave-pool", "winter")).toContain("glow-jelly");
    expect(ids("cave-pool", "spring")).not.toContain("glow-jelly");
    for (const f of WATER_FINDS.filter(
      (f) => f.id === "pale-lichen" || f.id === "glow-jelly",
    ))
      expect(f.waters).toEqual(["cave-pool"]);
    for (const w of WATER_KINDS.filter((w) => w !== "cave-pool"))
      expect(ids(w, "winter")).not.toContain("glow-jelly");
  });

  it("gives a find from a cast in cave water", () => {
    // Roll 0 passes the trash chance? Use a low roll for the finds only.
    const seq = [0.99, 0.01];
    let i = 0;
    const r = bite("cave-pool", { ...day }, () => seq[i++ % seq.length]!);
    expect(r.kind).toBe("find");
  });
});

describe("pond interaction", () => {
  it("puts a held fish in, then says how it stands", () => {
    const { g, at } = built();
    const p = pondAt(g, at.x, at.y)!;
    expect(pondStatus(p)).toMatch(/empty pond/);
    g.inventory.add("carp");
    const r = pondUse(g, p, "carp");
    expect(r).toMatchObject({ ok: true, note: expect.stringMatching(/slips/) });
    expect(g.inventory.count("carp")).toBe(0);
    expect(pondUse(g, pondAt(g, at.x, at.y)!, undefined)).toMatchObject({
      ok: true,
      note: "1 of 3 Carp.",
    });
  });

  it("takes the waiting roe before putting a fish in", () => {
    const { g, at } = built();
    g.inventory.add("carp", 2);
    pondUse(g, pondAt(g, at.x, at.y)!, "carp");
    pondNight(g, () => 0);
    const r = pondUse(g, pondAt(g, at.x, at.y)!, "carp");
    expect(r).toMatchObject({ ok: true, item: "carp-roe" });
    expect(g.inventory.count("carp-roe")).toBeGreaterThan(0);
    expect(g.inventory.count("carp")).toBe(1);
  });

  it("hands in the quest item the fish ask for", () => {
    const { g, at } = built();
    g.inventory.add("carp", 3);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, "carp");
    pondNight(g, () => 0.999);
    pondNight(g, () => 0.999);
    for (let n = 0; n < 6 && !stateOf(pondAt(g, at.x, at.y)!).quest; n++)
      pondNight(g, () => 0.999);
    const quest = stateOf(pondAt(g, at.x, at.y)!).quest!;
    expect(quest).toBeDefined();
    expect(pondStatus(pondAt(g, at.x, at.y)!)).toMatch(/They want/);
    g.inventory.add(quest.item);
    // A roe may be waiting; the quest item goes in first.
    const r = pondUse(g, pondAt(g, at.x, at.y)!, quest.item);
    expect(r.ok).toBe(true);
    expect(g.inventory.count(quest.item)).toBe(0);
  });

  it("reports an unfinished pond and refuses a fish", () => {
    const g = newGame();
    g.money = 10000;
    g.inventory.add("stone", 200);
    g.inventory.add("seaweed", 5);
    g.inventory.add("pondweed", 5);
    for (let y = 0; y < farm.height - 5; y++)
      for (let x = 0; x < farm.width - 5; x++)
        if (!g.placed.count && orderPond(g, farm, "farm", x, y).ok) {
          const p = pondAt(g, x, y)!;
          expect(pondStatus(p)).toMatch(/still digging/);
          g.inventory.add("carp");
          expect(pondUse(g, p, "carp")).toMatchObject({ ok: true });
          expect(g.inventory.count("carp")).toBe(1);
        }
  });
});

describe("the morning report", () => {
  const base = {
    passedOut: false,
    moneyLost: 0,
    weather: "sunny",
    withered: 0,
    houseFinished: false,
    coopFinished: false,
    barnFinished: false,
    stableFinished: false,
    horseWasOut: false,
    siloFinished: false,
    animals: {
      eggs: 0,
      barn: 0,
      unfed: 0,
      outside: 0,
      grown: [],
      hatched: [],
      hatchWaiting: false,
    },
    furnaceGifted: false,
    toolReady: undefined,
    achievements: [],
    summitCall: false,
    completion: 0,
    completionGain: 0,
    newMail: 0,
    caveOffer: false,
    shipped: { lines: [], total: 0 },
    orders: { done: [], lapsed: [] },
    requestsLapsed: [],
    stuckTrees: [],
    quarryBridge: false,
    ferryMended: false,
    cartsRunning: false,
    guestsBonus: [],
  } as unknown as SleepReport;

  it("says when a pond is finished, has something to take, or is asked for something", () => {
    const text = (r: Partial<SleepReport>) =>
      reportLines({ ...base, ...r }).join(" ");
    expect(text({ pondsFinished: 1 })).toMatch(/finished your fish pond/);
    expect(text({ pondNews: { ready: 1, quests: 0 } })).toMatch(
      /something to take/,
    );
    expect(text({ pondNews: { ready: 0, quests: 2 } })).toMatch(/asking/);
    expect(text({})).not.toMatch(/pond/);
  });

  it("counts what the ponds hold", () => {
    const { g, at } = built();
    expect(pondNews(g)).toEqual({ ready: 0, quests: 0 });
    g.inventory.add("carp");
    putFish(g, at.x, at.y, "carp");
    pondNight(g, () => 0);
    expect(pondNews(g).ready).toBe(1);
  });
});
