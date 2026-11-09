import { describe, expect, it } from "vitest";
import {
  FarmMap,
  conditionsOf,
  type TiledLayer,
  type TiledMapJson,
  type TiledObject,
} from "../src/core/map";
import { MapRegistry } from "../src/core/maps";
import { newGame, serialize, deserialize } from "../src/core/save";
import { maps } from "../src/content/maps";
import { Trees } from "../src/core/trees";
import { chop } from "../src/core/actions";
import { useHeld } from "../src/core/tools";
import { chopLog, logCleared, LOG_HARDWOOD, LOG_XP } from "../src/core/logs";
import { holdsOf, hasFlag } from "../src/core/worldflags";
import { potKindOf, fishAvailable, FISH } from "../src/core/fishing";
import { ForageField } from "../src/core/forage";
import {
  forageAreaProblems,
  forageCap,
  forageWeights,
  FORAGE_AREAS,
  type ForageArea,
} from "../src/core/forageareas";
import { forageById } from "../src/core/forage";
import { FORAGE } from "../src/core/forage";
import {
  nightlySpawns,
  spawnAttempts,
  SPAWN_TABLES,
  type SpawnTable,
} from "../src/core/spawns";
import { BOARD_KINDS, CART_KIND } from "../src/core/map";

const W = 10;
const H = 8;
const props = (p: Record<string, string | number | boolean>) =>
  Object.entries(p).map(([name, value]) => ({ name, value }));
const obj = (
  cls: string,
  name: string,
  x: number,
  y: number,
  p: Record<string, string | number | boolean> = {},
  w = 1,
  h = 1,
): TiledObject => ({
  name,
  class: cls,
  x: x * 16,
  y: y * 16,
  width: w * 16,
  height: h * 16,
  properties: props(p),
});

/** Water fills x 6..8, y 1..3 (ground tile 4, blocked). */
function build(
  objects: TiledObject[],
  mapProps: Record<string, string | number | boolean> = {},
  extra: TiledLayer[] = [],
): TiledMapJson {
  const ground = new Array(W * H).fill(1);
  const collision = new Array(W * H).fill(0);
  for (let y = 1; y <= 3; y++)
    for (let x = 6; x <= 8; x++) {
      ground[y * W + x] = 4;
      collision[y * W + x] = 1;
    }
  return {
    width: W,
    height: H,
    tilewidth: 16,
    tileheight: 16,
    properties: props(mapProps),
    layers: [
      { name: "ground", type: "tilelayer", data: ground },
      { name: "collision", type: "tilelayer", data: collision },
      ...extra,
      {
        name: "objects",
        type: "objectgroup",
        objects: [obj("entry", "start", 0, 0), ...objects],
      },
    ],
  };
}

describe("1 water kinds", () => {
  const json = build(
    [obj("water", "lake", 6, 1, { kind: "forest-lake" }, 2, 3)],
    { waterKind: "marsh-lake" },
  );
  const map = FarmMap.fromTiled(json);

  it("reads a zone, the default and land", () => {
    expect(map.waterKindAt(6, 1)).toBe("forest-lake");
    expect(map.waterKindAt(8, 2)).toBe("marsh-lake");
    expect(map.waterKindAt(0, 0)).toBeUndefined();
    expect(map.problems()).toEqual([]);
  });

  it("defaults to the river", () => {
    expect(FarmMap.fromTiled(build([])).waterKindAt(7, 2)).toBe("river");
  });

  it("the pot kind follows the kind", () => {
    expect(potKindOf("sea")).toBe("salt");
    expect(potKindOf("cove")).toBe("fresh");
    expect(potKindOf("forest-lake")).toBe("fresh");
    expect(potKindOf("river")).toBe("fresh");
  });

  it("the fish table reads the kind", () => {
    const c = { season: "spring", minutes: 12 * 60, raining: false } as const;
    expect(fishAvailable("river", c).length).toBeGreaterThan(0);
    expect(fishAvailable("sea", c).every((f) => f.water === "sea")).toBe(true);
    // The river, the Forest lake, the Mountain lake, the delta's marsh lake, the sea and the cove have fish so far; each area adds its own.
    expect(
      FISH.every((f) =>
        [
          "river",
          "forest-lake",
          "mountain-lake",
          "marsh-lake",
          "sea",
          "cove",
        ].includes(f.water),
      ),
    ).toBe(true);
    expect(
      fishAvailable("forest-lake", c).every((f) => f.water === "forest-lake"),
    ).toBe(true);
  });

  it("flags a bad kind and a zone with no casting spot", () => {
    const bad = FarmMap.fromTiled(
      build([obj("water", "w", 6, 1, { kind: "puddle" }, 2, 3)]),
    );
    expect(bad.problems().join()).toContain('"puddle"');
    // A zone away from any water tile has nowhere to cast.
    const dry = FarmMap.fromTiled(
      build([obj("water", "w", 0, 5, { kind: "sea" }, 2, 2)]),
    );
    expect(dry.problems().join()).toContain("no walkable casting spot");
    const walled = build([obj("water", "w", 6, 1, { kind: "sea" }, 2, 3)]);
    // Wall the whole shore off: every water tile loses its casting spot.
    const col = walled.layers[1]!.data!;
    for (let y = 0; y < H; y++) for (let x = 3; x < W; x++) col[y * W + x] = 1;
    expect(
      FarmMap.fromTiled(walled)
        .problems()
        .some((p) => p.includes("casting spot")),
    ).toBe(true);
  });
});

