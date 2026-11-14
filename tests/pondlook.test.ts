import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { isClear } from "../src/core/actions";
import { START } from "../src/core/maps";
import {
  POND_BUILD_DAYS,
  POND_FISH_SPOTS,
  advancePonds,
  orderPond,
  pondAt,
  pondLook,
  pondProblem,
  putFish,
} from "../src/core/pond";
import { FISH } from "../src/core/fishing";
import { newGame } from "../src/core/save";
import type { GameState } from "../src/core/save";

const farm = maps.get(START.map);

/** The top left of the first 5 by 5 patch of clear ground, scanning the whole map. */
function patch(g: GameState): { x: number; y: number } {
  for (let y = 0; y < farm.height - 5; y++)
    for (let x = 0; x < farm.width - 5; x++) {
      let ok = true;
      for (let dy = 0; dy < 5 && ok; dy++)
        for (let dx = 0; dx < 5 && ok; dx++)
          ok = isClear(g, farm, x + dx, y + dy);
      if (
        ok &&
        !/taken|busy|only/.test(pondProblem(g, farm, "farm", x, y) ?? "")
      )
        return { x, y };
    }
  throw new Error("no clear patch");
}

function rich(): GameState {
  const g = newGame();
  g.money = 10000;
  g.inventory.add("stone", 200);
  g.inventory.add("seaweed", 5);
  g.inventory.add("pondweed", 5);
  return g;
}

function built(): { g: GameState; at: { x: number; y: number } } {
  const g = rich();
  const at = patch(g);
  expect(orderPond(g, farm, "farm", at.x, at.y).ok).toBe(true);
  for (let i = 0; i < POND_BUILD_DAYS; i++) advancePonds(g);
  return { g, at };
}

describe("what a pond looks like (note 93, art)", () => {
  it("shows the pit while it is dug, then still water", () => {
    const g = rich();
    const at = patch(g);
    orderPond(g, farm, "farm", at.x, at.y);
    expect(pondLook(pondAt(g, at.x, at.y)!)).toMatchObject({
      building: true,
      fish: 0,
    });
    for (let i = 0; i < POND_BUILD_DAYS; i++) advancePonds(g);
    expect(pondLook(pondAt(g, at.x, at.y)!)).toMatchObject({
      building: false,
      fish: 0,
      ready: false,
    });
  });

  it("draws the fish it holds, and sea water for a sea fish", () => {
    const { g, at } = built();
    const fresh = FISH.find((f) => f.water !== "sea")!;
    g.inventory.add(fresh.id, 3);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, fresh.id);
    const look = pondLook(pondAt(g, at.x, at.y)!);
    expect(look.species).toBe(fresh.id);
    expect(look.sea).toBe(false);
    expect(look.fish).toBeGreaterThan(0);
    expect(look.fish).toBeLessThanOrEqual(POND_FISH_SPOTS.length);
  });

  it("has ten distinct swim spots inside the 80 pixel pond", () => {
    expect(new Set(POND_FISH_SPOTS.map(String)).size).toBe(10);
    for (const [x, y] of POND_FISH_SPOTS) {
      expect(x).toBeGreaterThan(8);
      expect(x).toBeLessThan(72);
      expect(y).toBeGreaterThan(8);
      expect(y).toBeLessThan(72);
    }
  });
});
