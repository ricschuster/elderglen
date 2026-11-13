import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { buildingProblem, siloProblem } from "../src/core/animals";
import { orderProblem } from "../src/core/house";
import { POND_COST, orderPond, pondBlockers } from "../src/core/pond";
import { POND_FOOTPRINT } from "../src/core/pondsite";
import { placementBlockers } from "../src/core/placement";
import { Trees } from "../src/core/trees";
import { Rocks } from "../src/core/rocks";
import { Weeds } from "../src/core/weeds";
import { Twigs } from "../src/core/debris";
import { ForageField } from "../src/core/forage";
import { newGame } from "../src/core/save";
import type { GameState } from "../src/core/save";

const ID = "farm";
const map = maps.get(ID);

function clearedGame(): GameState {
  const g = newGame();
  g.trees = new Trees([]);
  g.rocks = new Rocks([]);
  g.weeds = new Weeds();
  g.twigs = new Twigs();
  g.forage = new ForageField();
  g.money = 100000;
  g.inventory.add("wood", 2000);
  g.inventory.add("stone", 100 + POND_COST.stone);
  g.inventory.add("seaweed", POND_COST.seaweed);
  g.inventory.add("pondweed", POND_COST.pondweed);
  return g;
}

function freeCoopSpot(g: GameState): { x: number; y: number } {
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++)
      if (
        placementBlockers(g, map, ID, "coop", x, y).length === 0 &&
        pondBlockers(g, map, ID, x, y).length === 0
      )
        return { x, y };
  throw new Error("no spot");
}

describe("ponds and the other carpenter buildings", () => {
  it("refuses a coop or barn over a pond, built or digging", () => {
    const g = clearedGame();
    const at = freeCoopSpot(g);
    expect(orderPond(g, map, ID, at.x, at.y).ok).toBe(true);
    for (const b of ["coop", "barn", "stable"] as const) {
      const hit = placementBlockers(g, map, ID, b, at.x, at.y);
      expect(hit.some((h) => h.why === "a fish pond")).toBe(true);
    }
    const edge = placementBlockers(
      g,
      map,
      ID,
      "coop",
      at.x + POND_FOOTPRINT.w - 1,
      at.y + POND_FOOTPRINT.h - 1,
    );
    expect(edge.some((h) => h.why === "a fish pond")).toBe(true);
  });

  it("leaves the spot free once the pond is not there", () => {
    const g = clearedGame();
    const at = freeCoopSpot(g);
    expect(
      placementBlockers(g, map, ID, "coop", at.x, at.y).some(
        (h) => h.why === "a fish pond",
      ),
    ).toBe(false);
  });

  it("still refuses a pond over a coop already standing", () => {
    const g = clearedGame();
    const at = freeCoopSpot(g);
    g.animals.coopBuilt = true;
    g.animals.sites.coop = at;
    const hit = pondBlockers(g, map, ID, at.x, at.y);
    expect(hit.length).toBeGreaterThan(0);
  });

  it("makes older carpenter jobs wait for a pond under construction", () => {
    const g = clearedGame();
    const at = freeCoopSpot(g);
    expect(buildingProblem(g, "coop")).toBeUndefined();
    expect(orderPond(g, map, ID, at.x, at.y).ok).toBe(true);
    const busy = "The carpenter is busy digging your pond.";
    expect(buildingProblem(g, "coop")).toBe(busy);
    expect(buildingProblem(g, "barn")).toBe(busy);
    expect(siloProblem(g)).toBe(busy);
    expect(orderProblem(g)).toBe(busy);
  });
});