describe("2 the massive log", () => {
  const json = build(
    [obj("log", "log", 3, 0, { flag: "secret-log-cleared" })],
    {},
  );
  // A wall down x=3, so the log's tile is the only way on.
  for (let y = 0; y < H; y++) json.layers[1]!.data![y * W + 3] = 1;
  const map = FarmMap.fromTiled(json);

  it("reads the log and counts it as passable for reachability", () => {
    expect(map.logAt(3, 0)?.flag).toBe("secret-log-cleared");
    expect(map.reachable({ x: 0, y: 0 }).has("4,0")).toBe(true);
  });

  it("needs a flag", () => {
    const m = FarmMap.fromTiled(build([obj("log", "log", 3, 3)]));
    expect(m.problems().join()).toContain("needs a flag");
  });

  it("needs a steel axe, then gives 8 hardwood and 25 XP once", () => {
    const g = newGame();
    const log = map.logAt(3, 0)!;
    g.toolTiers.axe = 1;
    expect(chopLog(g, log)).toEqual({
      ok: false,
      reason: "needs a better axe",
    });
    g.toolTiers.axe = 2;
    const before = g.inventory.count("hardwood");
    const xp = g.skills.xpOf("foraging");
    expect(chopLog(g, log).ok).toBe(true);
    expect(g.inventory.count("hardwood")).toBe(before + LOG_HARDWOOD);
    expect(g.skills.xpOf("foraging")).toBe(xp + LOG_XP);
    expect(logCleared(g, log)).toBe(true);
    expect(hasFlag(g, "secret-log-cleared")).toBe(true);
    expect(chopLog(g, log)).toEqual({ ok: false, reason: "cleared" });
    expect(g.inventory.count("hardwood")).toBe(before + LOG_HARDWOOD);
  });

  it("is chopped by the axe through useHeld, and the flag is saved", () => {
    const g = newGame();
    g.toolTiers.axe = 2;
    const r = useHeld(g, map, { kind: "tool", tool: "axe" }, 3, 0);
    expect(r.ok).toBe(true);
    expect(holdsOf(g).has("secret-log-cleared")).toBe(true);
    const back = deserialize(serialize(g));
    expect(back && hasFlag(back, "secret-log-cleared")).toBe(true);
  });
});

