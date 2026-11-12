import { describe, expect, it } from "vitest";
import { eat } from "../src/core/actions";
import { newCreature, stepCreature } from "../src/core/creatures";
import {
  OIL_TIER,
  drink,
  isDrink,
  oilActive,
  oilCalms,
} from "../src/core/elixirs";
import {
  LIFE_ELIXIR,
  MINERS_TREAT,
  OIL_OF_GARLIC,
  itemById,
} from "../src/core/items";
import { newGame } from "../src/core/save";
import { buy } from "../src/core/shop";

describe("Forge goods", () => {
  it("are bought for Stardew's prices", () => {
    expect(itemById(LIFE_ELIXIR)?.buyPrice).toBe(2000);
    expect(itemById(MINERS_TREAT)?.buyPrice).toBe(1000);
    expect(itemById(OIL_OF_GARLIC)?.buyPrice).toBe(3000);
    const g = newGame();
    g.money = 3000;
    expect(buy(g.inventory, g, OIL_OF_GARLIC)).toBe(true);
    expect(g.money).toBe(0);
  });
});

describe("Life Elixir", () => {
  it("restores health to full and is used up", () => {
    const g = newGame();
    g.inventory.add(LIFE_ELIXIR, 2);
    expect(isDrink(LIFE_ELIXIR)).toBe(true);
    expect(drink(g, LIFE_ELIXIR)).toMatchObject({ ok: false });
    g.combat.health.current = 1;
    expect(drink(g, LIFE_ELIXIR).ok).toBe(true);
    expect(g.combat.health.full).toBe(true);
    expect(g.inventory.count(LIFE_ELIXIR)).toBe(1);
  });
  it("is refused with none in the pack", () => {
    expect(drink(newGame(), LIFE_ELIXIR).ok).toBe(false);
  });
});

describe("Miner's Treat", () => {
  it("is food worth 100 energy", () => {
    const g = newGame();
    g.inventory.add(MINERS_TREAT, 1);
    g.day.energy.current = 50;
    expect(eat(g, MINERS_TREAT).ok).toBe(true);
    expect(g.day.energy.current).toBe(150);
  });
});

describe("Oil of Garlic", () => {
  it("lasts the day, then wears off", () => {
    const g = newGame();
    g.inventory.add(OIL_OF_GARLIC, 2);
    expect(drink(g, OIL_OF_GARLIC).ok).toBe(true);
    expect(oilActive(g)).toBe(true);
    expect(drink(g, OIL_OF_GARLIC).ok).toBe(false);
    g.day.clock.day += 1;
    expect(oilActive(g)).toBe(false);
  });

  it("calms monsters of the lower bands only, and they stop chasing", () => {
    const g = newGame();
    g.inventory.add(OIL_OF_GARLIC, 1);
    expect(oilCalms(g, "gloop")).toBe(false);
    drink(g, OIL_OF_GARLIC);
    expect(OIL_TIER).toBe(3);
    expect(oilCalms(g, "gloop")).toBe(true);
    const c = newCreature(1, "gloop", 100, 100);
    c.state = "chase";
    const r = stepCreature(c, 0.1, {
      player: { x: 101, y: 100 },
      walk: (cr, dx, dy) => ({ x: cr.x + dx, y: cr.y + dy }),
      random: () => 0.5,
      assist: false,
      tileSize: 16,
      calm: true,
    });
    expect(r.hit).toBeUndefined();
    expect(c.state).toBe("wander");
  });

  it("is saved with the day it was taken", () => {
    const g = newGame();
    g.inventory.add(OIL_OF_GARLIC, 1);
    drink(g, OIL_OF_GARLIC);
    const saved = JSON.parse(JSON.stringify(g.combat.save()));
    const back = newGame();
    back.combat.load(saved);
    expect(back.combat.oilDay).toBe(g.day.clock.day);
  });
});
