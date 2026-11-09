import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { areasEndDay, isAreaMap, respawnAreaForage } from "../src/core/areas";
import { BUNDLES, Hall, ROOMS } from "../src/core/bundles";
import { exitOpen, layersAtTier } from "../src/core/map";
import { exitLabel, serviceLabel } from "../src/core/labels";
import {
  COVE_OPEN,
  COVE_ROOM,
  COVE_TREASURE,
  FERRY_LINE,
  TREASURE,
  coveHolds,
  ferryMended,
  ferryNews,
  takeTreasure,
  treasureFlag,
} from "../src/core/cove";
import { fishAvailable, FISH, potKindOf } from "../src/core/fishing";
import { FORAGE_AREAS, forageCap } from "../src/core/forageareas";
import { MAX_SLOTS } from "../src/core/inventory";
import { itemById } from "../src/core/items";
import { reportLines } from "../src/core/report";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { farmMapOf } from "../src/core/farmtypes";
import { holdsOf } from "../src/core/worldflags";
import { rideable } from "../src/core/horse";

const cove = maps.get("cove");
const delta = maps.get("delta");
const open = maps.getWith("delta", new Set([COVE_OPEN]));
const ruined = maps.getWith("delta", new Set());

/** A game whose hall has one small Water room bundle, since bundles 13 to 18 are not written yet. */
function gameWithWaterRoom() {
  const g = newGame();
  g.hall = new Hall(
    [
      ...BUNDLES,
      {
        id: "test-water",
        name: "Test water",
        room: COVE_ROOM,
        hint: "",
        items: [{ id: "carp", count: 1, minQuality: "normal" }],
        required: 1,
        reward: {},
      },
    ],
    {},
    ROOMS.map((r) => (r.id === COVE_ROOM ? { ...r, opensAfter: 0 } : r)),
  );
  return g;
}

function finishWaterRoom(g: ReturnType<typeof newGame>) {
  g.inventory.add("carp");
  g.hall.handIn(g.inventory, g, "test-water", "carp");
}

describe("the Lake cove map (note 76)", () => {
  it("is 50 by 40, fresh water, wild, not rideable, and meets the contract", () => {
    expect(cove.width).toBe(50);
    expect(cove.height).toBe(40);
    expect(cove.rideable).toBe(false);
    expect(cove.wild).toBe(true);
    expect(isAreaMap("cove")).toBe(true);
    expect(cove.traits.waterKind).toBe("cove");
    expect(potKindOf("cove")).toBe("fresh");
    expect(maps.problems()).toEqual([]);
  });

  it("has one exit back to the delta dock and an entry beside it", () => {
    expect(cove.exits).toHaveLength(1);
    expect(cove.exits[0]).toMatchObject({
      id: "to_delta",
      map: "delta",
      entry: "from_ferry",
      x: 8,
      y: 7,
      h: 3,
    });
    expect(cove.exits[0]!.requires).toBeUndefined();
    expect(cove.entries).toHaveLength(1);
    expect(cove.entry("from_ferry")).toMatchObject({ x: 9, y: 8 });
    expect(exitLabel("to_delta")).toBe("River delta");
  });

  it("has water over x 14 to 44 and y 10 to 34 and a walkable shore round it", () => {
    expect(cove.isWater(30, 22)).toBe(true);
    expect(cove.isWater(14, 22)).toBe(true);
    expect(cove.isWater(44, 22)).toBe(true);
    expect(cove.isWater(30, 10)).toBe(true);
    expect(cove.isWater(30, 34)).toBe(true);
    expect(cove.isWater(30, 9)).toBe(false);
    expect(cove.isWater(13, 22)).toBe(false);
    expect(cove.waterKindAt(30, 22)).toBe("cove");
    const walk = cove.reachable(cove.entry("from_ferry")!);
    for (const [x, y] of [
      [12, 8],
      [46, 8],
      [12, 36],
      [46, 36],
      [30, 36],
      [12, 22],
      [46, 22],
    ])
      expect(walk.has(`${x},${y}`)).toBe(true);
  });

  it("has six lanterns, a bench, no tree spots and no building", () => {
    let lanterns = 0;
    for (const [x, y] of [
      [11, 12],
      [11, 32],
      [20, 37],
      [36, 37],
      [47, 12],
      [47, 32],
    ] as const)
      if (cove.isBlocked(x, y)) lanterns++;
    expect(lanterns).toBe(6);
    for (const x of [24, 25, 26]) expect(cove.isBlocked(x, 36)).toBe(true);
    expect(cove.trees).toHaveLength(0);
    expect(cove.services.map((s) => s.kind)).toEqual([COVE_TREASURE]);
  });

  it("puts the treasure on the south-east ledge, reachable from the shore", () => {
    expect(cove.serviceAt(41, 36)?.kind).toBe(COVE_TREASURE);
    expect(cove.isBlocked(41, 36)).toBe(true);
    const walk = cove.reachable(cove.entry("from_ferry")!);
    expect(walk.has("41,35")).toBe(true);
    expect(serviceLabel(COVE_TREASURE, "treasure")).toBe("Glint on the Ledge");
  });
});

