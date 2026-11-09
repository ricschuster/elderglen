import { describe, expect, it } from "vitest";
import {
  FarmMap,
  exitOpen,
  type Exit,
  type TiledMapJson,
  type TiledObject,
} from "../src/core/map";
import { mapFiles, maps } from "../src/content/maps";
import rooms from "../src/content/rooms.json";

// A 5 by 4 map: a wall column at x=2 with a gap at y=3, soil on the left.
//   . . # . .
//   . . # . .
//   . . # . .
//   . . . . .
const W = 5;
const H = 4;
const blocked = new Array(W * H).fill(0);
for (let y = 0; y < 3; y++) blocked[y * W + 2] = 1;
const soil = new Array(W * H).fill(0);
for (let y = 0; y < H; y++) soil[y * W] = 1;

const object = (cls: string, name: string, x: number, y: number) =>
  ({ name, class: cls, x: x * 16 + 8, y: y * 16 + 8 }) as TiledObject;

const exit = (
  name: string,
  x: number,
  y: number,
  props: Record<string, string> = { map: "inn", entry: "door" },
) =>
  ({
    ...object("exit", name, x, y),
    x: x * 16,
    y: y * 16,
    width: 16,
    height: 16,
    properties: Object.entries(props).map(([k, value]) => ({ name: k, value })),
  }) as TiledObject;

function fixture(objects: TiledObject[], overrides = {}): TiledMapJson {
  return {
    width: W,
    height: H,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { name: "ground", type: "tilelayer", data: new Array(W * H).fill(1) },
      { name: "collision", type: "tilelayer", data: blocked },
      { name: "soil", type: "tilelayer", data: soil },
      { name: "markers", type: "objectgroup", objects },
    ],
    ...overrides,
  };
}

const service = (name: string, x: number, y: number, kind = "shop") =>
  ({
    ...object("service", name, x, y),
    properties: [{ name: "kind", value: kind }],
  }) as TiledObject;

const good = [
  object("entry", "start", 0, 0),
  exit("shop", 4, 0, { map: "shop", entry: "door", requires: "bridge" }),
  object("forage", "forage", 4, 2),
];

describe("FarmMap.fromTiled", () => {
  const map = FarmMap.fromTiled(fixture(good));

  it("reads size, collision and soil", () => {
    expect([map.width, map.height, map.tileSize]).toEqual([5, 4, 16]);
    expect(map.isBlocked(2, 0)).toBe(true);
    expect(map.isBlocked(2, 3)).toBe(false);
    expect(map.isTillable(0, 2)).toBe(true);
    expect(map.isTillable(1, 2)).toBe(false);
  });

  it("treats outside the map as blocked and not tillable", () => {
    expect(map.isBlocked(-1, 0)).toBe(true);
    expect(map.isBlocked(0, H)).toBe(true);
    expect(map.isTillable(-1, 0)).toBe(false);
  });

  it("reads entries, exits and forage spots in tiles", () => {
    expect(map.entries).toEqual([{ name: "start", x: 0, y: 0 }]);
    expect(map.entry("start")).toEqual({ name: "start", x: 0, y: 0 });
    expect(map.entry("nope")).toBeUndefined();
    expect(map.exits).toEqual([
      {
        id: "shop",
        x: 4,
        y: 0,
        w: 1,
        h: 1,
        map: "shop",
        entry: "door",
        requires: "bridge",
      },
    ]);
    expect(map.forageSpots).toEqual([{ x: 4, y: 2 }]);
    expect(map.exitAt(4, 0)?.id).toBe("shop");
    expect(map.exitAt(3, 0)).toBeUndefined();
  });

  it("reads services and finds them by tile", () => {
    const withService = FarmMap.fromTiled(
      fixture([...good, service("counter", 3, 1, "hall")]),
    );
    expect(withService.services).toEqual([
      { id: "counter", kind: "hall", x: 3, y: 1 },
    ]);
    expect(withService.serviceAt(3, 1)?.kind).toBe("hall");
    expect(withService.serviceAt(3, 2)).toBeUndefined();
  });

  it("opens an exit only when its condition holds", () => {
    const gated = map.exits[0] as Exit;
    expect(exitOpen(gated, new Set())).toBe(false);
    expect(exitOpen(gated, new Set(["bridge"]))).toBe(true);
    expect(exitOpen({ ...gated, requires: undefined }, new Set())).toBe(true);
  });

  it("accepts the older Tiled `type` in place of `class`", () => {
    const old = { name: "start", type: "entry", x: 8, y: 8 };
    expect(FarmMap.fromTiled(fixture([old])).entries).toEqual([
      { name: "start", x: 0, y: 0 },
    ]);
  });

  it("walks around the wall through the gap", () => {
    const seen = map.reachable({ x: 0, y: 0 });
    expect(seen.has("4,0")).toBe(true);
    expect(seen.has("2,0")).toBe(false);
  });

  it("is usable", () => {
    expect(map.problems()).toEqual([]);
  });

  it("does not need a soil layer", () => {
    const json = fixture(good);
    json.layers = json.layers.filter((l) => l.name !== "soil");
    const bare = FarmMap.fromTiled(json);
    expect(bare.hasSoil).toBe(false);
    expect(bare.isTillable(0, 0)).toBe(false);
    expect(bare.problems()).toEqual([]);
  });
});

