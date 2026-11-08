import { afterEach, describe, expect, it, vi } from "vitest";
import treeData from "../src/content/fruit-trees.json";

/**
 * Fruit energy is a per-fruit data field (SC-66), not a shared constant. The
 * data file is replaced for these tests so changing one fruit moves only it.
 */
afterEach(() => {
  vi.doUnmock("../src/content/fruit-trees.json");
  vi.resetModules();
});

async function eatEnergy(id: string, overrides: Record<string, number>) {
  vi.resetModules();
  vi.doMock("../src/content/fruit-trees.json", () => ({
    default: treeData.map((t) => ({
      ...t,
      energy: overrides[t.id] ?? t.energy,
    })),
  }));
  const { eat } = await import("../src/core/actions");
  const { newGame } = await import("../src/core/save");
  const g = newGame();
  g.day.energy.current = 10;
  g.inventory.add(id);
  expect(eat(g, id).ok).toBe(true);
  return g.day.energy.current - 10;
}

describe("per-fruit energy", () => {
  it("every fruit restores its own data value, all 38 for now", () => {
    for (const t of treeData) expect(t.energy).toBe(38);
  });

  it("changing one fruit changes only that fruit", async () => {
    const over = { peach: 55 };
    expect(await eatEnergy("peach", over)).toBe(55);
    expect(await eatEnergy("apple", over)).toBe(38);
    expect(await eatEnergy("cherry", over)).toBe(38);
  });
});
