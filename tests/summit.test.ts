import { beforeEach, describe, expect, it, vi } from "vitest";

const ring = vi.hoisted(() => ({ percent: 99 }));
vi.mock("../src/core/completion", async (orig) => {
  const real = await orig<typeof import("../src/core/completion")>();
  return {
    ...real,
    ringProgress: () => [
      {
        id: "ring1",
        name: "Home valley",
        exact: ring.percent,
        percent: ring.percent,
        categories: [],
      },
    ],
  };
});

import {
  ACHIEVEMENTS,
  buyHat,
  checkAchievements,
  hatsOnSale,
} from "../src/core/achievements";
import { dailyStock, furnitureById } from "../src/core/furniture";
import { STACK_SIZE } from "../src/core/inventory";
import { deliverAll, openLetter } from "../src/core/mail";
import { newGame } from "../src/core/save";

describe("summit achievement", () => {
  beforeEach(() => {
    ring.percent = 99;
  });

  it("is not earned below 100 and is earned at 100", () => {
    const g = newGame();
    expect(checkAchievements(g).map((a) => a.id)).not.toContain("summit");
    ring.percent = 100;
    expect(checkAchievements(g).map((a) => a.id)).toContain("summit");
    expect(checkAchievements(g)).toEqual([]);
  });

  it("puts its hat on sale at the hatter", () => {
    const g = newGame();
    ring.percent = 100;
    checkAchievements(g);
    const a = ACHIEVEMENTS.find((x) => x.id === "summit")!;
    expect(hatsOnSale(g).map((x) => x.id)).toContain("summit");
    g.money = a.hat.price;
    expect(buyHat(g, a.hat.id)).toBeUndefined();
    expect(g.wardrobe.has(a.hat.id)).toBe(true);
  });

  it("mails the lamp the morning after, and keeps it if the pack is full", () => {
    const g = newGame();
    ring.percent = 100;
    checkAchievements(g);
    deliverAll(g, 7);
    let n = 0;
    while (g.inventory.add(`filler-${n++}`, STACK_SIZE));
    const full = openLetter(g, "summit-letter");
    expect(full.ok && full.pending).toBe(true);
    expect(g.inventory.count("steadfast-lamp")).toBe(0);
    g.inventory.remove("filler-0", STACK_SIZE);
    const r = openLetter(g, "summit-letter");
    expect(r.ok && r.gift).toEqual(["Steadfast lamp"]);
    expect(g.inventory.count("steadfast-lamp")).toBe(1);
    openLetter(g, "summit-letter");
    expect(g.inventory.count("steadfast-lamp")).toBe(1);
  });

  it("keeps the lamp out of the carpenter's stock", () => {
    expect(furnitureById("steadfast-lamp")?.keepsake).toBe(true);
    for (let d = 1; d < 200; d++)
      expect(dailyStock(d).map((f) => f.id)).not.toContain("steadfast-lamp");
  });
});
