import { describe, expect, it } from "vitest";
import {
  ArtifactSpots,
  ARTIFACTS,
  ARTIFACT_AREAS,
  areaTable,
  digRoll,
  digSpot,
  mineDirtFind,
  SPOTS_NORMAL,
  SPOTS_WINTER,
} from "../src/core/artifacts";
import { areasEndDay, enterArea, areaOf } from "../src/core/areas";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import { useHeld } from "../src/core/tools";
import { maps } from "../src/content/maps";

const tiles = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 0 }));
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length]!;
};

describe("artifact data (note 69)", () => {
  it("has 42 artifacts with unique ids, all registered as items", () => {
    expect(ARTIFACTS).toHaveLength(42);
    expect(new Set(ARTIFACTS.map((a) => a.id)).size).toBe(42);
    for (const a of ARTIFACTS)
      expect(itemById(a.id)?.sellPrice).toBeGreaterThan(0);
  });
  it("gives each area 3 to 5 finds at 0.5 to 3 percent", () => {
    for (const area of ARTIFACT_AREAS) {
      const t = areaTable(area);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.length).toBeLessThanOrEqual(5);
      for (const e of t) expect(e.chance).toBeGreaterThanOrEqual(0.005);
      for (const e of t) expect(e.chance).toBeLessThanOrEqual(0.03);
    }
  });
  it("includes bundle 26's four old things", () => {
    for (const id of [
      "old-seed-packet",
      "carved-bead",
      "faded-ribbon",
      "pressed-flower",
    ])
      expect(ARTIFACTS.some((a) => a.id === id)).toBe(true);
  });
});

describe("spot rolls", () => {
  it("rolls 0 to 2 spots, and 1 to 3 in winter", () => {
    const s = new ArtifactSpots();
    for (const r of [0, 0.5, 0.999]) {
      s.roll("spring", tiles, () => r);
      expect(s.count).toBeGreaterThanOrEqual(SPOTS_NORMAL[0]);
      expect(s.count).toBeLessThanOrEqual(SPOTS_NORMAL[1]);
      s.roll("winter", tiles, () => r);
      expect(s.count).toBeGreaterThanOrEqual(SPOTS_WINTER[0]);
      expect(s.count).toBeLessThanOrEqual(SPOTS_WINTER[1]);
    }
  });
  it("never rolls more spots than tiles and clears yesterday's", () => {
    const s = new ArtifactSpots();
    s.add(99, 99);
    s.roll("winter", tiles.slice(0, 3), () => 0.999);
    expect(s.count).toBe(3);
    expect(s.at(99, 99)).toBe(false);
  });
});

describe("the dig roll", () => {
  it("gives an artifact when the roll is within a share, else a common find", () => {
    const first = areaTable("forest")[0]!;
    expect(digRoll("forest", () => 0)).toBe(first.id);
    expect(["clay", "mixed-seed", "stone"]).toContain(
      digRoll("forest", () => 0.999),
    );
  });
  it("is never empty", () => {
    for (let i = 0; i < 200; i++)
      expect(digRoll("cove", Math.random)).toBeTruthy();
  });
  it("mine dirt is rare and drawn from the band's finds", () => {
    expect(mineDirtFind(5, () => 0.5)).toBeUndefined();
    const id = mineDirtFind(5, seq(0, 0))!;
    expect(ARTIFACTS.find((a) => a.id === id)?.mineBands).toContain(1);
    const deep = mineDirtFind(90, seq(0, 0))!;
    expect(ARTIFACTS.find((a) => a.id === deep)?.mineBands).toContain(3);
  });
});

describe("digging with the hoe", () => {
  it("digs a spot in the forest, removes it and gives the find", () => {
    const g = newGame();
    enterArea(g, "forest");
    expect(areaOf(g)).toBe("forest");
    g.spots.add(5, 5);
    const r = digSpot(g, "forest", 5, 5, () => 0);
    expect(r.ok).toBe(true);
    expect(g.spots.at(5, 5)).toBe(false);
    expect(g.inventory.count(areaTable("forest")[0]!.id)).toBe(1);
    expect(digSpot(g, "forest", 5, 5).ok).toBe(false);
  });
  it("is wired into the hoe on an area map", () => {
    const g = newGame();
    enterArea(g, "forest");
    g.spots.add(3, 3);
    const r = useHeld(
      g,
      maps.get("forest"),
      { kind: "tool", tool: "hoe" },
      3,
      3,
    );
    expect(r.ok).toBe(true);
    expect(g.spots.at(3, 3)).toBe(false);
  });
  it("areas roll spots at night", () => {
    const g = newGame();
    areasEndDay(g, Math.random);
    expect(g.areas["forest"]!.spots.count).toBeGreaterThanOrEqual(
      SPOTS_NORMAL[0],
    );
  });
});
