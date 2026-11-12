import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";
import { FarmMap } from "../src/core/map";
import {
  BANDS,
  BUILT_FLOORS,
  LADDER_CAP,
  bandOf,
  rockKindAt,
  hearthsilverNodes,
  floorLayout,
  floorMapJson,
  ladderChance,
  mineFloorOf,
  MINES_OPEN_DAY,
  campItem,
  mineMapId,
  minesOpen,
} from "../src/core/mines";
import {
  crackGeode,
  crackResult,
  CRACK_FEE,
  geodeDrop,
  geodeKindForFloor,
  GEODE_ITEMS,
} from "../src/core/geodes";
import geodeData from "../src/content/geodes.json";
import { greencoatDue, hearGreencoat, takeCampGift } from "../src/core/camp";
import { drops, mine } from "../src/core/mining";
import { collect, minutesLeft, ready, smelt } from "../src/core/furnace";
import { deliverFurnace, handOverCopper, SMITH_STOCK } from "../src/core/smith";
import { buy } from "../src/core/shop";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { heldAt, startGame, TOOLS } from "../src/core/toolbar";
import { useHeld } from "../src/core/tools";
import { itemById } from "../src/core/items";
import { craft } from "../src/core/crafting";

const noSpots = [] as { x: number; y: number }[];

describe("the mine floors", () => {
  it("open on spring day 5", () => {
    expect(minesOpen(4)).toBe(false);
    expect(minesOpen(5)).toBe(true);
  });

  it("names map ids both ways", () => {
    expect(mineFloorOf(mineMapId(7))).toBe(7);
    expect(mineFloorOf("farm")).toBeUndefined();
  });

  it("make the same floor for the same day and floor", () => {
    const a = floorLayout(3, 9);
    const b = floorLayout(3, 9);
    expect(a.rocks).toEqual(b.rocks);
    expect(a.walls).toEqual(b.walls);
    expect(floorLayout(3, 10).rocks).not.toEqual(a.rocks);
  });

  it("are valid maps with every open tile reachable", () => {
    for (let floor = 1; floor <= BUILT_FLOORS; floor++) {
      const layout = floorLayout(floor, 5 + floor);
      const map = FarmMap.fromTiled(floorMapJson(layout));
      expect(map.problems()).toEqual([]);
      const open = layout.walls.filter((w) => !w).length;
      expect(map.reachable(layout.arrive).size).toBe(open);
      for (const r of layout.rocks) expect(map.isBlocked(r.x, r.y)).toBe(false);
    }
  });

  it("show a free ladder on some floors and never on the last", () => {
    const days = Array.from({ length: 40 }, (_, i) => i + 5);
    const some = days.filter((d) => floorLayout(2, d).ladder).length;
    expect(some).toBeGreaterThan(3);
    expect(some).toBeLessThan(20);
    for (const d of days)
      expect(floorLayout(BUILT_FLOORS, d).ladder).toBeUndefined();
  });

  it("has a farm map with rocks, and a gated mine door on the Mountain", () => {
    const farm = maps.get(START.map);
    expect(farm.rocks.length).toBeGreaterThan(5);
    expect(farm.exits.find((e) => e.id === "mine")).toBeUndefined();
    expect(
      maps.get("mountain").exits.find((e) => e.id === "mine")?.requires,
    ).toBe("mines-open");
    expect(maps.problems()).toEqual([]);
  });
});

describe("the dry streak", () => {
  it("starts at 1 percent, grows half a percent a miss, and caps at 25", () => {
    expect(ladderChance(0)).toBeCloseTo(0.01);
    expect(ladderChance(2)).toBeCloseTo(0.02);
    expect(ladderChance(1000)).toBe(LADDER_CAP);
  });
});

