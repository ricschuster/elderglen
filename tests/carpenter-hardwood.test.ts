import { describe, expect, it } from "vitest";
import {
  HARDWOOD_STANDIN_ENABLED,
  HARDWOOD_STANDIN_PRICE,
  buyHardwood,
  hardwoodProblem,
} from "../src/core/carpenter";
import { HARDWOOD } from "../src/core/items";
import { newGame } from "../src/core/save";

describe("carpenter hardwood stand-in", () => {
  it("is on, at 200g (temporary, see note 43)", () => {
    expect(HARDWOOD_STANDIN_ENABLED).toBe(true);
    expect(HARDWOOD_STANDIN_PRICE).toBe(200);
  });

  it("sells hardwood for the price", () => {
    const g = newGame();
    g.money = 1000;
    expect(hardwoodProblem(g)).toBeUndefined();
    expect(buyHardwood(g, 3)).toBe(3);
    expect(g.money).toBe(1000 - 3 * HARDWOOD_STANDIN_PRICE);
    expect(g.inventory.count(HARDWOOD)).toBe(3);
  });

  it("refuses without enough money and takes nothing", () => {
    const g = newGame();
    g.money = HARDWOOD_STANDIN_PRICE - 1;
    expect(hardwoodProblem(g)).toBeDefined();
    expect(buyHardwood(g)).toBe(0);
    expect(g.money).toBe(HARDWOOD_STANDIN_PRICE - 1);
    expect(g.inventory.count(HARDWOOD)).toBe(0);
  });

  it("pays only for what fits when money runs short", () => {
    const g = newGame();
    g.money = HARDWOOD_STANDIN_PRICE * 2 + 50;
    expect(buyHardwood(g, 5)).toBe(2);
    expect(g.money).toBe(50);
  });
});
