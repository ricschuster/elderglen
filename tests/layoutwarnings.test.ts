import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { MapRegistry } from "../src/core/maps";
import { mapKind } from "../src/core/layoutview";
import { HORSE_SPEED, RUN_SPEED } from "../src/core/horse";
import {
  CROSS_LIMIT,
  layoutWarnings,
  longestCrossing,
  timeOf,
  walkDistances,
  walkTime,
} from "../src/core/layoutwarnings";

describe("walk time", () => {
  it("uses the game's speeds", () => {
    const t = timeOf(100);
    expect(t.foot).toBeCloseTo(100 / RUN_SPEED);
    expect(t.horse).toBeCloseTo(100 / HORSE_SPEED);
    expect(t.horse).toBeLessThan(t.foot);
  });

  it("is the shortest walk between two entries of the farm", () => {
    const farm = maps.get("farm");
    const [a, b] = farm.entries;
    const w = walkTime(farm, a!, b!);
    expect(w).toBeDefined();
    const manhattan = Math.abs(a!.x - b!.x) + Math.abs(a!.y - b!.y);
    expect(w!.tiles).toBeGreaterThanOrEqual(manhattan);
    expect(walkDistances(farm, a!).get(`${a!.x},${a!.y}`)).toBe(0);
  });

  it("is undefined into a blocked tile", () => {
    const farm = maps.get("farm");
    expect(walkTime(farm, farm.entries[0]!, { x: -1, y: -1 })).toBeUndefined();
  });

  it("no committed outdoor map crosses over the limit", () => {
    for (const id of maps.ids) {
      const m = maps.get(id, maps.maxTier(id));
      const c = longestCrossing(m);
      if (!c) continue;
      const t = timeOf(c.tiles);
      expect(t.foot, id).toBeLessThanOrEqual(CROSS_LIMIT.foot);
    }
  });
});

describe("layout warnings", () => {
  const warnings = layoutWarnings(maps, mapFiles);

  it("start with a map id and never throw over the committed maps", () => {
    for (const w of warnings)
      expect(maps.ids).toContain(/^[^\s:]+/.exec(w)![0]);
  });

  it("flag a one-tile door and a narrow exit on edited maps", () => {
    const files = structuredClone(mapFiles);
    const farm = files["farm"]!;
    const exit = farm.layers
      .flatMap((l) => l.objects ?? [])
      .find(
        (o) =>
          (o.class ?? o.type) === "exit" &&
          mapKind(
            String(o.properties?.find((p) => p.name === "map")?.value),
            files[String(o.properties?.find((p) => p.name === "map")?.value)]!,
          ) !== "interior",
      )!;
    exit.width = 16;
    exit.height = 16;
    const w = layoutWarnings(MapRegistry.fromTiled(files), files);
    expect(w.some((x) => x.startsWith("farm:") && /wide/.test(x))).toBe(true);
  });
});