describe("mining", () => {
  function inMine(day = 5) {
    const g = startGame();
    g.day.clock.day = day;
    g.mines.visit(1, day);
    return g;
  }
  const pickaxe = { kind: "tool", tool: "pickaxe" } as const;

  it("puts the pickaxe in the toolbar", () => {
    const g = startGame();
    expect(heldAt(g, TOOLS.indexOf("pickaxe"))).toEqual(pickaxe);
  });

  it("breaks a farm rock in two swings for stone and a little XP", () => {
    const g = startGame();
    const map = maps.get(START.map);
    const spot = map.rocks[0]!;
    const e = g.day.energy.current;
    expect(useHeld(g, map, pickaxe, spot.x, spot.y).ok).toBe(true);
    expect(g.rocks.at(spot.x, spot.y)).toBeDefined();
    const r = useHeld(g, map, pickaxe, spot.x, spot.y);
    expect(r.ok).toBe(true);
    expect(g.rocks.at(spot.x, spot.y)).toBeUndefined();
    expect(g.inventory.count("stone")).toBeGreaterThan(0);
    expect(g.skills.xpOf("mining")).toBe(2);
    expect(g.day.energy.current).toBeLessThan(e);
  });

  it("refuses with nothing there and when the day is over", () => {
    const g = startGame();
    expect(mine(g, 0, 0, undefined).ok).toBe(false);
    const spot = maps.get(START.map).rocks[0]!;
    g.day.energy.current = 0;
    expect(mine(g, spot.x, spot.y, undefined)).toEqual({
      ok: false,
      reason: "exhausted",
    });
  });

  it("does not break a rock when the drop would not fit", () => {
    const g = startGame();
    const spot = maps.get(START.map).rocks[0]!;
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`, 1);
    mine(g, spot.x, spot.y, undefined);
    expect(mine(g, spot.x, spot.y, undefined)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.rocks.at(spot.x, spot.y)).toBeDefined();
  });

  it("gives copper from a node, with more at higher odds and for prospectors", () => {
    expect(drops("copper", 0, false, () => 0.99)).toEqual({
      id: "copper-ore",
      count: 1,
    });
    expect(drops("copper", 0, false, () => 0).count).toBe(2);
    expect(drops("copper", 0, true, () => 0.1).count).toBeGreaterThan(1);
    expect(drops("coal", 0, false, () => 0.9)).toEqual({
      id: "coal",
      count: 1,
    });
  });

  it("reveals a ladder under a rock when the dry streak hits, and resets", () => {
    const g = inMine();
    const floor = g.mines.visit(1, 5);
    floor.ladder = undefined;
    const rock = [...floor.rocks.each()][0]!;
    for (let i = rock.hits; i < 5; i++) {
      const r = mine(g, rock.x, rock.y, 1, () => 0);
      if (floor.rocks.at(rock.x, rock.y) === undefined) {
        expect(r).toMatchObject({ ok: true, ladder: true });
        break;
      }
    }
    expect(floor.ladder).toEqual({ x: rock.x, y: rock.y });
    expect(g.mines.misses).toBe(0);
  });

  it("counts misses, and the last rock always hides the ladder", () => {
    const g = inMine();
    const floor = g.mines.visit(1, 5);
    floor.ladder = undefined;
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      const rock = [...floor.rocks.each()][0];
      if (!rock) break;
      rock.hits = 5;
      const r = mine(g, rock.x, rock.y, 1, () => 0.99);
      found = r.ok && r.ladder === true;
      if (!found) expect(g.mines.misses).toBe(i + 1);
    }
    expect(found).toBe(true);
    expect(floor.rocks.count).toBe(0);
  });

  it("never shows a ladder on the last built floor", () => {
    const g = startGame();
    g.day.clock.day = 6;
    const floor = g.mines.visit(BUILT_FLOORS, 6);
    const rock = [...floor.rocks.each()][0]!;
    rock.hits = 5;
    expect(mine(g, rock.x, rock.y, BUILT_FLOORS, () => 0)).toMatchObject({
      ok: true,
      ladder: false,
    });
    expect(floor.ladder).toBeUndefined();
  });

  it("makes the lift stop at every floor reached", () => {
    const g = startGame();
    g.mines.visit(1, 5);
    g.mines.visit(4, 5);
    expect(g.mines.deepest).toBe(4);
  });

  it("renews the floors each day", () => {
    const g = startGame();
    const a = g.mines.visit(1, 5);
    expect(g.mines.visit(1, 5)).toBe(a);
    expect(g.mines.visit(1, 6)).not.toBe(a);
  });
});

describe("the smith and the furnace", () => {
  it("sells ore and coal but never bars", () => {
    expect(SMITH_STOCK).toEqual(["copper-ore", "iron-ore", "gold-ore", "coal"]);
    const g = startGame();
    g.money = 1000;
    expect(buy(g.inventory, g, "copper-ore", 2)).toBe(true);
    expect(g.money).toBe(950);
    expect(buy(g.inventory, g, "copper-bar", 1)).toBe(false);
    expect(itemById("coal")?.buyPrice).toBe(50);
  });

  it("gives the furnace the morning after the first copper is handed over", () => {
    const g = startGame();
    expect(handOverCopper(g)).toBe(false);
    g.inventory.add("copper-ore", 2);
    expect(handOverCopper(g)).toBe(true);
    expect(g.inventory.count("copper-ore")).toBe(1);
    expect(handOverCopper(g)).toBe(false);
    expect(g.furnace.gifted).toBe(false);
    const report = sleep(g, noSpots, () => 0.5);
    expect(report.furnaceGifted).toBe(true);
    expect(g.furnace.gifted).toBe(true);
    expect(sleep(g, noSpots, () => 0.5).furnaceGifted).toBe(false);
    expect(deliverFurnace(g)).toBe(false);
  });

  it("smelts 5 ore and 1 coal into a bar over game time", () => {
    const g = startGame();
    expect(smelt(g, "copper-bar")).toBe("no furnace");
    g.furnace.gifted = true;
    expect(smelt(g, "copper-bar")).toBe("not enough ore");
    g.inventory.add("copper-ore", 5);
    expect(smelt(g, "copper-bar")).toBe("not enough coal");
    g.inventory.add("coal", 1);
    expect(smelt(g, "copper-bar")).toBeUndefined();
    expect(g.inventory.count("copper-ore")).toBe(0);
    expect(g.inventory.count("coal")).toBe(0);
    expect(smelt(g, "copper-bar")).toBe("furnace busy");
    expect(ready(g)).toBe(false);
    expect(minutesLeft(g)).toBe(30);
    expect(collect(g)).toEqual({ ok: false, reason: "not done" });
    g.day.act(0, 30);
    expect(ready(g)).toBe(true);
    expect(collect(g)).toEqual({ ok: true, bar: "copper-bar" });
    expect(g.inventory.count("copper-bar")).toBe(1);
    expect(g.furnace.job).toBeUndefined();
  });

  it("finishes a long batch overnight", () => {
    const g = startGame();
    g.furnace.gifted = true;
    g.inventory.add("gold-ore", 5);
    g.inventory.add("coal", 1);
    g.day.act(0, 18 * 60);
    smelt(g, "gold-bar");
    sleep(g, noSpots, () => 0.5);
    expect(ready(g)).toBe(true);
  });
});

describe("saving the mine", () => {
  it("keeps rocks, floors, the furnace and the streak", () => {
    const g = startGame();
    const farmRock = maps.get(START.map).rocks[0]!;
    g.rocks.remove(farmRock.x, farmRock.y);
    g.day.clock.day = 6;
    const floor = g.mines.visit(2, 6);
    const rock = [...floor.rocks.each()][0]!;
    floor.rocks.remove(rock.x, rock.y);
    floor.ladder = { x: rock.x, y: rock.y };
    g.mines.misses = 4;
    g.mines.copperHandedIn = true;
    g.furnace.gifted = true;
    g.inventory.add("copper-ore", 5);
    g.inventory.add("coal", 1);
    smelt(g, "copper-bar");
    g.skills.gain("mining", 150);
    const back = deserialize(serialize(g))!;
    expect(back.rocks.at(farmRock.x, farmRock.y)).toBeUndefined();
    expect(back.rocks.count).toBe(g.rocks.count);
    const same = back.mines.today(2, 6)!;
    expect(same.rocks.count).toBe(floor.rocks.count);
    expect(same.ladder).toEqual({ x: rock.x, y: rock.y });
    expect(back.mines.deepest).toBe(2);
    expect(back.mines.misses).toBe(4);
    expect(back.mines.copperHandedIn).toBe(true);
    expect(back.furnace.gifted).toBe(true);
    expect(back.furnace.job).toEqual(g.furnace.job);
    expect(back.skills.level("mining")).toBe(1);
  });

  it("loads a save from before the mines with the starting rocks", () => {
    const old = JSON.parse(serialize(newGame()));
    delete old.rocks;
    delete old.mines;
    delete old.furnace;
    delete old.skills.mining;
    const g = deserialize(JSON.stringify(old))!;
    expect(g.rocks.count).toBe(maps.get(START.map).rocks.length);
    expect(g.mines.deepest).toBe(0);
    expect(g.furnace.gifted).toBe(false);
    expect(g.skills.xpOf("mining")).toBe(0);
  });
});

describe("quartz and the quality sprinkler", () => {
  it("lies in the mine as a one swing cluster that drops a crystal", () => {
    const g = newGame();
    g.day.clock.day = 5;
    g.mines.visit(1, 5).rocks.add(2, 2, "quartz");
    const r = mine(g, 2, 2, 1, () => 0.9);
    expect(r.ok).toBe(true);
    expect(g.inventory.count("quartz-crystal")).toBe(1);
    expect(g.mines.visit(1, 5).rocks.at(2, 2)).toBeUndefined();
    expect(itemById("quartz-crystal")?.sellPrice).toBe(25);
  });

  it("shows up on floors 1 to 10 at about 6 percent of rocks", () => {
    let quartz = 0;
    let total = 0;
    for (let day = 5; day < 45; day++)
      for (let floor = 1; floor <= 10; floor++)
        for (const r of floorLayout(floor, day).rocks) {
          total++;
          if (r.kind === "quartz") quartz++;
        }
    expect(quartz / total).toBeGreaterThan(0.04);
    expect(quartz / total).toBeLessThan(0.09);
  });

  it("makes the quality sprinkler craftable at farming level 6", () => {
    const g = newGame();
    for (const id of ["iron-bar", "gold-bar", "quartz-crystal"])
      g.inventory.add(id);
    expect(craft(g, "quality-sprinkler")).toBe("recipe not known");
    g.skills.gain("farming", 100000);
    expect(craft(g, "quality-sprinkler")).toBeUndefined();
    expect(g.inventory.count("quality-sprinkler")).toBe(1);
    expect(g.inventory.count("quartz-crystal")).toBe(0);
  });
});

describe("Old Greencoat and the rest camp", () => {
  it("brings the news once, on the morning the mines open, and gives nothing", () => {
    const g = newGame();
    expect(greencoatDue(g)).toBe(false);
    g.day.clock.day = MINES_OPEN_DAY;
    expect(greencoatDue(g)).toBe(true);
    const money = g.money;
    hearGreencoat(g);
    expect(greencoatDue(g)).toBe(false);
    expect(g.money).toBe(money);
    expect(deserialize(serialize(g))!.mines.greeted).toBe(true);
    g.day.clock.day = MINES_OPEN_DAY + 1;
    expect(greencoatDue(g)).toBe(false);
  });

  it("does not greet a save that was already digging", () => {
    const g = newGame();
    g.mines.visit(1, 8);
    const raw = JSON.parse(serialize(g));
    delete raw.mines.greeted;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.mines.greeted).toBe(true);
  });

  it("puts a camp chest on floor 10 only", () => {
    for (let day = 5; day < 15; day++) {
      expect(floorLayout(10, day).camp).toBeDefined();
      for (let floor = 1; floor < 10; floor++)
        expect(floorLayout(floor, day).camp).toBeUndefined();
    }
    const json = floorMapJson(floorLayout(10, 5));
    const map = FarmMap.fromTiled(json);
    const camp = floorLayout(10, 5).camp!;
    expect(map.serviceAt(camp.x, camp.y)?.kind).toBe("camp-chest");
    expect(
      floorLayout(10, 5).rocks.some((r) => r.x === camp.x && r.y === camp.y),
    ).toBe(false);
  });

  it("gives one fixed item the first time and is empty after", () => {
    const g = newGame();
    expect(takeCampGift(g)).toEqual({ ok: true, item: "sturdy-boots" });
    expect(g.inventory.count("sturdy-boots")).toBe(1);
    g.day.clock.day = 6;
    expect(takeCampGift(g)).toEqual({ ok: false, reason: "camp chest empty" });
    expect(deserialize(serialize(g))!.mines.campOpenedOn(10)).toBe(true);
  });

  it("leaves the item when the backpack is full, taking nothing", () => {
    const g = newGame();
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`);
    expect(takeCampGift(g)).toEqual({ ok: false, reason: "backpack full" });
    expect(g.mines.campOpenedOn(10)).toBe(false);
  });

  it("has a real item for every camp floor but 30", () => {
    for (let f = 10; f <= 120; f += 10) {
      if (f === 30) expect(campItem(f)).toBeUndefined();
      else expect(itemById(campItem(f)!)).toBeDefined();
    }
    expect(campItem(100)).toBe("elderfruit");
    expect(campItem(120)).toBe("deepmark-key");
  });
});

