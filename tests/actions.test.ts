import { describe, expect, it } from "vitest";
import {
  forage,
  harvest,
  plant,
  till,
  TOOL_ENERGY,
  water,
} from "../src/core/actions";
import { MAX_ENERGY } from "../src/core/energy";
import { deserialize, newGame, serialize } from "../src/core/save";
import { seedId } from "../src/core/items";
import { sleep, finished, endDue } from "../src/core/sleep";
import { fillHall } from "./hall-helpers";
import { DAYS_PER_SEASON } from "../src/core/calendar";
import { seedStock, sellAll } from "../src/core/shop";

const spots = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 5 }));
const never = () => 0;
/** A roll that never earns a better quality. */
const plain = () => 0.99;

function readyFarm() {
  const g = newGame();
  g.inventory.add(seedId("parsnip"), 5);
  till(g, 0, 0);
  plant(g, 0, 0, seedId("parsnip"));
  return g;
}

describe("actions", () => {
  it("tilling and watering cost energy; refusals cost nothing", () => {
    const g = newGame();
    expect(water(g, 0, 0)).toEqual({ ok: false, reason: "nothing to water" });
    expect(till(g, 0, 0).ok).toBe(true);
    expect(till(g, 0, 0)).toEqual({ ok: false, reason: "already tilled" });
    expect(g.day.energy.current).toBe(MAX_ENERGY - TOOL_ENERGY);
    expect(water(g, 0, 0).ok).toBe(true);
    expect(water(g, 0, 0)).toEqual({ ok: false, reason: "already watered" });
    expect(g.day.energy.current).toBe(MAX_ENERGY - 2 * TOOL_ENERGY);
  });

  it("planting uses a seed and respects the season", () => {
    const g = newGame();
    till(g, 0, 0);
    expect(plant(g, 0, 0, "parsnip")).toEqual({
      ok: false,
      reason: "not a seed",
    });
    expect(plant(g, 0, 0, seedId("parsnip"))).toEqual({
      ok: false,
      reason: "no seeds",
    });
    g.inventory.add(seedId("melon"));
    expect(plant(g, 0, 0, seedId("melon"))).toEqual({
      ok: false,
      reason: "cannot plant here",
    });
    expect(g.inventory.count(seedId("melon"))).toBe(1);
    g.inventory.add(seedId("parsnip"));
    expect(plant(g, 0, 0, seedId("parsnip")).ok).toBe(true);
    expect(g.inventory.count(seedId("parsnip"))).toBe(0);
  });

  it("grows, harvests and awards XP", () => {
    const g = readyFarm();
    for (let i = 0; i < 4; i++) {
      water(g, 0, 0);
      sleep(g, spots, never);
    }
    const r = harvest(g, 0, 0, plain);
    expect(r).toMatchObject({ ok: true, item: "parsnip" });
    expect(g.inventory.count("parsnip")).toBe(1);
    expect(g.skills.xpOf("farming")).toBeGreaterThan(0);
    expect(harvest(g, 0, 0, plain)).toEqual({
      ok: false,
      reason: "nothing ripe",
    });
  });

  it("reports a level up", () => {
    const g = readyFarm();
    g.skills.gain("farming", 99);
    for (let i = 0; i < 4; i++) {
      water(g, 0, 0);
      sleep(g, spots, never);
    }
    expect(harvest(g, 0, 0, plain)).toMatchObject({
      levelUp: { skill: "farming", level: 1 },
    });
  });

  it("refuses to harvest into a full backpack and keeps the crop", () => {
    const g = readyFarm();
    for (let i = 0; i < 4; i++) {
      water(g, 0, 0);
      sleep(g, spots, never);
    }
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk${i}`);
    expect(harvest(g, 0, 0, plain)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.farm.isRipe(0, 0)).toBe(true);
  });

  it("forages goods and awards foraging XP", () => {
    const g = newGame();
    g.forage.respawn("spring", spots, () => 0.99);
    const at = spots.find((s) => g.forage.itemAt(s.x, s.y))!;
    expect(forage(g, at.x, at.y, plain)).toMatchObject({ ok: true });
    expect(g.skills.xpOf("foraging")).toBe(7);
    expect(forage(g, at.x, at.y, plain)).toEqual({
      ok: false,
      reason: "nothing here",
    });
  });

  it("refuses every action once the day is over", () => {
    const g = newGame();
    g.day.energy.spend(MAX_ENERGY + 15);
    expect(till(g, 0, 0)).toEqual({ ok: false, reason: "exhausted" });
    expect(harvest(g, 0, 0, plain)).toEqual({ ok: false, reason: "exhausted" });
  });
});

describe("sleep", () => {
  it("restores a full morning when the player sleeps early", () => {
    const g = newGame();
    till(g, 0, 0);
    const r = sleep(g, spots, never);
    expect(r).toMatchObject({ passedOut: false, moneyLost: 0, withered: 0 });
    expect(g.day.clock.day).toBe(2);
    expect(g.day.energy.current).toBe(MAX_ENERGY);
  });

  it("charges for passing out", () => {
    const g = newGame();
    g.day.energy.spend(MAX_ENERGY + 15);
    const r = sleep(g, spots, never);
    expect(r).toMatchObject({
      passedOut: true,
      reason: "energy",
      moneyLost: 50,
    });
    expect(g.money).toBe(450);
  });

  it("costs nothing to pass out inside the farmhouse", () => {
    const g = newGame();
    g.day.energy.spend(MAX_ENERGY + 15);
    const r = sleep(g, spots, never, undefined, true);
    expect(r).toMatchObject({ passedOut: true, moneyLost: 0 });
    expect(g.money).toBe(500);
  });

  it("gives a full morning the day after a skill level-up, even exhausted", () => {
    const g = newGame();
    g.skills.gain("farming", 1000);
    g.day.energy.spend(MAX_ENERGY + 15);
    sleep(g, spots, never);
    expect(g.day.energy.current).toBe(MAX_ENERGY);
    expect(g.skills.levelledToday).toBe(false);
    g.day.energy.spend(MAX_ENERGY);
    sleep(g, spots, never);
    expect(g.day.energy.current).toBe(MAX_ENERGY / 2);
  });

  it("keeps the exhausted and level-up flags through a save", () => {
    const g = newGame();
    g.skills.gain("farming", 1000);
    g.day.energy.spend(MAX_ENERGY + 5);
    const back = deserialize(serialize(g))!;
    expect(back.day.energy.current).toBe(-5);
    expect(back.day.energy.wasExhausted).toBe(true);
    expect(back.skills.levelledToday).toBe(true);
  });

  it("changes season, withers spring crops and offers summer seeds", () => {
    const g = readyFarm();
    g.day.clock.day = DAYS_PER_SEASON;
    const r = sleep(g, spots, never);
    expect(r).toMatchObject({ newSeason: "summer", withered: 1 });
    expect(seedStock("summer")).toContain(seedId("melon"));
    expect(seedStock("summer")).not.toContain(seedId("parsnip"));
  });

  it("respawns forage each morning", () => {
    const g = newGame();
    sleep(g, spots, () => 0.99);
    expect(g.forage.count).toBeGreaterThan(0);
  });
});

describe("selling and finishing", () => {
  it("sells a whole stack", () => {
    const g = newGame();
    g.inventory.add("melon", 3);
    expect(sellAll(g.inventory, g, "melon")).toBe(750);
    expect(g.inventory.count("melon")).toBe(0);
  });

  it("is finished once every bundle is complete", () => {
    const g = newGame();
    expect(finished(g)).toBe(false);
    fillHall(g.hall, g.inventory, g);
    expect(finished(g)).toBe(true);
  });

  it("shows the end screen once", () => {
    const g = newGame();
    expect(endDue(g)).toBe(false);
    fillHall(g.hall, g.inventory, g);
    expect(endDue(g)).toBe(true);
    g.endSeen = true;
    expect(endDue(g)).toBe(false);
  });
});
