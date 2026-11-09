import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { FarmMap } from "../src/core/map";
import {
  areaOf,
  areaMaps,
  areasEndDay,
  enterArea,
  homeWorld,
  isAreaMap,
  leaveArea,
  regrowGroves,
  respawnAreaForage,
} from "../src/core/areas";
import { chop, forage } from "../src/core/actions";
import { fishAvailable, FISH } from "../src/core/fishing";
import { FORAGE_AREAS, forageCap } from "../src/core/forageareas";
import { useHeld } from "../src/core/tools";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { farmMapOf } from "../src/core/farmtypes";
import {
  MATURE_STAGE,
  SEED_STAGE,
  swingsToFell,
  Trees,
} from "../src/core/trees";
import { dateOf } from "../src/core/calendar";

const forest = maps.get("forest");
const never = () => 0.99;
const always = () => 0;

describe("the Forest map (note 72, part 1)", () => {
  it("is 120 by 120, rideable and a wild map, and meets the contract", () => {
    expect(forest.width).toBe(120);
    expect(forest.height).toBe(120);
    expect(forest.rideable).toBe(true);
    expect(forest.wild).toBe(true);
    expect(forest.indoors).toBe(false);
    expect(maps.problems()).toEqual([]);
  });

  it("joins the farm both ways, on every farm type", () => {
    const back = forest.exits.find((e) => e.id === "to_farm");
    expect(back).toMatchObject({ map: "farm", entry: "from_forest", w: 7 });
    expect(back!.y).toBe(119);
    expect(forest.entry("from_farm")).toEqual({
      name: "from_farm",
      x: 73,
      y: 116,
    });
    for (const id of ["farm", "farm-woodland"]) {
      const farm = maps.get(id);
      expect(farm.exits.find((e) => e.id === "forest")).toMatchObject({
        map: "forest",
        entry: "from_farm",
        y: 0,
      });
      expect(farm.entry("from_forest")).toBeDefined();
    }
  });

  it("has the Mountain exit on the east edge, and gates the Secret Woods behind the log", () => {
    expect(forest.exits.map((e) => e.id)).toEqual([
      "to_farm",
      "to_secret_woods",
      "to_mountain",
      "farmstead",
      "hermit",
    ]);
    expect(forest.logs.length).toBe(2);
  });

  it("has the Forest lake, fished as forest-lake water", () => {
    const zone = forest.waterZones.find((z) => z.kind === "forest-lake");
    expect(zone).toMatchObject({ x: 34, y: 12, w: 31, h: 23 });
    expect(forest.waterKindAt(49, 23)).toBe("forest-lake");
    expect(forest.waterKindAt(49, 40)).toBeUndefined();
    let tiles = 0;
    for (let y = 0; y < forest.height; y++)
      for (let x = 0; x < forest.width; x++)
        if (forest.isWater(x, y)) {
          tiles++;
          expect(forest.isBlocked(x, y)).toBe(true);
          expect(forest.waterKindAt(x, y)).toBe("forest-lake");
        }
    expect(tiles).toBeGreaterThan(300);
  });

  it("holds the six lake fish of note 21", () => {
    const lake = FISH.filter((f) => f.water === "forest-lake");
    expect(lake.map((f) => f.id).sort()).toEqual(
      [
        "carp",
        "fernfin",
        "hermit-trout",
        "moonmirror",
        "mushroom-loach",
        "perch",
      ].sort(),
    );
    const day = { season: "spring", minutes: 12 * 60, raining: false } as const;
    const ids = fishAvailable("forest-lake", day).map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["carp", "perch"]));
    expect(ids).not.toContain("fernfin");
    const rain = { season: "winter", minutes: 12 * 60, raining: true } as const;
    expect(fishAvailable("forest-lake", rain).map((f) => f.id)).toContain(
      "hermit-trout",
    );
  });

  it("has six groves of oak and maple, about 150 choppable trees", () => {
    const stage = (n: number) => forest.trees.filter((t) => t.stage === n);
    expect(forest.trees.length).toBe(152);
    expect(stage(5).length).toBe(110);
    expect(stage(4).length).toBe(25);
    expect(stage(2).length + stage(3).length).toBe(17);
    expect(forest.trees.filter((t) => t.kind === "oak").length).toBe(82);
    expect(forest.trees.filter((t) => t.kind === "maple").length).toBe(70);
    expect(forest.trees.every((t) => !t.large)).toBe(true);
    const groves = [
      [8, 40, 30, 54, "oak"],
      [6, 58, 28, 76, "oak"],
      [38, 84, 62, 104, "oak"],
      [70, 12, 82, 30, "maple"],
      [88, 44, 112, 58, "maple"],
      [88, 92, 112, 112, "maple"],
    ] as const;
    for (const [x0, y0, x1, y1, kind] of groves) {
      const here = forest.trees.filter(
        (t) => t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1,
      );
      expect(here.length).toBeGreaterThanOrEqual(18);
      expect(here.every((t) => t.kind === kind)).toBe(true);
    }
  });

  it("can be walked to every tree, and the lanes between them stay open", () => {
    const walkable = forest.reachable(forest.entry("from_farm")!);
    for (const t of forest.trees) {
      const beside = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => walkable.has(`${t.x + dx!},${t.y + dy!}`));
      expect(beside, `tree at ${t.x},${t.y}`).toBe(true);
    }
    for (const r of forest.rocks)
      expect(
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => walkable.has(`${r.x + dx!},${r.y + dy!}`)),
      ).toBe(true);
  });

  it("starts with 40 rocks, 50 twigs and 60 weeds placed by hand", () => {
    expect(forest.rocks.length).toBe(40);
    expect(forest.litter.twigs.length).toBe(50);
    expect(forest.litter.weeds.length).toBe(60);
  });

  it("has 56 forage spots and the 48 point onion bank", () => {
    const bank = forest.forageSpots.filter(
      (s) => forest.forageTableAt(s.x, s.y) === "onion-bank",
    );
    expect(bank.length).toBe(48);
    expect(forest.forageSpots.length - bank.length).toBe(56);
    for (const s of bank) {
      expect(s.x).toBeGreaterThanOrEqual(96);
      expect(s.x).toBeLessThanOrEqual(103);
      expect(s.y).toBeGreaterThanOrEqual(72);
      expect(s.y).toBeLessThanOrEqual(77);
    }
  });
});

