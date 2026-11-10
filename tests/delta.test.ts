import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import {
  areasEndDay,
  enterArea,
  isAreaMap,
  respawnAreaForage,
} from "../src/core/areas";
import { dateOf } from "../src/core/calendar";
import { fishAvailable, FISH } from "../src/core/fishing";
import { forage } from "../src/core/actions";
import { ForageField } from "../src/core/forage";
import { FORAGE_AREAS, forageCap, tableCapOf } from "../src/core/forageareas";
import { itemById } from "../src/core/items";
import { layersAtTier } from "../src/core/map";
import { newGame } from "../src/core/save";
import { buy, fisherStock, rodStock, tackleStock } from "../src/core/shop";
import {
  mendTideBridge,
  TIDE_BRIDGE_FLAG,
  TIDE_BRIDGE_WOOD,
  tideBridgeMended,
} from "../src/core/tidebridge";
import { holdsOf } from "../src/core/worldflags";
import { serviceLabel } from "../src/core/labels";

const delta = maps.get("delta");
const hut = maps.get("fisher-hut");
const mended = maps.getWith("delta", new Set([TIDE_BRIDGE_FLAG]));
const broken = maps.getWith("delta", new Set());

describe("the River delta map (note 75, steps 1 to 4)", () => {
  it("is 100 by 70, rideable, wild, marsh lake by default, and meets the contract", () => {
    expect(delta.width).toBe(100);
    expect(delta.height).toBe(70);
    expect(delta.rideable).toBe(true);
    expect(delta.wild).toBe(true);
    expect(isAreaMap("delta")).toBe(true);
    expect(delta.traits.waterKind).toBe("marsh-lake");
    expect(maps.problems()).toEqual([]);
  });

  it("joins the farm both ways, on every farm type, and the fisher's hut", () => {
    expect(delta.exits.find((e) => e.id === "to_farm")).toMatchObject({
      map: "farm",
      entry: "from_delta",
      w: 7,
      y: 0,
    });
    expect(delta.entry("from_farm")).toEqual({
      name: "from_farm",
      x: 13,
      y: 3,
    });
    for (const id of ["farm", "farm-woodland"]) {
      const farm = maps.get(id);
      expect(farm.exits.find((e) => e.id === "delta")).toMatchObject({
        map: "delta",
        entry: "from_farm",
        y: farm.height - 1,
      });
      expect(farm.entry("from_delta")).toBeDefined();
    }
    expect(delta.exits.find((e) => e.id === "fisher")).toMatchObject({
      map: "fisher-hut",
      entry: "door",
    });
    expect(hut.exits.find((e) => e.id === "door")).toMatchObject({
      map: "delta",
      entry: "from_fisher",
    });
    expect(hut.services.find((s) => s.kind === "fisher-shop")).toBeDefined();
  });

  it("has the Hearthwell exit and the ferry (notes 76 and 77)", () => {
    expect(delta.exits.map((e) => e.id).sort()).toEqual([
      "elf",
      "ferry",
      "fisher",
      "to_farm",
      "to_hearthwell",
    ]);
  });

  it("has four kinds of water, each with a casting spot", () => {
    const kinds = new Set(delta.waterZones.map((z) => z.kind));
    expect([...kinds].sort()).toEqual(["marsh-lake", "river", "sea"]);
    expect(delta.waterKindAt(23, 40)).toBe("marsh-lake");
    expect(delta.waterKindAt(63, 10)).toBe("river");
    expect(delta.waterKindAt(51, 25)).toBe("river");
    expect(delta.waterKindAt(70, 60)).toBe("sea");
    expect(delta.waterKindAt(87, 41)).toBe("sea");
    for (const [x, y] of [
      [23, 40],
      [63, 10],
      [70, 60],
    ] as const)
      expect(delta.isBlocked(x, y)).toBe(true);
  });

  it("lets the player reach the lake shore, the Beach, the pier and the hut door", () => {
    const walkable = delta.reachable(delta.entry("from_farm")!);
    for (const spot of ["13,25", "75,40", "81,57", "44,41", "62,36"])
      expect(walkable.has(spot), spot).toBe(true);
    // The pier is land: a cast from its end faces the sea.
    expect(delta.isWater(81, 58)).toBe(false);
    expect(delta.isWater(82, 59)).toBe(true);
  });

  it("starts with 20 twigs, 12 rocks and a handful of weeds, and no choppable trees", () => {
    expect(delta.litter.twigs.length).toBe(20);
    expect(delta.rocks.length).toBe(12);
    expect(delta.litter.weeds.length).toBe(8);
    expect(delta.trees.length).toBe(0);
  });

  it("has every label it needs", () => {
    for (const s of [...delta.services, ...hut.services, ...broken.services])
      expect(serviceLabel(s.kind, s.id)).toBeDefined();
  });
});