describe("the ferry on the delta (notes 75 and 76)", () => {
  it("has the dock, the gated exit and the entry", () => {
    const exit = delta.exits.find((e) => e.id === "ferry")!;
    expect(exit).toMatchObject({
      map: "cove",
      entry: "from_ferry",
      x: 25,
      y: 58,
      w: 3,
      requires: COVE_OPEN,
    });
    expect(delta.entry("from_ferry")).toMatchObject({ x: 26, y: 57 });
    expect(exitLabel("ferry")).toBe("Ferry to the Lake cove");
    const walk = delta.reachable(delta.entry("from_farm")!);
    expect(walk.has("26,57")).toBe(true);
    expect(walk.has("26,58")).toBe(true);
  });

  it("is shut while ruined and open once the Water room is done", () => {
    expect(
      exitOpen(
        ruined.exits.find((e) => e.id === "ferry")!,
        new Set(),
      ),
    ).toBe(false);
    expect(
      exitOpen(
        open.exits.find((e) => e.id === "ferry")!,
        new Set([COVE_OPEN]),
      ),
    ).toBe(true);
    expect(FERRY_LINE).toContain("Water room");
  });

  it("swaps the ruined boat art for the repaired boat", () => {
    const art = (holds: string[]) =>
      layersAtTier(mapFiles["delta"]!, 0, new Set(holds))
        .map((l) => l.name)
        .filter((n) => n.startsWith("ferry"));
    expect(art([])).toEqual(["ferry-ruined"]);
    expect(art([COVE_OPEN])).toEqual(["ferry-repaired"]);
  });
});

describe("the Water room reward gate", () => {
  it("is closed with no finished room, and reads from the hall with no flag", () => {
    const g = gameWithWaterRoom();
    expect(ferryMended(g)).toBe(false);
    expect(coveHolds(g)).toEqual([]);
    expect(holdsOf(g).has(COVE_OPEN)).toBe(false);
    finishWaterRoom(g);
    expect(ferryMended(g)).toBe(true);
    expect(holdsOf(g).has(COVE_OPEN)).toBe(true);
    expect(g.flags ?? []).not.toContain(COVE_OPEN);
  });

  it("says in the morning report, once, that the ferry is repaired", () => {
    const g = gameWithWaterRoom();
    expect(ferryNews(g)).toBe(false);
    finishWaterRoom(g);
    const r = sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(r.ferryMended).toBe(true);
    expect(reportLines(r).join(" ")).toContain("Lake cove is open");
    const r2 = sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(r2.ferryMended).toBe(false);
  });

  it("stays closed in a fresh game, since bundles 13 to 18 are not written yet", () => {
    const g = newGame();
    expect(ferryMended(g)).toBe(false);
  });
});

describe("cove fishing (note 21)", () => {
  const cf = FISH.filter((f) => f.water === "cove");
  const at = (
    season: "spring" | "summer" | "fall" | "winter",
    h: number,
    raining = false,
  ) =>
    fishAvailable("cove", { season, minutes: h * 60, raining }).map(
      (f) => f.id,
    );

  it("has the eight fish, all priced 400 to 700", () => {
    expect(cf.map((f) => f.id).sort()).toEqual(
      [
        "pearlback",
        "cove-lantern",
        "still-water-gar",
        "velvet-koi",
        "hush",
        "dusk-opal",
        "deepglow",
        "shell-ghost",
      ].sort(),
    );
    for (const f of cf) {
      expect(f.sellPrice).toBeGreaterThanOrEqual(400);
      expect(f.sellPrice).toBeLessThanOrEqual(700);
      expect(itemById(f.id)?.sellPrice).toBe(f.sellPrice);
    }
    expect(cf.filter((f) => f.rarity === "uncommon")).toHaveLength(3);
    expect(cf.filter((f) => f.rarity === "rare")).toHaveLength(5);
  });

  it("follows the season, time and weather columns", () => {
    expect(at("summer", 12)).toEqual(["pearlback", "still-water-gar"]);
    expect(at("fall", 12)).toEqual(["pearlback"]);
    expect(at("spring", 23)).toEqual(["cove-lantern"]);
    expect(at("winter", 23)).toEqual(["cove-lantern", "deepglow"]);
    expect(at("fall", 6)).toEqual(["hush"]);
    expect(at("fall", 18)).toContain("velvet-koi");
    expect(at("fall", 18)).toContain("dusk-opal");
    expect(at("spring", 18)).not.toContain("velvet-koi");
    expect(at("spring", 12, true)).toContain("shell-ghost");
    expect(at("spring", 12, false)).not.toContain("shell-ghost");
  });

  it("does not put a cove fish in any bundle (note 71, rule 6)", () => {
    const ids = new Set(cf.map((f) => f.id));
    for (const b of BUNDLES)
      for (const i of b.items) expect(ids.has(i.id)).toBe(false);
  });

  it("keeps the other waters free of cove fish", () => {
    for (const f of FISH)
      if (f.water !== "cove") expect(cf.map((c) => c.id)).not.toContain(f.id);
  });
});