describe("the Forest forage table", () => {
  const area = FORAGE_AREAS["forest"]!;

  it("caps the morning at 6 goods and keeps rare finds rare", () => {
    expect(forageCap(area, "spring")).toBe(6);
    const spring = area.tables["default"]!.spring!;
    expect(spring.reduce((n, w) => n + w.weight, 0)).toBe(100);
    expect(spring.find((w) => w.id === "morel")!.weight).toBe(5);
  });

  it("scatters at most 6 goods, and the onion bank fills in spring only", () => {
    const g = newGame();
    const w = g.areas["forest"]!;
    for (const season of ["spring", "summer", "fall", "winter"] as const) {
      w.forage.respawnArea(
        "forest",
        season,
        forest.forageSpots,
        (s) => forest.forageTableAt(s.x, s.y),
        Math.random,
      );
      const goods = [...w.forage.each()];
      const onions = goods.filter((f) => f.id === "spring-onion");
      expect(goods.length - onions.length).toBeLessThanOrEqual(6);
      expect(onions.length).toBe(season === "spring" ? 48 : 0);
    }
  });

  it("is picked up from the Forest's own field, not the farm's", () => {
    const g = newGame();
    respawnAreaForage(g, always);
    const spot = [...g.areas["forest"]!.forage.each()][0]!;
    expect(g.forage.itemAt(spot.x, spot.y)).toBeUndefined();
    enterArea(g, "forest");
    expect(g.forage.itemAt(spot.x, spot.y)).toBe(spot.id);
    expect(forage(g, spot.x, spot.y).ok).toBe(true);
    expect(g.inventory.count(spot.id)).toBeGreaterThan(0);
    expect(g.forage.itemAt(spot.x, spot.y)).toBeUndefined();
  });
});