describe("3 per-map forage", () => {
  const area: ForageArea = {
    cap: { spring: 3, summer: 0 },
    tables: {
      default: { spring: [{ id: "leek", weight: 1 }] },
      marsh: { spring: [{ id: "dandelion", weight: 1 }] },
    },
  };
  const spots = [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0 }));
  const tableOf = (s: { x: number }) => (s.x >= 3 ? "marsh" : "default");

  it("fills up to the cap from each point's region table", () => {
    const f = new ForageField();
    f.respawnArea("x", "spring", spots, tableOf, () => 0.5, area);
    expect(f.count).toBe(3);
    for (const g of f.each())
      expect(g.id).toBe(g.x >= 3 ? "dandelion" : "leek");
  });

  it("a season the cap omits gives nothing; a map without an area uses the pool", () => {
    const f = new ForageField();
    f.respawnArea("x", "summer", spots, tableOf, () => 0.5, area);
    expect(f.count).toBe(0);
    expect(forageCap(area, "fall")).toBe(0);
    expect(forageWeights(area, "nope", "spring")).toEqual([]);
    f.respawnArea("farm", "spring", spots, tableOf, () => 0.99);
    expect(f.count).toBeLessThanOrEqual(2);
  });

  it("a point inside a region takes that region's table name", () => {
    const m = FarmMap.fromTiled(
      build([
        obj("region", "bog", 0, 4, { forage: "marsh" }, 4, 2),
        obj("forage", "f1", 1, 5),
        obj("forage", "f2", 5, 6),
      ]),
    );
    expect(m.forageTableAt(1, 5)).toBe("marsh");
    expect(m.forageTableAt(5, 6)).toBe("default");
  });

  it("checks the data: the shipped file and bad ones", () => {
    expect(
      forageAreaProblems(FORAGE_AREAS, (id) => forageById(id) !== undefined),
    ).toEqual([]);
    const bad = {
      m: { cap: -1, tables: { other: { spring: [{ id: "zzz", weight: 0 }] } } },
    };
    const p = forageAreaProblems(bad as never, (id) =>
      FORAGE.some((f) => f.id === id),
    );
    expect(p.length).toBe(4);
  });
});

describe("4 tree kind and 5 stump regrow", () => {
  const json = build(
    [
      obj("tree", "t1", 1, 1, { kind: "pine" }),
      obj("tree", "t2", 2, 1),
      obj("stump", "s1", 3, 1, { kind: "maple" }),
      obj("tree", "t3", 4, 1, { kind: "palm" }),
    ],
    { stumpRegrowDays: 1 },
  );
  const map = FarmMap.fromTiled(json);

  it("reads kinds and rejects an unknown one", () => {
    expect(map.trees.map((t) => t.kind)).toEqual([
      "pine",
      undefined,
      "maple",
      "palm",
    ]);
    expect(map.problems().join()).toContain('"palm"');
    const trees = new Trees(map.trees.slice(0, 3));
    expect(trees.at(1, 1)?.kind).toBe("pine");
    expect(trees.at(3, 1)?.kind).toBe("maple");
  });

  it("a map's days replace the farm type's", () => {
    const g = newGame(); // the standard farm regrows no stumps
    g.trees = new Trees([{ x: 3, y: 1, stage: 5, large: true }]);
    g.toolTiers.axe = 1;
    for (let i = 0; i < 20 && g.trees.at(3, 1)?.regrow === undefined; i++) {
      g.day.energy.current = 270;
      expect(chop(g, 3, 1, () => 0.5, map).ok).toBe(true);
    }
    expect(g.trees.at(3, 1)?.regrow).toBe(1);
  });

  it("without the property the farm type decides", () => {
    const g = newGame();
    g.trees = new Trees([{ x: 3, y: 1, stage: 5, large: true }]);
    g.toolTiers.axe = 1;
    const plain = FarmMap.fromTiled(build([]));
    expect(plain.stumpRegrowDays).toBeUndefined();
    for (let i = 0; i < 20 && g.trees.at(3, 1); i++) {
      g.day.energy.current = 270;
      chop(g, 3, 1, () => 0.5, plain);
    }
    expect(g.trees.at(3, 1)).toBeUndefined();
  });

  it("rejects bad days", () => {
    const m = FarmMap.fromTiled(build([], { stumpRegrowDays: -2 }));
    expect(m.problems().join()).toContain("stumpRegrowDays");
  });
});

