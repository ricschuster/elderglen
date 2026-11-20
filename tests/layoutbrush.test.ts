import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapFiles } from "../src/content/maps";
import {
  BRUSHES,
  PATH_TILE,
  applyBrush,
  doorCell,
  rectOf,
} from "../src/core/layoutbrush";
import { saveProblems } from "../src/core/layoutedit";
import { WATER_TILE, type TiledMapJson } from "../src/core/map";
import { MapRegistry } from "../src/core/maps";
import { formatMap } from "../src/layout/mapformat";

const base = mapFiles["farm"]!;
const layer = (j: TiledMapJson, n: string) =>
  j.layers.find((l) => l.name === n)!;
const cell = (j: TiledMapJson, n: string, x: number, y: number) =>
  layer(j, n).data![y * j.width + x];
/** A rectangle of ground-only tiles, clear of every object, found by search. */
const spot = (() => {
  const reg = MapRegistry.fromTiled(mapFiles).get("farm");
  for (let y = 2; y < base.height - 8; y++)
    for (let x = 2; x < base.width - 8; x++) {
      let ok = true;
      for (let dy = 0; dy < 6 && ok; dy++)
        for (let dx = 0; dx < 6 && ok; dx++)
          ok = !reg.isBlocked(x + dx, y + dy);
      if (ok) return { x: x + 1, y: y + 1, w: 3, h: 3 };
    }
  throw new Error("no clear spot");
})();

describe("block-out brushes", () => {
  it("water writes ground, collision and a water object", () => {
    const out = applyBrush(base, "water", spot, { waterKind: "lake" });
    expect(cell(out, "ground", spot.x, spot.y)).toBe(WATER_TILE);
    expect(cell(out, "collision", spot.x + 2, spot.y + 2)).toBe(1);
    const w = out.layers
      .flatMap((l) => l.objects ?? [])
      .find((o) => o.class === "water" && o.name.startsWith("water-"))!;
    expect(w.width).toBe(48);
    expect(w.properties?.find((p) => p.name === "kind")?.value).toBe("lake");
  });

  it("path writes ground and paths and clears collision", () => {
    const out = applyBrush(base, "path", spot);
    expect(cell(out, "ground", spot.x, spot.y)).toBe(PATH_TILE);
    expect(cell(out, "paths", spot.x, spot.y)).toBe(1);
    expect(cell(out, "collision", spot.x, spot.y)).toBe(0);
  });

  it("building blocks the footprint and leaves a door at the chosen face", () => {
    const out = applyBrush(base, "building", spot, { face: "s" });
    const d = doorCell(spot, "s");
    expect(d).toMatchObject({ x: spot.x + 1, y: spot.y + 2 });
    expect(cell(out, "collision", spot.x, spot.y)).toBe(1);
    expect(cell(out, "collision", d.x, d.y)).toBe(0);
    const n = applyBrush(base, "building", spot, { face: "n", interior: true });
    expect(cell(n, "collision", spot.x + 1, spot.y - 1)).toBe(0);
  });

  it("pad adds a pad region, soil fills, erase clears", () => {
    const pad = applyBrush(base, "pad", spot);
    const r = pad.layers
      .flatMap((l) => l.objects ?? [])
      .find((o) => o.name.startsWith("pad-"))!;
    expect(r.class).toBe("region");
    expect(r.properties?.find((p) => p.name === "pad")?.value).toBe("true");
    const soil = applyBrush(base, "soil", spot);
    expect(cell(soil, "soil", spot.x, spot.y)).toBe(1);
    const gone = applyBrush(soil, "erase", spot, { eraseLayer: "soil" });
    expect(cell(gone, "soil", spot.x, spot.y)).toBe(0);
  });

  it("clips a drag to the map and does not touch its input", () => {
    const r = rectOf(base, { x: -3, y: 4 }, { x: 5, y: 999 });
    expect(r).toEqual({ x: 0, y: 4, w: 6, h: base.height - 4 });
    const before = JSON.stringify(base);
    for (const b of BRUSHES) applyBrush(base, b, spot);
    expect(JSON.stringify(base)).toBe(before);
  });

  it("creates a missing soil layer on a map without one", () => {
    const hall = mapFiles["hall"]!;
    const out = applyBrush(hall, "soil", { x: 1, y: 1, w: 2, h: 2 });
    expect(layer(out, "soil").data![hall.width + 1]).toBe(1);
    expect(
      MapRegistry.fromTiled({ ...mapFiles, hall: out }).problems(),
    ).toEqual(MapRegistry.fromTiled(mapFiles).problems());
  });
});

describe("a brush result passes the hard checks", () => {
  for (const b of [
    "water",
    "path",
    "building",
    "pad",
    "soil",
    "erase",
  ] as const)
    it(`${b} on a clear pad`, () => {
      const out = applyBrush(base, b, spot);
      expect(saveProblems(mapFiles, "farm", out)).toEqual([]);
    });

  it("a building over an exit is refused by the checks", () => {
    const hall = mapFiles["hall"]!;
    const exit = hall.layers
      .flatMap((l) => l.objects ?? [])
      .find((o) => o.class === "exit")!;
    const out = applyBrush(hall, "building", {
      x: Math.floor(exit.x / 16),
      y: Math.floor(exit.y / 16),
      w: 2,
      h: 2,
    });
    expect(saveProblems(mapFiles, "hall", out).length).toBeGreaterThan(0);
  });
});

describe("a save after a brush", () => {
  it("changes only the painted layer and the added object", async () => {
    const text = readFileSync("src/content/maps/farm.json", "utf8");
    const out = applyBrush(base, "soil", spot);
    for (const l of base.layers) {
      if (l.name === "soil") continue;
      expect(JSON.stringify(layer(out, l.name))).toBe(JSON.stringify(l));
    }
    expect(out.layers.length).toBe(base.layers.length);
    const a = (await formatMap(".", base, text)).split("\n");
    const b = (await formatMap(".", out, text)).split("\n");
    expect(a.join("\n")).toBe(text);
    expect(b.length).toBeGreaterThan(0);
    // Only soil data lines differ.
    const changed = b.filter((line, i) => line !== a[i]);
    expect(changed.length).toBeLessThanOrEqual(spot.h * 3 + 3);
  }, 30_000);
});