describe("area worlds", () => {
  it("finds the Forest by its wild property", () => {
    expect(areaMaps()).toEqual([
      "delta",
      "forest",
      "mountain",
      "quarry",
      "secret-woods",
    ]);
    expect(isAreaMap("forest")).toBe(true);
    expect(isAreaMap("farm")).toBe(false);
    expect(isAreaMap("nowhere")).toBe(false);
  });

  it("starts a new game with the Forest's trees, rocks, weeds and twigs", () => {
    const g = newGame();
    const w = g.areas["forest"]!;
    expect(w.trees.count).toBe(152);
    expect(w.rocks.count).toBe(40);
    expect(w.weeds.count).toBe(60);
    expect(w.twigs.count).toBe(50);
    expect(w.trees.each().next().value).toMatchObject({ kind: "oak" });
  });

  it("swaps the Forest in and the farm back, leaving the farm alone", () => {
    const g = newGame();
    const farmTrees = g.trees;
    const farmCount = g.trees.count;
    enterArea(g, "forest");
    expect(areaOf(g)).toBe("forest");
    expect(g.trees).toBe(g.areas["forest"]!.trees);
    expect(g.trees).not.toBe(farmTrees);
    // The farm's soil, sprinklers and machines are out of reach here.
    expect(g.farm.cropCount).toBe(0);
    expect(g.sprinklers.count).toBe(0);
    const t = forest.trees.find((s) => s.stage === 5)!;
    g.toolTiers.axe = 4;
    for (let i = 0; i < swingsToFell(4); i++)
      useHeld(g, forest, { kind: "tool", tool: "axe" }, t.x, t.y);
    expect(g.trees.at(t.x, t.y)?.stump).toBe(true);
    expect(g.inventory.count("wood")).toBeGreaterThan(0);
    leaveArea(g);
    expect(areaOf(g)).toBeUndefined();
    expect(g.trees).toBe(farmTrees);
    expect(g.trees.count).toBe(farmCount);
    expect(g.areas["forest"]!.trees.at(t.x, t.y)?.stump).toBe(true);
  });

  it("chops, breaks and clears on a map with no soil", () => {
    const g = newGame();
    enterArea(g, "forest");
    const weed = forest.litter.weeds[0]!;
    expect(
      useHeld(g, forest, { kind: "tool", tool: "axe" }, weed.x, weed.y).ok,
    ).toBe(true);
    expect(g.weeds.at(weed.x, weed.y)).toBe(false);
    const rock = forest.rocks[0]!;
    expect(
      useHeld(g, forest, { kind: "tool", tool: "pickaxe" }, rock.x, rock.y).ok,
    ).toBe(true);
    // The hoe digs nothing here.
    const open = forest.entry("from_farm")!;
    expect(
      useHeld(g, forest, { kind: "tool", tool: "hoe" }, open.x, open.y).ok,
    ).toBe(false);
  });

  it("saves the farm's world from inside the Forest, and the Forest's own", () => {
    const g = newGame();
    g.trees.add(5, 5, MATURE_STAGE);
    const farmCount = g.trees.count;
    enterArea(g, "forest");
    const t = forest.trees.find((s) => s.stage === 5)!;
    g.trees.remove(t.x, t.y);
    g.weeds.add(60, 60);
    const loaded = deserialize(serialize(g))!;
    expect(loaded.trees.count).toBe(farmCount);
    expect(loaded.trees.at(5, 5)).toBeDefined();
    expect(loaded.weeds.at(60, 60)).toBe(false);
    const w = loaded.areas["forest"]!;
    expect(w.trees.at(t.x, t.y)).toBeUndefined();
    expect(w.trees.count).toBe(151);
    expect(w.weeds.at(60, 60)).toBe(true);
    expect(loaded.farm.cropCount).toBe(g.away!.home.farm.cropCount);
  });

  it("gives an old save the Forest's starting world", () => {
    const g = newGame();
    const data = JSON.parse(serialize(g)) as Record<string, unknown>;
    delete data["areas"];
    const old = deserialize(JSON.stringify(data))!;
    expect(old.areas["forest"]!.trees.count).toBe(152);
  });
});