describe("6 conditional layers", () => {
  const layer = (
    name: string,
    id: number,
    p: Record<string, string>,
  ): TiledLayer => ({
    name,
    type: "tilelayer",
    data: new Array(W * H).fill(id),
    properties: props(p),
  });
  // The bridge collision blocks the gap when broken, and not when mended.
  const json = build([], {}, [
    layer("ruin-art", 1, { unless: "bridge-mended" }),
    layer("repaired-art", 1, { when: "bridge-mended" }),
  ]);
  const withBlock = (): TiledMapJson => {
    const j = build([], {}, [
      {
        name: "collision-ruin",
        type: "tilelayer",
        data: new Array(W * H).fill(0),
        properties: props({ unless: "bridge-mended" }),
      },
    ]);
    return j;
  };

  it("lists the conditions a map uses", () => {
    expect(conditionsOf(json)).toEqual(["bridge-mended"]);
    expect(conditionsOf(build([]))).toEqual([]);
  });

  it("swaps layers by the conditions that hold", () => {
    const reg = MapRegistry.fromTiled({ farm: withBlock() });
    expect(reg.getWith("farm", new Set())).not.toBe(
      reg.getWith("farm", new Set(["bridge-mended"])),
    );
    expect(reg.getWith("farm", new Set(["other"]))).toBe(
      reg.getWith("farm", new Set()),
    );
  });

  it("a collision layer that only exists when a condition holds changes the walk", () => {
    const j = build([], {}, []);
    // A wall column at x=2, drawn as its own layer that vanishes when mended.
    const wall = new Array(W * H).fill(0);
    for (let y = 0; y < H; y++) wall[y * W + 2] = 1;
    j.layers.splice(2, 0, {
      name: "collision",
      type: "tilelayer",
      data: wall,
      properties: props({ unless: "bridge-mended" }),
    });
    const closed = FarmMap.fromTiled(j);
    const open = FarmMap.fromTiled(j, 0, new Set(["bridge-mended"]));
    expect(closed.isBlocked(2, 4)).toBe(true);
    expect(open.isBlocked(2, 4)).toBe(false);
  });

  it("the registry check runs with every condition true and false", () => {
    const j = build([
      obj("exit", "door", 5, 5, { map: "farm", entry: "start" }),
    ]);
    const wall = new Array(W * H).fill(0);
    for (let x = 0; x < W; x++) wall[3 * W + x] = 1;
    // A second collision layer that cuts the map in two unless the bridge is mended.
    j.layers.splice(2, 0, {
      name: "collision",
      type: "tilelayer",
      data: wall,
      properties: props({ unless: "bridge-mended" }),
    });
    const problems = MapRegistry.fromTiled({ farm: j }).problems();
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.includes("(all conditions false)"))).toBe(
      true,
    );
    expect(problems.join()).toContain('exit "door" cannot be reached');
  });
});

describe("7 rideable", () => {
  it("is false unless the map says so", () => {
    expect(FarmMap.fromTiled(build([])).rideable).toBe(false);
    expect(FarmMap.fromTiled(build([], { rideable: true })).rideable).toBe(
      true,
    );
  });

  it("the shipped outdoor maps ride, the interiors do not", () => {
    for (const id of ["farm", "farm-woodland", "green"])
      expect(maps.get(id).rideable).toBe(true);
    for (const id of ["house", "barn", "coop", "hall", "mine", "greenhouse"])
      expect(maps.get(id).rideable).toBe(false);
  });
});

describe("8 and 9 cart and board services", () => {
  it("places them, reached from the entry", () => {
    const kinds = [CART_KIND, ...BOARD_KINDS];
    const m = FarmMap.fromTiled(
      build(
        kinds.map((k, i) => obj("service", `s${i}`, 1 + i, 5, { kind: k })),
      ),
    );
    expect(m.services.map((s) => s.kind)).toEqual(kinds);
    expect(m.problems()).toEqual([]);
  });
});