describe("geodes", () => {
  it("come in four kinds with their own sell prices", () => {
    expect(itemById("geode")?.sellPrice).toBe(50);
    expect(itemById("frozen-geode")?.sellPrice).toBe(100);
    expect(itemById("magma-geode")?.sellPrice).toBe(150);
    expect(itemById("omni-geode")?.sellPrice).toBe(300);
    expect(itemById("omni-geode")?.name).toBe("Omni Geode");
  });

  it("are dug from a node in three swings and sell for 50g", () => {
    const g = newGame();
    g.day.clock.day = 5;
    g.mines.visit(1, 5).rocks.add(2, 2, "geode");
    expect(mine(g, 2, 2, 1, () => 0.9).ok).toBe(true);
    expect(mine(g, 2, 2, 1, () => 0.9).ok).toBe(true);
    expect(g.inventory.count("geode")).toBe(0);
    expect(mine(g, 2, 2, 1, () => 0.9).ok).toBe(true);
    expect(g.inventory.count("geode")).toBe(1);
    expect(itemById("geode")?.sellPrice).toBe(50);
  });

  it("show up on floors 1 to 10 at about 5 percent of rocks", () => {
    let geodes = 0;
    let total = 0;
    for (let day = 5; day < 45; day++)
      for (let floor = 1; floor <= 10; floor++)
        for (const r of floorLayout(floor, day).rocks) {
          total++;
          if (r.kind === "geode") geodes++;
        }
    expect(geodes / total).toBeGreaterThan(0.03);
    expect(geodes / total).toBeLessThan(0.08);
  });

  it("are cracked by the smith for 25g into an artifact, mineral, stone, clay or ore", () => {
    const g = newGame();
    expect(crackGeode(g)).toEqual({ ok: false, reason: "no geode" });
    g.inventory.add("geode", 2);
    g.money = 20;
    expect(crackGeode(g)).toEqual({ ok: false, reason: "not enough money" });
    g.money = 100;
    const r = crackGeode(g, () => 0);
    expect(r).toEqual({ ok: true, item: "dwarf-cup", count: 1 });
    expect(g.money).toBe(100 - CRACK_FEE);
    expect(g.inventory.count("dwarf-cup")).toBe(1);
    expect(g.inventory.count("geode")).toBe(1);
  });

  it("can give every outcome, all of them real items", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++)
      seen.add(crackResult(() => (i * 0.6180339) % 1).item);
    expect(seen.size).toBeGreaterThanOrEqual(6);
    for (const id of seen) expect(itemById(id), id).toBeDefined();
  });

  it("drop by depth band, with Omni rare from floor 21 on", () => {
    expect(geodeKindForFloor(1)).toBe("geode");
    expect(geodeKindForFloor(40)).toBe("geode");
    expect(geodeKindForFloor(41)).toBe("frozen-geode");
    expect(geodeKindForFloor(80)).toBe("frozen-geode");
    expect(geodeKindForFloor(81)).toBe("magma-geode");
    expect(geodeKindForFloor(120)).toBe("magma-geode");
    expect(geodeDrop(undefined, () => 0)).toBe("geode");
    expect(geodeDrop(20, () => 0)).toBe("geode");
    expect(geodeDrop(21, () => 0)).toBe("omni-geode");
    expect(geodeDrop(60, () => 0.99)).toBe("frozen-geode");
    expect(drops("geode", 0, false, () => 0.99, 90).id).toBe("magma-geode");
    let omni = 0;
    for (let i = 0; i < 1000; i++)
      if (geodeDrop(50, () => ((i * 0.6180339) % 1) as number) === "omni-geode")
        omni++;
    expect(omni).toBeGreaterThan(30);
    expect(omni).toBeLessThan(150);
  });

  it("give a rockhound an extra geode of the band's kind", () => {
    const g = newGame();
    g.day.clock.day = 5;
    g.skills.gain("mining", 100000);
    g.skills.setProfession("mining", "rockhound");
    g.mines.visit(50, 5).rocks.add(2, 2, "stone");
    mine(g, 2, 2, 50, () => 0);
    mine(g, 2, 2, 50, () => 0);
    expect(g.inventory.count("frozen-geode")).toBe(1);
  });

  it("have a real item for every pool entry, six minerals a pool", () => {
    for (const p of geodeData.pools) {
      expect(p.minerals).toHaveLength(6);
      const ids = [
        p.artifact.item,
        p.foraged.item,
        ...p.minerals,
        ...p.ores.map((o) => o.item),
      ];
      for (const id of ids) expect(itemById(id), id).toBeDefined();
    }
    for (const i of GEODE_ITEMS)
      expect(itemById(i.id)?.sellPrice).toBe(i.sellPrice);
  });

  it("crack each kind into its own pool", () => {
    const seq = (v: number[]) => {
      let i = 0;
      return () => v[i++] ?? 0.99;
    };
    // Artifact, foraged mineral, first mineral of each pool.
    expect(crackResult(() => 0, "frozen-geode").item).toBe("ice-bell");
    expect(crackResult(() => 0, "magma-geode").item).toBe("ember-lantern");
    expect(crackResult(seq([0.5, 0.01]), "geode").item).toBe("loam-crystal");
    expect(crackResult(seq([0.5, 0.5, 0.01]), "frozen-geode").item).toBe(
      "frost-opal",
    );
    expect(
      crackResult(
        seq([0.5, 0.5, 0.99, 0.99, 0.99, 0.99, 0.99, 0.01]),
        "magma-geode",
      ).item,
    ).toBe("heartfire-diamond");
    // Omni picks a pool by its first roll.
    expect(crackResult(() => 0, "omni-geode").item).toBe("dwarf-cup");
    expect(crackResult(seq([0.99, 0]), "omni-geode").item).toBe(
      "ember-lantern",
    );
  });

  it("crack to stone, clay or ore after the minerals, gated by depth", () => {
    // Skip artifact, foraged and the six minerals, then the resource roll.
    const after = (res: number, ...rest: number[]) => {
      const v = [0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, res, ...rest];
      let i = 0;
      return () => v[i++] ?? 0;
    };
    expect(crackResult(after(0.05, 0.9), "geode")).toEqual({
      item: "stone",
      count: 2,
    });
    expect(crackResult(after(0.15), "geode")).toEqual({
      item: "clay",
      count: 1,
    });
    // Ore: roll 0 picks the first ore (coal), then amount 1.
    expect(crackResult(after(0.5, 0, 0), "geode", 1)).toEqual({
      item: "coal",
      count: 1,
    });
    // Iron only from floor 26 on: the last roll of 0.99 picks it then, copper before.
    expect(crackResult(after(0.5, 0.99, 0), "geode", 10).item).toBe(
      "copper-ore",
    );
    expect(crackResult(after(0.5, 0.99, 0), "geode", 30).item).toBe("iron-ore");
    // Gold in the Frozen pool only from floor 76 on.
    expect(crackResult(after(0.5, 0.99, 0), "frozen-geode", 50).item).toBe(
      "iron-ore",
    );
    expect(crackResult(after(0.5, 0.99, 0), "frozen-geode", 76).item).toBe(
      "gold-ore",
    );
    // Hearthsilver is the rare Magma ore, in its own amounts.
    expect(crackResult(after(0.5, 0.99, 0.99), "magma-geode", 90)).toEqual({
      item: "hearthsilver-ore",
      count: 11,
    });
  });

  it("cracks a Frozen geode at the smith using the deepest floor reached", () => {
    const g = newGame();
    g.money = 100;
    g.inventory.add("frozen-geode", 1);
    const r = crackGeode(g, () => 0, "frozen-geode");
    expect(r).toEqual({ ok: true, item: "ice-bell", count: 1 });
    expect(g.inventory.count("frozen-geode")).toBe(0);
  });

  it("leaves the geode and the gold when the backpack is full", () => {
    const g = newGame();
    g.money = 100;
    for (let i = 0; i < g.inventory.size - 1; i++) g.inventory.add(`junk-${i}`);
    g.inventory.add("geode", 2);
    expect(crackGeode(g, () => 0)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.inventory.count("geode")).toBe(2);
    expect(g.money).toBe(100);
  });

  it("give a rockhound an extra geode from plain rock now and then", () => {
    const g = newGame();
    g.day.clock.day = 5;
    g.skills.gain("mining", 100000);
    g.skills.setProfession("mining", "rockhound");
    const f = g.mines.visit(1, 5);
    f.rocks.add(2, 2, "stone");
    mine(g, 2, 2, 1, () => 0);
    mine(g, 2, 2, 1, () => 0);
    expect(g.inventory.count("geode")).toBe(1);
  });
});