describe("grove regrowth (SC-30)", () => {
  const spots = [
    { x: 1, y: 1, stage: 5, kind: "maple" as const },
    { x: 3, y: 1, stage: 5, kind: "maple" as const },
  ];

  it("sprouts a seed of the same kind on an empty grove spot 20 percent of nights", () => {
    const trees = new Trees();
    trees.add(3, 1, MATURE_STAGE);
    expect(regrowGroves(trees, spots, never, () => true)).toBe(0);
    expect(trees.at(1, 1)).toBeUndefined();
    expect(regrowGroves(trees, spots, always, () => true)).toBe(1);
    expect(trees.at(1, 1)).toMatchObject({ stage: SEED_STAGE, kind: "maple" });
    // A stump still stands there: nothing sprouts until it is uprooted.
    expect(trees.at(3, 1)?.stage).toBe(MATURE_STAGE);
  });

  it("waits while something else lies on the spot", () => {
    const trees = new Trees();
    expect(regrowGroves(trees, spots, always, () => false)).toBe(0);
  });

  it("grows a felled grove back to mature trees within a few weeks", () => {
    const g = newGame();
    const w = g.areas["forest"]!;
    for (const t of [...w.trees.each()]) w.trees.remove(t.x, t.y);
    expect(w.trees.count).toBe(0);
    let rolls = 0;
    // A fixed, repeatable run of rolls.
    const random = () => ((rolls++ * 0.6180339887) % 1) as number;
    for (let day = 0; day < 90; day++) {
      g.day.clock.day += 1;
      areasEndDay(g, random);
    }
    expect(w.trees.count).toBeGreaterThan(100);
    const mature = [...w.trees.each()].filter((t) => t.stage === MATURE_STAGE);
    expect(mature.length).toBeGreaterThan(20);
    // Every tree stands on a spot the map placed, so the groves stay in place.
    const placed = new Set(forest.trees.map((s) => `${s.x},${s.y}`));
    for (const t of w.trees.each())
      expect(placed.has(`${t.x},${t.y}`)).toBe(true);
  });
});

describe("the night and the Forest", () => {
  it("sleeping scatters the Forest's own forage and works on the farm first", () => {
    const g = newGame();
    enterArea(g, "forest");
    const farm = homeWorld(g);
    const before = g.areas["forest"]!.trees.count;
    sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    // Passing out away from home put the farm's world back.
    expect(areaOf(g)).toBeUndefined();
    expect(g.trees).toBe(farm.trees);
    const spring = dateOf(g.day.clock.day).season === "spring";
    const goods = [...g.areas["forest"]!.forage.each()];
    const onions = goods.filter((f) => f.id === "spring-onion");
    expect(goods.length - onions.length).toBeLessThanOrEqual(6);
    expect(onions.length).toBe(spring ? 48 : 0);
    // Trees do not spread on their own in the groves.
    expect(g.areas["forest"]!.trees.count).toBeGreaterThanOrEqual(before);
  });

  it("chopping a whole tree in the Forest gives its wood", () => {
    const g = newGame();
    enterArea(g, "forest");
    g.toolTiers.axe = 4;
    const t = forest.trees.find((s) => s.stage === 5)!;
    for (let i = 0; i < swingsToFell(4); i++)
      chop(g, t.x, t.y, Math.random, forest);
    expect(g.inventory.count("wood")).toBeGreaterThanOrEqual(12);
    expect(g.trees.at(t.x, t.y)?.stump).toBe(true);
  });
});

describe("weed and twig objects", () => {
  const small = (cls: string, x: number, collide: number) => ({
    width: 3,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    properties: [{ name: "wild", value: true }],
    layers: [
      {
        name: "collision",
        type: "tilelayer",
        data: [0, collide, 0, 0, 0, 0, 0, 0, 0],
      },
      {
        name: "markers",
        type: "objectgroup",
        objects: [
          { name: "in", class: "entry", x: 0, y: 32, width: 0, height: 0 },
          { name: "w", class: cls, x: x * 16 + 8, y: 8, width: 0, height: 0 },
        ],
      },
    ],
  });

  it("reads them as litter and checks where they lie", () => {
    const ok = FarmMap.fromTiled(small("weed", 0, 1));
    expect(ok.litter.weeds).toEqual([{ x: 0, y: 0 }]);
    expect(ok.wild).toBe(true);
    expect(ok.problems()).toEqual([]);
    const twig = FarmMap.fromTiled(small("twig", 0, 1));
    expect(twig.litter.twigs).toEqual([{ x: 0, y: 0 }]);
    const bad = FarmMap.fromTiled(small("twig", 1, 1));
    expect(bad.problems().join()).toContain("twig at 1,0 is on a blocked");
  });
});