describe("FarmMap errors", () => {
  it("rejects a missing collision layer", () => {
    const json = fixture(good);
    json.layers = json.layers.filter((l) => l.name !== "collision");
    expect(() => FarmMap.fromTiled(json)).toThrow(/"collision"/);
  });

  it("rejects a layer of the wrong size", () => {
    const json = fixture(good);
    json.layers[1] = { name: "collision", type: "tilelayer", data: [0, 1] };
    expect(() => FarmMap.fromTiled(json)).toThrow(/size of the map/);
  });

  it("rejects tiles that are not square", () => {
    expect(() => FarmMap.fromTiled(fixture(good, { tileheight: 8 }))).toThrow(
      /square/,
    );
  });
});

describe("FarmMap.problems", () => {
  const problems = (objects: TiledObject[]) =>
    FarmMap.fromTiled(fixture(objects)).problems();

  it("wants at least one entry", () => {
    expect(problems([])).toEqual(["needs at least one entry"]);
  });

  it("flags duplicate or missing names", () => {
    expect(
      problems([object("entry", "a", 0, 0), object("entry", "a", 1, 0)]),
    ).toContain("entry names must be unique");
    expect(problems([object("entry", "", 0, 0)])).toContain(
      "every entry needs a name",
    );
    expect(
      problems([object("entry", "a", 0, 0), exit("x", 0, 1), exit("x", 0, 2)]),
    ).toContain("exit names must be unique");
  });

  it("flags a service with no name or kind, or a duplicate", () => {
    const entry = object("entry", "a", 0, 0);
    expect(problems([entry, service("", 3, 0)])).toContain(
      "every service needs a name",
    );
    expect(problems([entry, service("c", 3, 0, "")])).toContain(
      'service "c" needs a kind',
    );
    expect(problems([entry, service("c", 3, 0), service("c", 4, 0)])).toContain(
      "service names must be unique",
    );
    expect(problems([entry, service("c", 3, 0)])).toEqual([]);
  });

  it("flags a blocked entry or one inside an exit", () => {
    expect(problems([object("entry", "a", 2, 0)])).toContain(
      'entry "a" is blocked',
    );
    expect(problems([object("entry", "a", 0, 1), exit("x", 0, 1)])).toContain(
      'entry "a" is inside an exit',
    );
  });

  it("flags an exit with no target", () => {
    expect(
      problems([object("entry", "a", 0, 0), exit("x", 0, 1, { map: "inn" })]),
    ).toContain('exit "x" needs a map and an entry');
  });

  it("flags an exit or forage spot walled off from any entry", () => {
    const sealed = fixture(good);
    sealed.layers[1] = {
      name: "collision",
      type: "tilelayer",
      data: blocked.map((b, i) => (i % W === 2 ? 1 : b)),
    };
    const out = FarmMap.fromTiled(sealed).problems();
    expect(out).toContain('exit "shop" cannot be reached from entry "start"');
    expect(out).toContain(
      'forage spot 4,2 cannot be reached from entry "start"',
    );
  });

  it("checks reachability from every entry", () => {
    const sealed = fixture([
      object("entry", "left", 0, 0),
      object("entry", "right", 4, 1),
      exit("x", 4, 0),
    ]);
    sealed.layers[1] = {
      name: "collision",
      type: "tilelayer",
      data: blocked.map((b, i) => (i % W === 2 ? 1 : b)),
    };
    expect(FarmMap.fromTiled(sealed).problems()).toEqual([
      'exit "x" cannot be reached from entry "left"',
    ]);
  });
});

// The contract check for the maps in use. It asserts the map contract only,
// never the layout, so real maps can replace the placeholders.
describe("the maps in use", () => {
  it("meet the map contract", () => {
    expect(maps.problems()).toEqual([]);
  });

  it("include a farm with soil, forage and a way out", () => {
    const farm = maps.get("farm");
    expect(farm.hasSoil).toBe(true);
    expect(farm.forageSpots.length).toBeGreaterThan(0);
    expect(farm.exits.length).toBeGreaterThan(0);
  });

  it("have a bed to sleep in", () => {
    const beds = maps.ids.flatMap((id) =>
      maps.get(id).services.filter((s) => s.kind === "bed"),
    );
    expect(beds.length).toBeGreaterThan(0);
  });

  it("have one file per map id", () => {
    expect(maps.ids.sort()).toEqual(Object.keys(mapFiles).sort());
  });
});

// The hall interior (docs/design/40_hall_layout.md): one scroll per room, each
// named for its room, and a way back to the farm from the farm's hall door.
describe("the hall map", () => {
  it("has one scroll for each room", () => {
    const names = maps
      .get("hall")
      .services.map((s) => s.id)
      .sort();
    expect(names).toEqual(rooms.map((r) => r.id).sort());
  });

  it("has a footprint for each room and a plaque with a mark per room", () => {
    const { regions } = maps.get("hall");
    for (const room of rooms)
      expect(
        regions.find((r) => r.id === room.id),
        room.id,
      ).toBeDefined();
    expect(regions.find((r) => r.id === "plaque")?.w).toBe(rooms.length);
  });

  it("joins Hearthwell's hall door", () => {
    const door = maps.get("hearthwell").exits.find((e) => e.id === "hall");
    expect(door).toMatchObject({ map: "hall", entry: "door" });
    expect(maps.get("farm").exits.find((e) => e.id === "hall")).toBeUndefined();
    expect(maps.get("hall").exits[0]).toMatchObject({
      map: "hearthwell",
      entry: "from_hall",
    });
  });
});