describe("the tide pool footbridge (note 75)", () => {
  const pocket = { x: 93, y: 45 };

  it("is shut and drawn ruined until the flag, then open", () => {
    expect(broken.services.some((s) => s.kind === "tide-bridge")).toBe(true);
    expect(mended.services.some((s) => s.kind === "tide-bridge")).toBe(false);
    for (let y = 44; y <= 47; y++) {
      expect(broken.isBlocked(86, y)).toBe(true);
      expect(mended.isBlocked(86, y)).toBe(false);
    }
    const start = broken.entry("from_farm")!;
    expect(broken.reachable(start).has(`${pocket.x},${pocket.y}`)).toBe(false);
    expect(mended.reachable(start).has(`${pocket.x},${pocket.y}`)).toBe(true);
    const json = mapFiles["delta"]!;
    const drawn = (holds: string[]) =>
      layersAtTier(json, 0, new Set(holds)).map((l) => l.name);
    expect(drawn([])).toContain("bridge-ruined");
    expect(drawn([TIDE_BRIDGE_FLAG])).not.toContain("bridge-ruined");
  });

  it("is mended for 300 wood, once, and nothing is taken if the wood is short", () => {
    const g = newGame();
    g.inventory.add("wood", TIDE_BRIDGE_WOOD - 1);
    expect(mendTideBridge(g)).toEqual({ ok: false, reason: "not enough wood" });
    expect(g.inventory.count("wood")).toBe(TIDE_BRIDGE_WOOD - 1);
    expect(tideBridgeMended(g)).toBe(false);
    g.inventory.add("wood", 1);
    expect(mendTideBridge(g)).toEqual({ ok: true });
    expect(g.inventory.count("wood")).toBe(0);
    expect(tideBridgeMended(g)).toBe(true);
    expect(holdsOf(g).has(TIDE_BRIDGE_FLAG)).toBe(true);
    g.inventory.add("wood", TIDE_BRIDGE_WOOD);
    expect(mendTideBridge(g)).toEqual({ ok: false, reason: "already mended" });
    expect(g.inventory.count("wood")).toBe(TIDE_BRIDGE_WOOD);
  });
});

