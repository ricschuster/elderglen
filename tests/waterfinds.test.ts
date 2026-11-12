import { describe, expect, it } from "vitest";
import { bite } from "../src/core/fishing";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import {
  findsAvailable,
  isWaterFind,
  landFind,
  rollFind,
  WATER_FINDS,
} from "../src/core/waterfinds";

const day = { season: "spring", minutes: 10 * 60, raining: false } as const;

describe("water finds (note 93)", () => {
  it("has three plants and three jellies, all items", () => {
    expect(WATER_FINDS.filter((f) => f.kind === "plant")).toHaveLength(3);
    expect(WATER_FINDS.filter((f) => f.kind === "jelly")).toHaveLength(3);
    for (const f of WATER_FINDS) expect(itemById(f.id)).toBeDefined();
  });

  it("casts pondweed in fresh water and seaweed in salt and cove water", () => {
    const ids = (w: Parameters<typeof findsAvailable>[0]) =>
      findsAvailable(w, "summer").map((f) => f.id);
    expect(ids("farm-pond")).toContain("pondweed");
    expect(ids("river")).toContain("pondweed");
    expect(ids("sea")).toContain("seaweed");
    expect(ids("cove")).toContain("seaweed");
    expect(ids("sea")).not.toContain("pondweed");
  });

  it("keeps each jelly to its water and season", () => {
    const has = (
      w: Parameters<typeof findsAvailable>[0],
      s: "spring" | "summer",
      id: string,
    ) => findsAvailable(w, s).some((f) => f.id === id);
    expect(has("river", "spring", "brook-jelly")).toBe(true);
    expect(has("river", "summer", "brook-jelly")).toBe(false);
    expect(has("sea", "summer", "tide-jelly")).toBe(true);
    expect(has("sea", "spring", "tide-jelly")).toBe(false);
  });

  it("does not bite cave finds yet (no cave water kind)", () => {
    for (const id of ["pale-lichen", "glow-jelly"])
      expect(WATER_FINDS.find((f) => f.id === id)!.waters).toEqual([]);
  });

  it("rolls a find from a low roll and nothing from a high one", () => {
    expect(rollFind("river", "spring", () => 0.01)?.id).toBe("pondweed");
    expect(rollFind("river", "spring", () => 0.99)).toBeUndefined();
  });

  it("is a bite with no bar, never on the tutorial cast", () => {
    // Trash rolls first (2 in 100 on a river), so 0.05 passes it and finds a plant.
    const b = bite("river", day, () => 0.05);
    expect(b).toEqual({ kind: "find", item: "pondweed" });
    expect(bite("river", day, () => 0.05, true).kind).toBe("fish");
  });

  it("lands in the pack with fishing XP and leaves the fish log alone", () => {
    const g = newGame();
    const before = g.skills.save().fishing;
    const r = landFind(g, { x: 1, y: 1 }, "pondweed");
    expect(r.dropped).toBe(false);
    expect(g.inventory.count("pondweed")).toBe(1);
    expect(g.skills.save().fishing).toBeGreaterThan(before);
    expect(g.fishing.total).toBe(0);
  });

  it("drops a find at the feet when the pack is full", () => {
    const g = newGame();
    for (let i = 0; g.inventory.room("stone") > 0 && i < 100; i++)
      g.inventory.add("stone", 999);
    const r = landFind(g, { x: 2, y: 2 }, "brook-jelly");
    expect(r.dropped).toBe(true);
  });

  it("knows what a find is", () => {
    expect(isWaterFind("tide-jelly")).toBe(true);
    expect(isWaterFind("carp")).toBe(false);
  });
});
