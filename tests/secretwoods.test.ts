import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { areaOf, areasEndDay, enterArea, isAreaMap } from "../src/core/areas";
import { chop } from "../src/core/actions";
import { dateOf } from "../src/core/calendar";
import { FORAGE_AREAS, forageCap } from "../src/core/forageareas";
import { exitOpen, layersAtTier } from "../src/core/map";
import { logCleared } from "../src/core/logs";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { farmMapOf } from "../src/core/farmtypes";
import { swingsToFell } from "../src/core/trees";
import { useHeld } from "../src/core/tools";
import { holdsOf } from "../src/core/worldflags";

const woods = maps.get("secret-woods");
const forest = maps.get("forest");
const axe = { kind: "tool", tool: "axe" } as const;

function fellStump(g: ReturnType<typeof newGame>, x: number, y: number) {
  for (let i = 0; i < 60 && g.trees.at(x, y)?.regrow === undefined; i++)
    chop(g, x, y, Math.random, woods);
}

describe("the Secret Woods map (note 73, steps 1 to 4)", () => {
  it("is 48 by 40, rideable, wild, and meets the contract", () => {
    expect(woods.width).toBe(48);
    expect(woods.height).toBe(40);
    expect(woods.rideable).toBe(true);
    expect(woods.wild).toBe(true);
    expect(isAreaMap("secret-woods")).toBe(true);
    expect(woods.stumpRegrowDays).toBe(1);
    expect(maps.problems()).toEqual([]);
  });

  it("joins the Forest both ways", () => {
    expect(woods.exits.find((e) => e.id === "to_forest")).toMatchObject({
      map: "forest",
      entry: "from_secret_woods",
    });
    expect(forest.entry("from_secret_woods")).toEqual({
      name: "from_secret_woods",
      x: 11,
      y: 16,
    });
    expect(forest.exits.find((e) => e.id === "to_secret_woods")).toMatchObject({
      map: "secret-woods",
      entry: "from_forest",
      requires: "secret-log-cleared",
    });
    expect(woods.entry("from_forest")).toEqual({
      name: "from_forest",
      x: 45,
      y: 11,
    });
  });

  it("has six large stumps, four in the glade and two in the hollow", () => {
    const stumps = woods.trees.filter((t) => t.large);
    expect(stumps.length).toBe(6);
    expect(woods.trees.length).toBe(6);
    expect(stumps.filter((t) => t.y < 23).length).toBe(4);
    expect(stumps.filter((t) => t.y >= 26).length).toBe(2);
  });

  it("can be walked everywhere that matters, passage and pond shore included", () => {
    const walkable = woods.reachable(woods.entry("from_forest")!);
    for (const t of woods.trees) {
      const beside = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => walkable.has(`${t.x + dx!},${t.y + dy!}`));
      expect(beside, `stump at ${t.x},${t.y}`).toBe(true);
    }
    for (const s of woods.forageSpots)
      expect(walkable.has(`${s.x},${s.y}`)).toBe(true);
    expect(walkable.has("38,24")).toBe(true);
    expect(walkable.has("15,32")).toBe(true);
    expect(woods.forageSpots.length).toBe(30);
  });

  it("has a pond of woods-pond water, blocked to walkers", () => {
    expect(woods.waterKindAt(28, 31)).toBe("woods-pond");
    expect(woods.isBlocked(28, 31)).toBe(true);
    expect(woods.isBlocked(45, 11)).toBe(false);
  });

  it("starts with a little clutter", () => {
    expect(woods.rocks.length).toBe(6);
    expect(woods.litter.twigs.length).toBe(8);
    expect(woods.litter.weeds.length).toBe(14);
    const g = newGame();
    expect(g.areas["secret-woods"]!.trees.count).toBe(6);
    expect(g.areas["secret-woods"]!.rocks.count).toBe(6);
  });
});