describe("the deeper mine (floors 11 to 120)", () => {
  const kinds = (floor: number) => {
    const seen = new Map<string, number>();
    for (let day = 5; day < 45; day++)
      for (const r of floorLayout(floor, day).rocks)
        seen.set(r.kind, (seen.get(r.kind) ?? 0) + 1);
    return seen;
  };

  it("runs 120 floors in three bands of 40", () => {
    expect(BUILT_FLOORS).toBe(120);
    expect(BANDS.map((b) => b.floors)).toEqual([
      [1, 40],
      [41, 80],
      [81, 120],
    ]);
    expect(bandOf(40).name).toBe("The Upper Galleries");
    expect(bandOf(41).name).toBe("The Cold Deeps");
    expect(bandOf(120).name).toBe("The Ember Deeps");
  });

  it("opens iron nodes from floor 26, rarer than copper until floor 41", () => {
    expect(kinds(25).has("iron")).toBe(false);
    expect(kinds(26).has("iron")).toBe(true);
    expect(kinds(40).get("iron")!).toBeLessThan(kinds(40).get("copper")!);
    expect(rockKindAt(25, 0.23)).toBe("coal");
    expect(rockKindAt(26, 0.23)).toBe("iron");
    expect(rockKindAt(26, 0.21)).toBe("copper");
  });

  it("shows copper above floor 40, iron in the Cold Deeps and gold below", () => {
    expect(kinds(20).has("iron")).toBe(false);
    expect(kinds(20).has("gold")).toBe(false);
    expect(kinds(60).get("iron")!).toBeGreaterThan(kinds(60).get("copper")!);
    expect(kinds(60).has("gold")).toBe(false);
    expect(kinds(90).get("gold")!).toBeGreaterThan(kinds(90).get("iron")!);
    expect(kinds(90).has("hearthsilver")).toBe(false);
  });

  it("puts Hearthsilver on floors 100 to 120 only", () => {
    expect(hearthsilverNodes(99)).toBe(0);
    expect(hearthsilverNodes(100)).toBe(6);
    for (let day = 5; day < 15; day++) {
      const n = floorLayout(110, day).rocks.filter(
        (r) => r.kind === "hearthsilver",
      ).length;
      expect(n).toBe(6);
    }
    expect(kinds(60).has("hearthsilver")).toBe(false);
  });

  it("makes every deep floor a valid map and the same all day", () => {
    for (const floor of [11, 40, 41, 80, 81, 100, 120]) {
      const a = floorLayout(floor, 9);
      expect(floorLayout(floor, 9).rocks).toEqual(a.rocks);
      const map = FarmMap.fromTiled(floorMapJson(a));
      expect(map.problems()).toEqual([]);
      expect(map.reachable(a.arrive).size).toBe(
        a.walls.filter((w) => !w).length,
      );
    }
  });

  it("keeps geodes dropping in each band's kind", () => {
    expect(kinds(60).get("geode")!).toBeGreaterThan(0);
    expect(geodeKindForFloor(60)).toBe("frozen-geode");
    expect(geodeKindForFloor(90)).toBe("magma-geode");
  });

  it("gives iron, gold and Hearthsilver ore from their nodes", () => {
    expect(drops("iron", 0, false, () => 0.99).id).toBe("iron-ore");
    expect(drops("gold", 0, false, () => 0.99).id).toBe("gold-ore");
    const h = drops("hearthsilver", 0, false, () => 0.1);
    expect(h).toEqual({ id: "hearthsilver-ore", count: 1 });
    expect(itemById(h.id)).toBeDefined();
  });

  it("has a camp every 10th floor, each emptied on its own", () => {
    for (const floor of [10, 20, 50, 120])
      expect(floorLayout(floor, 6).camp).toBeDefined();
    expect(floorLayout(25, 6).camp).toBeUndefined();
    const g = startGame();
    g.day.clock.day = 6;
    expect(takeCampGift(g, 10).ok).toBe(true);
    expect(takeCampGift(g, 10).ok).toBe(false);
    expect(takeCampGift(g, 20).ok).toBe(true);
    const back = deserialize(serialize(g))!;
    expect(back.mines.campOpenedOn(20)).toBe(true);
    expect(back.mines.campOpenedOn(30)).toBe(false);
  });

  it("finds a ladder on floors 11 to 119 and none on floor 120", () => {
    const g = startGame();
    g.day.clock.day = 6;
    for (const floor of [30, 119]) {
      const f = g.mines.visit(floor, 6);
      f.ladder = undefined;
      const rock = [...f.rocks.each()][0]!;
      rock.hits = 5;
      expect(mine(g, rock.x, rock.y, floor, () => 0)).toMatchObject({
        ladder: true,
      });
    }
    expect(g.mines.deepest).toBe(119);
    g.mines.visit(120, 6);
    expect(g.mines.deepest).toBe(120);
  });

  it("saves and loads a deep dig with its Hearthsilver nodes", () => {
    const g = startGame();
    g.mines.visit(105, 7);
    const back = deserialize(serialize(g))!;
    expect(back.mines.deepest).toBe(105);
    expect(
      [...back.mines.today(105, 7)!.rocks.each()].some(
        (r) => r.kind === "hearthsilver",
      ),
    ).toBe(true);
  });
});
