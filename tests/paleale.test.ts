import { describe, expect, it } from "vitest";
import { artisanById, BEER, PALE_ALE, produceOf } from "../src/core/artisan";
import {
  caskQuality,
  caskTakes,
  loadCask,
  type PlacedCask,
} from "../src/core/cask";
import { cropById } from "../src/core/crops";
import { processFor } from "../src/core/processing";
import { newGame } from "../src/core/save";

describe("hops, pale ale and beer", () => {
  it("hops is a summer crop that regrows daily and is not a vegetable", () => {
    expect(cropById("hops")).toMatchObject({
      seasons: ["summer"],
      growDays: 11,
      regrowDays: 1,
      seedPrice: 60,
      sellPrice: 25,
    });
    expect(produceOf("hops")).toBeUndefined();
    expect(artisanById("hops-pickles")).toBeUndefined();
    expect(artisanById("hops-juice")).toBeUndefined();
  });

  it("the keg turns one hops into pale ale in 2,250 minutes, and wheat into beer", () => {
    expect(processFor("keg", "hops")).toMatchObject({
      output: PALE_ALE,
      use: 1,
      minutes: 2250,
    });
    expect(processFor("keg", "wheat")?.output).toBe(BEER);
    expect(artisanById(PALE_ALE)?.sellPrice).toBe(300);
    expect(artisanById(BEER)?.sellPrice).toBe(200);
  });

  it("the cask ages pale ale at 9 and 17 days and beer at 7 and 14", () => {
    expect(caskTakes(PALE_ALE)).toBe(true);
    expect(caskTakes(BEER)).toBe(true);
    const g = newGame();
    const days = (item: string, n: number) => {
      const start = g.day.clock.day;
      g.inventory.add(item);
      g.casks.add({ x: 0, y: 0 } as PlacedCask);
      const c = g.casks.get(0, 0)!;
      expect(loadCask(g, 0, 0, item).ok).toBe(true);
      g.day.clock.day = start + n;
      const q = caskQuality(g, c.job!);
      c.job = undefined;
      g.day.clock.day = start;
      return q;
    };
    expect(days(PALE_ALE, 8)).toBe("normal");
    expect(days(PALE_ALE, 9)).toBe("silver");
    expect(days(PALE_ALE, 17)).toBe("gold");
    expect(days(BEER, 6)).toBe("normal");
    expect(days(BEER, 7)).toBe("silver");
    expect(days(BEER, 14)).toBe("gold");
  });
});