describe("10 nightly spawns", () => {
  const table: SpawnTable = {
    attempts: 5,
    perYear: 1,
    maxAttempts: 8,
    kinds: [
      { kind: "rock", weight: 3 },
      { kind: "copper", weight: 1 },
    ],
  };
  const tiles = Array.from({ length: 100 }, (_, i) => ({
    x: i % 10,
    y: Math.floor(i / 10),
  }));
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  it("attempts rise by year up to the limit", () => {
    expect(spawnAttempts(table, 1)).toBe(5);
    expect(spawnAttempts(table, 3)).toBe(7);
    expect(spawnAttempts(table, 9)).toBe(8);
    expect(spawnAttempts({ ...table, perYear: undefined }, 4)).toBe(5);
  });

  it("spawns at most one per tile, on free tiles, by weight", () => {
    const out = nightlySpawns(table, 1, tiles, () => true, random);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(new Set(out.map((s) => `${s.x},${s.y}`)).size).toBe(out.length);
    let rock = 0;
    let total = 0;
    for (let i = 0; i < 400; i++)
      for (const s of nightlySpawns(table, 1, tiles, () => true, random)) {
        total++;
        if (s.kind === "rock") rock++;
      }
    expect(rock / total).toBeGreaterThan(0.65);
    expect(rock / total).toBeLessThan(0.85);
  });

  it("existing objects block a spawn", () => {
    const none = nightlySpawns(table, 1, tiles, () => false, random);
    expect(none).toEqual([]);
    const half = nightlySpawns(table, 1, tiles, (x) => x < 5, random);
    expect(half.every((s) => s.x < 5)).toBe(true);
  });

  it("an empty table or no tiles spawns nothing; the shipped data is valid", () => {
    expect(
      nightlySpawns({ ...table, kinds: [] }, 1, tiles, () => true, random),
    ).toEqual([]);
    expect(nightlySpawns(table, 1, [], () => true, random)).toEqual([]);
    for (const t of Object.values(SPAWN_TABLES))
      expect(spawnAttempts(t, 1)).toBeGreaterThan(0);
  });
});

describe("tablet load test (placeholder 120 by 120 map)", () => {
  // The SM-T500 run is by hand (see the note); this guards the reading cost
  // and the size of the check, which must stay cheap enough for a tablet.
  const N = 120;
  const big = (): TiledMapJson => {
    const cells = N * N;
    const ground = new Array(cells).fill(1);
    const collision = new Array(cells).fill(0);
    const soil = new Array(cells).fill(0);
    for (let i = 0; i < cells; i++)
      if ((i % N) % 5 === 0 && Math.floor(i / N) % 2 === 0 && i < N * 50)
        collision[i] = 1;
    for (let y = 10; y < 30; y++)
      for (let x = 10; x < 50; x++) {
        ground[y * N + x] = 4;
        collision[y * N + x] = 1;
      }
    const objects: TiledObject[] = [obj("entry", "start", 1, 1)];
    for (let i = 0; i < 400; i++)
      objects.push(
        obj("forage", `f${i}`, 60 + (i % 40), 60 + Math.floor(i / 40)),
      );
    for (let i = 0; i < 300; i++)
      objects.push(
        obj("tree", `t${i}`, 70 + (i % 30), 80 + Math.floor(i / 30), {
          kind: "oak",
        }),
      );
    objects.push(
      obj("water", "lake", 10, 10, { kind: "mountain-lake" }, 40, 20),
    );
    return {
      width: N,
      height: N,
      tilewidth: 16,
      tileheight: 16,
      properties: props({ rideable: true }),
      layers: [
        { name: "ground", type: "tilelayer", data: ground },
        { name: "collision", type: "tilelayer", data: collision },
        { name: "soil", type: "tilelayer", data: soil },
        {
          name: "art",
          type: "tilelayer",
          data: ground,
          properties: props({ when: "cove-open" }),
        },
        { name: "objects", type: "objectgroup", objects },
      ],
    };
  };

  it("reads and checks a 120 by 120 map with both condition readings quickly", () => {
    const t0 = performance.now();
    const reg = MapRegistry.fromTiled({ big: big() });
    const m = reg.getWith("big", new Set(["cove-open"]));
    const problems = reg.problems();
    const ms = performance.now() - t0;
    expect(m.width).toBe(N);
    expect(m.waterKindAt(20, 15)).toBe("mountain-lake");
    expect(problems.filter((p) => !p.includes("start map"))).toEqual([]);
    // Generous: a tablet is several times slower than the test machine.
    expect(ms).toBeLessThan(2000);
  });
});