describe("delta forage", () => {
  const area = FORAGE_AREAS["delta"]!;
  const tableAt = (x: number, y: number) => delta.forageTableAt(x, y);

  it("has 24 marsh spots, 40 beach spots and 20 tide pool spots", () => {
    const count = (t: string) =>
      delta.forageSpots.filter((s) => tableAt(s.x, s.y) === t).length;
    expect(count("marsh")).toBe(24);
    expect(count("default")).toBe(40);
    expect(count("tide-pools")).toBe(20);
  });

  it("caps the marsh at 3 and the beach at 5, apart, and the pools at about 1.2", () => {
    expect(forageCap(area, "spring")).toBe(5);
    expect(tableCapOf(area, "marsh", "spring")).toBe(3);
    expect(tableCapOf(area, "tide-pools", "spring")).toBe(1.2);
    expect(tableCapOf(area, "default", "spring")).toBeUndefined();
    const g = newGame();
    for (let i = 0; i < 40; i++) {
      respawnAreaForage(g, Math.random);
      const goods = [...g.areas["delta"]!.forage.each()];
      const n = (t: string) =>
        goods.filter((s) => tableAt(s.x, s.y) === t).length;
      expect(n("marsh")).toBe(3);
      expect(n("default")).toBe(5);
      expect([1, 2]).toContain(n("tide-pools"));
    }
  });

  it("gives about 1.2 goods a night at the pools", () => {
    const f = new ForageField();
    const spots = delta.forageSpots;
    let total = 0;
    for (let i = 0; i < 2000; i++) {
      f.respawnArea(
        "delta",
        "summer",
        spots,
        (s) => tableAt(s.x, s.y),
        Math.random,
        area,
      );
      total += [...f.each()].filter(
        (s) => tableAt(s.x, s.y) === "tide-pools",
      ).length;
    }
    expect(total / 2000).toBeGreaterThan(1.1);
    expect(total / 2000).toBeLessThan(1.3);
  });

  it("holds the right goods per table and season, with the rare shells", () => {
    const ids = (t: string, s: "spring" | "summer" | "fall" | "winter") =>
      area.tables[t]![s]!.map((w) => w.id);
    expect(ids("marsh", "spring")).toEqual([
      "dandelion",
      "daffodil",
      "salmonberry",
    ]);
    expect(ids("default", "summer")).toContain("pearly-shell");
    expect(ids("default", "winter")).toContain("spiral-shell");
    expect(ids("default", "spring")).not.toContain("pearly-shell");
    expect(ids("tide-pools", "winter")).toEqual([
      "sea-fan",
      "pin-urchin",
      "seaweed",
    ]);
    const weight = (id: string) =>
      area.tables["tide-pools"]!["spring"]!.find((w) => w.id === id)!.weight;
    expect(weight("sea-fan")).toBeGreaterThan(weight("pin-urchin") * 3.5);
  });

  it("does not put shore goods in the shared pool", () => {
    const g = newGame();
    for (const s of ["spring", "summer", "fall", "winter"] as const) {
      const f = new ForageField();
      f.respawn(
        s,
        [...Array(200).keys()].map((i) => ({ x: i, y: 0 })),
        Math.random,
      );
      for (const good of f.each())
        expect([
          "periwinkle",
          "sea-fan",
          "seaweed",
          "pearly-shell",
        ]).not.toContain(good.id);
    }
    expect(g.areas["delta"]).toBeDefined();
  });

  it("is picked up for 7 foraging XP and sells", () => {
    const g = newGame();
    enterArea(g, "delta");
    const spot = delta.forageSpots.find(
      (s) => tableAt(s.x, s.y) === "default",
    )!;
    g.forage.collect(spot.x, spot.y);
    (g.forage as unknown as { found: Map<string, string> }).found.set(
      `${spot.x},${spot.y}`,
      "periwinkle",
    );
    const before = g.skills.xpOf("foraging");
    expect(forage(g, spot.x, spot.y, () => 0.99).ok).toBe(true);
    expect(g.inventory.count("periwinkle")).toBeGreaterThanOrEqual(1);
    expect(g.skills.xpOf("foraging") - before).toBe(7);
    expect(itemById("periwinkle")?.sellPrice).toBeGreaterThan(0);
  });

  it("runs the delta through the night with the other areas", () => {
    const g = newGame();
    g.day.clock.day += 1;
    areasEndDay(g, Math.random);
    const { season } = dateOf(g.day.clock.day);
    expect(season).toBeDefined();
    expect([...g.areas["delta"]!.forage.each()].length).toBeGreaterThan(0);
  });
});

describe("fish of the delta waters (note 21)", () => {
  const day = { season: "summer", minutes: 12 * 60, raining: false } as const;
  const count = (w: string) => FISH.filter((f) => f.water === w).length;

  it("has 7 marsh lake fish (no legend) and 10 sea fish and the Great Hearthfin", () => {
    expect(count("marsh-lake")).toBe(7);
    expect(count("sea")).toBe(11);
    // The Great Hearthfin is the sea's legend, among the 11.
    expect(
      FISH.filter((f) => f.water === "sea" && f.rarity !== "legend"),
    ).toHaveLength(10);
  });

  it("bites by water kind, season, time and weather", () => {
    const ids = (
      w: "marsh-lake" | "sea",
      c: Parameters<typeof fishAvailable>[1],
    ) => fishAvailable(w, c).map((f) => f.id);
    expect(ids("marsh-lake", day)).toEqual(
      expect.arrayContaining(["marshlight", "bogwhisker", "sunk-boot-loach"]),
    );
    expect(ids("marsh-lake", { ...day, season: "fall" })).not.toContain(
      "bogwhisker",
    );
    expect(ids("marsh-lake", { ...day, minutes: 23 * 60 })).toContain(
      "reed-cat",
    );
    expect(ids("marsh-lake", { ...day, raining: true })).toContain("bullhead");
    expect(ids("sea", day)).toEqual(
      expect.arrayContaining([
        "sardine",
        "skiff-sprat",
        "mackerel",
        "harbour-ray",
        "crowned-tunny",
      ]),
    );
    expect(ids("sea", { ...day, season: "winter" })).toContain("cod");
    expect(ids("sea", day)).not.toContain("cod");
  });
});

describe("the fisher's counter (note 75, note 21)", () => {
  it("sells the rods, bait and lures, and the general store no longer does", () => {
    expect(fisherStock()).toEqual([...rodStock(), ...tackleStock()]);
    expect(fisherStock()).toContain("hazel-rod");
    expect(fisherStock()).toContain("salted-bait");
    const g = newGame();
    expect(buy(g.inventory, g, "plain-bait", 3)).toBe(true);
  });
});
