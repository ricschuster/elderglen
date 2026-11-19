import { describe, expect, it } from "vitest";
import { HAY, SILO_SITES } from "../src/core/animals";
import { useSiloIntent } from "../src/core/interact";
import { newGame } from "../src/core/save";

const site = SILO_SITES["farm"]!;

describe("useSiloIntent", () => {
  it("ignores tiles that are not the silo, or a silo not yet built", () => {
    const g = newGame();
    expect(useSiloIntent(g, "farm", site.x, site.y, 0)).toBeUndefined();
    g.animals.silo = true;
    expect(useSiloIntent(g, "farm", 0, 0, 0)).toBeUndefined();
    expect(useSiloIntent(g, "cellar", site.x, site.y, 0)).toBeUndefined();
  });

  it("reads the fill level when no hay is held", () => {
    const g = newGame();
    g.animals.silo = true;
    expect(useSiloIntent(g, "farm", site.x, site.y, 0)).toMatch(
      /^The silo holds 0 of \d+ hay/,
    );
  });

  it("tips held hay in and reports the count", () => {
    const g = newGame();
    g.animals.silo = true;
    g.inventory.add(HAY);
    g.inventory.add(HAY);
    const slot = Array.from({ length: g.inventory.size }, (_, i) => i).find(
      (i) => g.inventory.slot(i)?.id === HAY,
    )!;
    const msg = useSiloIntent(g, "farm", site.x, site.y, slot);
    expect(msg).toMatch(/^2 hay into the silo \(2\//);
    expect(g.animals.hay).toBe(2);
    expect(g.inventory.count(HAY)).toBe(0);
  });
});