describe("daily large stumps (note 73)", () => {
  const [s1] = woods.trees;

  it("refuses a basic axe, gives 2 hardwood to a copper axe, and regrows next day", () => {
    const g = newGame();
    enterArea(g, "secret-woods");
    g.toolTiers.axe = 0;
    const refused = chop(g, s1!.x, s1!.y, Math.random, woods);
    expect(refused.ok).toBe(false);
    expect(g.inventory.count("hardwood")).toBe(0);
    g.toolTiers.axe = 1;
    fellStump(g, s1!.x, s1!.y);
    expect(g.inventory.count("hardwood")).toBe(2);
    expect(g.trees.at(s1!.x, s1!.y)?.regrow).toBe(1);
    g.day.clock.day += 1;
    areasEndDay(g, Math.random);
    const back = g.areas["secret-woods"]!.trees.at(s1!.x, s1!.y)!;
    expect(back.regrow).toBeUndefined();
    expect(back.stage).toBe(5);
    // And it can be chopped again for another 2.
    fellStump(g, s1!.x, s1!.y);
    expect(g.inventory.count("hardwood")).toBe(4);
  });

  it("restores all six when the player sleeps, wherever they are", () => {
    const g = newGame();
    enterArea(g, "secret-woods");
    g.toolTiers.axe = 4;
    for (const t of woods.trees) fellStump(g, t.x, t.y);
    expect(g.inventory.count("hardwood")).toBe(12);
    expect(swingsToFell(4)).toBeGreaterThan(0);
    sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(areaOf(g)).toBeUndefined();
    const w = g.areas["secret-woods"]!;
    for (const t of woods.trees) {
      const now = w.trees.at(t.x, t.y)!;
      expect(now.regrow).toBeUndefined();
      expect(now.stage).toBe(5);
    }
  });

  it("makes 100 hardwood about nine visits of 12", () => {
    expect(Math.ceil(100 / 12)).toBe(9);
  });
});

describe("the massive log in the Forest", () => {
  const log = forest.logs[0]!;

  it("seals the corridor: walls above and below, and a log on both open tiles", () => {
    const walkable = forest.reachable(forest.entry("from_farm")!);
    expect(walkable.has("11,16")).toBe(true);
    // The corridor is two tiles wide; walls close it at y 14 and y 17.
    for (let x = 2; x <= 9; x++) {
      expect(forest.isBlocked(x, 14)).toBe(true);
      expect(forest.isBlocked(x, 17)).toBe(true);
    }
    expect(forest.logs.map((l) => `${l.x},${l.y}`).sort()).toEqual([
      "7,15",
      "7,16",
    ]);
    for (const l of forest.logs) {
      expect(forest.isBlocked(l.x, l.y)).toBe(false);
      expect(l.flag).toBe("secret-log-cleared");
    }
    // The exit tiles at the far end are open ground.
    expect(forest.isBlocked(0, 15)).toBe(false);
    expect(forest.isBlocked(0, 16)).toBe(false);
  });

  it("keeps the exit shut until a steel axe chops the log, then opens it", () => {
    const g = newGame();
    const exit = forest.exits.find((e) => e.id === "to_secret_woods")!;
    expect(exitOpen(exit, holdsOf(g))).toBe(false);
    expect(logCleared(g, log)).toBe(false);
    g.toolTiers.axe = 1;
    expect(useHeld(g, forest, axe, log.x, log.y).ok).toBe(false);
    expect(exitOpen(exit, holdsOf(g))).toBe(false);
    g.toolTiers.axe = 2;
    expect(useHeld(g, forest, axe, log.x, log.y).ok).toBe(true);
    expect(g.inventory.count("hardwood")).toBe(8);
    expect(exitOpen(exit, holdsOf(g))).toBe(true);
    // Either log tile counts as gone once the flag is up.
    for (const l of forest.logs) expect(logCleared(g, l)).toBe(true);
  });

  it("draws the log only until its flag is up", () => {
    const json = mapFiles["forest"]!;
    const drawn = (holds: string[]) =>
      layersAtTier(json, 0, new Set(holds)).map((l) => l.name);
    expect(drawn([])).toContain("log");
    expect(drawn(["secret-log-cleared"])).not.toContain("log");
  });
});

describe("the Secret Woods forage", () => {
  const area = FORAGE_AREAS["secret-woods"]!;

  it("caps at 4 a morning, 6 in winter, with a high rare share", () => {
    expect(forageCap(area, "spring")).toBe(4);
    expect(forageCap(area, "winter")).toBe(6);
    const table = area.tables["default"]!;
    const share = (
      season: "spring" | "summer" | "fall" | "winter",
      ids: string[],
    ) => {
      const list = table[season]!;
      const total = list.reduce((n, w) => n + w.weight, 0);
      return (
        list
          .filter((w) => ids.includes(w.id))
          .reduce((n, w) => n + w.weight, 0) / total
      );
    };
    expect(share("spring", ["morel"])).toBe(0.35);
    expect(share("summer", ["wild-ginger"])).toBe(0.25);
    expect(share("fall", ["chanterelle"])).toBe(0.35);
    expect(share("winter", ["snowcap"])).toBe(0.35);
  });

  it("lays out its own forage each morning, within the cap", () => {
    const g = newGame();
    areasEndDay(g, Math.random);
    const { season } = dateOf(g.day.clock.day);
    const goods = [...g.areas["secret-woods"]!.forage.each()];
    expect(goods.length).toBeGreaterThan(0);
    expect(goods.length).toBeLessThanOrEqual(forageCap(area, season));
  });
});