describe("cove forage (note 76)", () => {
  const area = FORAGE_AREAS["cove"]!;

  it("has 12 candidate spots and a cap of 2 in every season", () => {
    expect(cove.forageSpots).toHaveLength(12);
    for (const s of ["spring", "summer", "fall", "winter"] as const)
      expect(forageCap(area, s)).toBe(2);
  });

  it("uses the note's per-season goods, with every good in forage.json", () => {
    const ids = (s: "spring" | "summer" | "fall" | "winter") =>
      area.tables["default"]![s]!.map((w) => w.id);
    expect(ids("spring")).toEqual(["dandelion", "daffodil"]);
    expect(ids("summer")).toEqual(["sweet-pea", "spice-berry"]);
    expect(ids("fall")).toEqual(["bramble-berry", "crab-apple"]);
    expect(ids("winter")).toEqual(["crocus", "snowdrop"]);
    for (const s of ["spring", "summer", "fall", "winter"] as const)
      for (const id of ids(s)) expect(itemById(id)).toBeDefined();
  });

  it("scatters the day's forage on the cove", () => {
    const g = newGame();
    respawnAreaForage(g, Math.random);
    areasEndDay(g, Math.random);
    const n = g.areas["cove"]!.forage.each();
    expect([...n].length).toBe(2);
  });
});

describe("the hidden treasure spot (note 76, decision 8)", () => {
  const day = (season: number, year = 0) => 1 + season * 28 + year * 112;

  it("gives a seasonal pick of existing goods, never a unique item", () => {
    for (const t of Object.values(TREASURE)) {
      expect(itemById(t.id)).toBeDefined();
      expect(t.count).toBeGreaterThan(0);
    }
    expect(new Set(Object.keys(TREASURE))).toEqual(
      new Set(["spring", "summer", "fall", "winter"]),
    );
  });

  it("opens once a season and saves a flag", () => {
    const g = newGame();
    g.day.clock.day = day(0);
    const r = takeTreasure(g);
    expect(r).toMatchObject({ ok: true, id: "geode", count: 3 });
    expect(g.inventory.count("geode")).toBe(3);
    expect(g.flags).toContain(treasureFlag(day(0)));
    expect(takeTreasure(g)).toEqual({ ok: false, reason: "taken" });
    expect(g.inventory.count("geode")).toBe(3);
  });

  it("is back next season and next year, and differs by season", () => {
    const g = newGame();
    const seen: string[] = [];
    for (const [s, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
    ] as const) {
      g.day.clock.day = day(s, y);
      const r = takeTreasure(g);
      expect(r.ok).toBe(true);
      if (r.ok) seen.push(r.id);
    }
    expect(seen).toEqual([
      "geode",
      "fine-bait",
      "moth-lure",
      "frozen-geode",
      "geode",
    ]);
  });

  it("leaves the chest for later when the backpack is full", () => {
    const g = newGame();
    g.day.clock.day = day(0);
    g.inventory.load(
      Array.from({ length: MAX_SLOTS }, (_, n) => ({
        id: `junk-${n}`,
        count: 1,
      })),
    );
    expect(takeTreasure(g)).toEqual({ ok: false, reason: "backpack full" });
    expect(g.flags ?? []).not.toContain(treasureFlag(day(0)));
  });
});

describe("the horse and the ferry (note 59)", () => {
  it("cannot be ridden at the cove, so the ferry dismounts like a door", () => {
    expect(rideable(cove)).toBe(false);
    expect(rideable(delta)).toBe(true);
  });
});
