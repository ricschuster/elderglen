import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { SPOUSE_HOLD } from "../src/core/house";
import { conditionsOf } from "../src/core/map";

// The spouse's corner on the farm (note 85, "The outside corner"; build plan 5).

const ZONE = { x: 70, y: 4, w: 2, h: 8 };
const SPOUSE = new Set([SPOUSE_HOLD]);
const NONE = new Set<string>();
const CLUTTER = ["twig", "tree", "rock", "weed", "stump", "forage", "log"];

const objects = () => {
  const json = mapFiles.farm!;
  const out: { name: string; cls: string; x: number; y: number }[] = [];
  for (const l of json.layers)
    for (const o of l.objects ?? [])
      out.push({
        name: o.name,
        cls: o.class ?? o.type ?? "",
        x: Math.floor(o.x / json.tilewidth),
        y: Math.floor(o.y / json.tileheight),
      });
  return out;
};
const inZone = (x: number, y: number) =>
  x >= ZONE.x && x < ZONE.x + ZONE.w && y >= ZONE.y && y < ZONE.y + ZONE.h;

describe("the farm's spouse corner", () => {
  it("has the zone at x 70 to 71, y 4 to 11 on the markers layer", () => {
    const json = mapFiles.farm!;
    const markers = json.layers.find((l) => l.name === "markers")!;
    const zone = markers.objects!.find((o) => o.name === "spouse-corner")!;
    expect(zone.class).toBe("zone");
    expect([
      zone.x / 16,
      zone.y / 16,
      zone.width! / 16,
      zone.height! / 16,
    ]).toEqual([ZONE.x, ZONE.y, ZONE.w, ZONE.h]);
  });

  it("puts the idle mark at (70, 9), only while married", () => {
    const names = (holds: Set<string>) =>
      maps
        .marksWith("farm", holds)
        .marks.filter((m) => m.name.startsWith("spouse"));
    expect(names(NONE)).toEqual([]);
    expect(names(SPOUSE)).toEqual([
      { name: "spouse-corner-idle", x: 70, y: 9 },
    ]);
  });

  it("reads the spouse condition", () => {
    expect(conditionsOf(mapFiles.farm!)).toEqual([SPOUSE_HOLD]);
  });

  it("starts as clear grass: no clutter, no block, in the zone", () => {
    for (const o of objects())
      if (CLUTTER.includes(o.cls))
        expect(inZone(o.x, o.y), `${o.cls} at ${o.x},${o.y}`).toBe(false);
    const m = maps.getWith("farm", NONE);
    for (let y = ZONE.y; y < ZONE.y + ZONE.h; y++)
      for (let x = ZONE.x; x < ZONE.x + ZONE.w; x++)
        expect(m.isBlocked(x, y), `${x},${y}`).toBe(false);
  });

  it("adds props only inside rows 4 to 8, and leaves the way in (rows 10, 11)", () => {
    const plain = maps.getWith("farm", NONE);
    const wed = maps.getWith("farm", SPOUSE);
    let props = 0;
    for (let y = 0; y < wed.height; y++)
      for (let x = 0; x < wed.width; x++)
        if (plain.isBlocked(x, y) !== wed.isBlocked(x, y)) {
          props++;
          expect(inZone(x, y) && y >= 4 && y <= 8, `${x},${y}`).toBe(true);
        }
    expect(props).toBeGreaterThan(0);
    for (const y of [10, 11])
      for (const x of [70, 71]) expect(wed.isBlocked(x, y)).toBe(false);
  });

  it("is reachable from the house door, the mailbox road and the start", () => {
    const wed = maps.getWith("farm", SPOUSE);
    for (const entry of ["start", "from_house", "from_hearthwell"]) {
      const reach = wed.reachable(wed.entry(entry)!);
      expect(reach.has("70,9"), entry).toBe(true);
      expect(reach.has("70,4"), entry).toBe(true);
    }
  });

  it("keeps the farm free of map problems with the spouse true and false", () => {
    for (const holds of [NONE, SPOUSE])
      expect(maps.getWith("farm", holds).problems()).toEqual([]);
  });
});
