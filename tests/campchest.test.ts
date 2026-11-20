import { describe, expect, it } from "vitest";
import { campChestContents, campChestMove } from "../src/core/camp";
import { newGame } from "../src/core/save";

describe("the camp chest screen (note 22, take only)", () => {
  it("shows the gift until it is taken, then nothing", () => {
    const g = newGame();
    expect(campChestContents(g, 10)).toBe("sturdy-boots");
    expect(campChestMove(g, 10, "chest")).toEqual({
      ok: true,
      item: "sturdy-boots",
    });
    expect(g.inventory.count("sturdy-boots")).toBe(1);
    expect(campChestContents(g, 10)).toBeUndefined();
  });

  it("gives only once per camp floor", () => {
    const g = newGame();
    expect(campChestMove(g, 10, "chest").ok).toBe(true);
    expect(campChestMove(g, 10, "chest")).toEqual({
      ok: false,
      reason: "camp chest empty",
    });
    expect(campChestMove(g, 20, "chest").ok).toBe(true);
    expect(g.inventory.count("sturdy-boots")).toBe(1);
  });

  it("keeps the gift in the chest when the backpack is full", () => {
    const g = newGame();
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`);
    expect(campChestMove(g, 10, "chest")).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(campChestContents(g, 10)).toBe("sturdy-boots");
  });

  it("is empty on a floor with no gift", () => {
    const g = newGame();
    expect(campChestContents(g, 30)).toBeUndefined();
    expect(campChestMove(g, 30, "chest").ok).toBe(false);
  });

  it("takes nothing in from the pack", () => {
    const g = newGame();
    g.inventory.add("wood", 3);
    expect(campChestMove(g, 10, "pack")).toEqual({
      ok: false,
      reason: "camp chest take only",
    });
    expect(g.inventory.count("wood")).toBe(3);
    expect(campChestContents(g, 10)).toBe("sturdy-boots");
  });
});
