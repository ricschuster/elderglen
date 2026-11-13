import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { isClear } from "../src/core/actions";
import {
  POND_COST,
  advancePonds,
  emptyPond,
  orderPond,
  pondAt,
  pondBlockers,
  pondCostLine,
  pondMenu,
  pondOrderProblem,
  pondProblem,
  putFish,
  stateOf,
} from "../src/core/pond";
import { newGame } from "../src/core/save";
import type { GameState } from "../src/core/save";
import { START } from "../src/core/maps";

const farm = maps.get(START.map);

function stocked(g: GameState): void {
  g.money = 10000;
  g.inventory.add("stone", POND_COST.stone);
  g.inventory.add("seaweed", POND_COST.seaweed);
  g.inventory.add("pondweed", POND_COST.pondweed);
}

function freeSpot(g: GameState): { x: number; y: number } {
  for (let y = 0; y < farm.height - 5; y++)
    for (let x = 0; x < farm.width - 5; x++)
      if (pondBlockers(g, farm, START.map, x, y).length === 0) return { x, y };
  throw new Error("no spot");
}

describe("pond carpenter line and placing (note 93)", () => {
  it("says what is lacking before a spot is chosen, and nothing once stocked", () => {
    const g = newGame();
    expect(pondOrderProblem(g)).toMatch(/^You need /);
    stocked(g);
    expect(pondOrderProblem(g)).toBeUndefined();
  });

  it("is refused while another carpenter job runs", () => {
    const g = newGame();
    stocked(g);
    g.animals.siloDays = 2;
    expect(pondOrderProblem(g)).toBe("The carpenter is busy with your silo.");
  });

  it("states the price", () => {
    expect(pondCostLine()).toContain("5000g");
    expect(pondCostLine()).toContain("200");
  });

  it("has no blockers on a clear spot, and agrees with pondProblem", () => {
    const g = newGame();
    stocked(g);
    const at = freeSpot(g);
    expect(pondProblem(g, farm, START.map, at.x, at.y)).toBeUndefined();
  });

  it("reports every tile that is not clear, and off-map tiles", () => {
    const g = newGame();
    const off = pondBlockers(g, farm, START.map, -2, 0);
    expect(off.filter((b) => b.why === "that is off the farm")).toHaveLength(
      10,
    );
    const at = freeSpot(g);
    g.rocks.add(at.x + 1, at.y + 1, "stone");
    expect(isClear(g, farm, at.x + 1, at.y + 1)).toBe(false);
    const b = pondBlockers(g, farm, START.map, at.x, at.y);
    expect(b).toEqual([
      { x: at.x + 1, y: at.y + 1, why: "the ground is not clear" },
    ]);
  });

  it("blocks overlap with a placed pond", () => {
    const g = newGame();
    stocked(g);
    const at = freeSpot(g);
    expect(orderPond(g, farm, START.map, at.x, at.y).ok).toBe(true);
    const b = pondBlockers(g, farm, START.map, at.x + 2, at.y);
    expect(b.some((t) => t.why === "another pond")).toBe(true);
  });
});

describe("pond menu and Empty (note 93)", () => {
  function pond() {
    const g = newGame();
    stocked(g);
    const at = freeSpot(g);
    orderPond(g, farm, START.map, at.x, at.y);
    return { g, at };
  }

  it("shows the carpenter's work, then an empty pond, with no Empty button", () => {
    const { g, at } = pond();
    const m = pondMenu(pondAt(g, at.x, at.y)!);
    expect(m.lines[0]).toMatch(/digging/);
    expect(m.canEmpty).toBe(false);
    advancePonds(g);
    advancePonds(g);
    const m2 = pondMenu(pondAt(g, at.x, at.y)!);
    expect(m2.lines[0]).toMatch(/empty pond/i);
    expect(m2.canEmpty).toBe(false);
  });

  it("shows the count against the cap, and Empty returns every fish and resets", () => {
    const { g, at } = pond();
    advancePonds(g);
    advancePonds(g);
    g.inventory.add("carp", 3);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, "carp");
    const m = pondMenu(pondAt(g, at.x, at.y)!);
    expect(m.lines[0]).toBe("Carp: 3 of 3");
    expect(m.canEmpty).toBe(true);
    const r = emptyPond(g, at.x, at.y);
    expect(r.ok).toBe(true);
    expect(g.inventory.count("carp")).toBe(3);
    const s = stateOf(pondAt(g, at.x, at.y)!);
    expect(s.count).toBe(0);
    expect(s.species).toBeUndefined();
    expect(emptyPond(g, at.x, at.y).ok).toBe(false);
  });
});
