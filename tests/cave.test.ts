import { describe, expect, it } from "vitest";
import {
  BAT_FRUIT,
  BAT_ODDS,
  CAVE_MAP,
  CAVE_MARK,
  FarmCave,
  MUSHROOM_BOXES,
  MUSHROOM_DAYS,
  MUSHROOM_WEIGHTS,
  batFruitCount,
  caveDehydratorDone,
  collectCaveDehydrator,
  loadCaveDehydrator,
  pickBatFruit,
  pickMushroom,
  pickMushroomBox,
} from "../src/core/cave";
import { maps } from "../src/content/maps";
import { exitOpen } from "../src/core/map";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { farmMapOf } from "../src/core/farmtypes";
import { FARM_TYPES } from "../src/core/farmtypes";

describe("the cave offer", () => {
  it("comes once, the moment earnings pass 25,000g", () => {
    const c = new FarmCave();
    expect(c.addEarnings(CAVE_MARK - 1, 5)).toBe(false);
    expect(c.pending).toBe(false);
    expect(c.addEarnings(1, 9)).toBe(true);
    expect(c.pending).toBe(true);
    expect(c.addEarnings(500, 12)).toBe(false);
    expect(c.arrivalDay).toBe(9);
  });

  it("shows once a morning from the arrival day, until chosen", () => {
    const c = new FarmCave();
    c.addEarnings(CAVE_MARK, 10);
    expect(c.due(9)).toBe(false);
    expect(c.due(10)).toBe(true);
    c.shownDay = 10;
    expect(c.due(10)).toBe(false);
    expect(c.due(11)).toBe(true);
    expect(c.choose("bats")).toBe(true);
    expect(c.due(12)).toBe(false);
  });

  it("makes the choice for good and only with an offer", () => {
    const c = new FarmCave();
    expect(c.choose("bats")).toBe(false);
    c.addEarnings(CAVE_MARK, 1);
    expect(c.choose("mushrooms")).toBe(true);
    expect(c.choose("bats")).toBe(false);
    expect(c.choice).toBe("mushrooms");
    expect(c.open).toBe(true);
  });

  it("counts earnings from the bin overnight and offers the cave the next morning", () => {
    const g = newGame();
    g.cave.earnings = CAVE_MARK - 100;
    g.bin.ship(g.inventory, "wood", 0);
    g.inventory.add("melon", 1);
    g.bin.ship(g.inventory, "melon", 1);
    const r = sleep(g, [], () => 0.5);
    expect(r.caveOffer).toBe(true);
    expect(g.cave.pending).toBe(true);
    expect(g.cave.due(g.day.clock.day)).toBe(true);
  });

  it("saves and loads everything, and loads old saves without a cave", () => {
    const g = newGame();
    g.cave.addEarnings(CAVE_MARK, 4);
    g.cave.choose("mushrooms");
    g.cave.boxes[2]!.ready = "morel";
    g.cave.shownDay = 4;
    const back = deserialize(serialize(g))!.cave;
    expect(back.choice).toBe("mushrooms");
    expect(back.boxes[2]!.ready).toBe("morel");
    expect(back.earnings).toBe(CAVE_MARK);
    expect(back.shownDay).toBe(4);
    const raw = JSON.parse(serialize(g));
    delete raw.cave;
    expect(deserialize(JSON.stringify(raw))!.cave.earnings).toBe(0);
  });
});

describe("the cave map", () => {
  const cave = maps.get(CAVE_MAP);

  it("is one room of about 50 floor tiles with six boxes, a dehydrator and fruit spots", () => {
    let floor = 0;
    for (let y = 0; y < cave.height; y++)
      for (let x = 0; x < cave.width; x++) if (!cave.isBlocked(x, y)) floor++;
    expect(floor).toBeGreaterThan(40);
    expect(floor).toBeLessThan(75);
    expect(cave.services.filter((s) => s.kind === "mushroom-box")).toHaveLength(
      MUSHROOM_BOXES,
    );
    expect(
      cave.services.filter((s) => s.kind === "cave-dehydrator"),
    ).toHaveLength(1);
    expect(cave.forageSpots.length).toBeGreaterThan(10);
  });

  it("opens from every farm only once the choice is made", () => {
    for (const t of FARM_TYPES) {
      const farm = maps.get(t.map);
      const door = farm.exits.find((e) => e.map === CAVE_MAP)!;
      expect(door, t.map).toBeDefined();
      expect(exitOpen(door, new Set())).toBe(false);
      expect(exitOpen(door, new Set(["cave-open"]))).toBe(true);
      expect(cave.entry(door.entry), t.map).toBeDefined();
    }
    expect(
      farmMapOf({ farmType: FARM_TYPES[0]!.id }).entry("from_cave"),
    ).toBeDefined();
    expect(maps.problems()).toEqual([]);
  });
});

describe("fruit bats", () => {
  it("rolls 0 to 4 fruit by the odds in note 07", () => {
    expect(BAT_ODDS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(batFruitCount(0)).toBe(0);
    expect(batFruitCount(0.47)).toBe(0);
    expect(batFruitCount(0.49)).toBe(1);
    expect(batFruitCount(0.74)).toBe(2);
    expect(batFruitCount(0.9)).toBe(3);
    expect(batFruitCount(0.999)).toBe(4);
  });

  it("leaves fruit overnight, never doubles up a spot, and fills no more than the floor holds", () => {
    const c = new FarmCave();
    c.addEarnings(CAVE_MARK, 1);
    c.choose("bats");
    const spots = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];
    for (let i = 0; i < 6; i++) c.endDay(spots, () => 0.999);
    expect(c.fruitCount).toBe(2);
    for (const f of c.eachFruit()) expect(BAT_FRUIT).toContain(f.id);
  });

  it("leaves any fruit in any season, wild or orchard, and does nothing without bats", () => {
    const c = new FarmCave();
    c.addEarnings(CAVE_MARK, 1);
    c.choose("bats");
    c.endDay([{ x: 1, y: 1 }], () => 0.999);
    expect(c.fruitCount).toBe(1);
    expect(BAT_FRUIT).toContain("grape");
    expect(BAT_FRUIT).toContain("apricot");
    const seen = new Set<string>();
    for (let i = 0; i < BAT_FRUIT.length; i++) {
      const d = new FarmCave();
      d.addEarnings(CAVE_MARK, 1);
      d.choose("bats");
      d.endDay([{ x: 1, y: 1 }], () => (i + 0.5) / BAT_FRUIT.length || 0.999);
      for (const f of d.eachFruit()) seen.add(f.id);
    }
    expect(seen.size).toBeGreaterThan(5);
    const none = new FarmCave();
    none.endDay([{ x: 1, y: 1 }], () => 0.999);
    expect(none.fruitCount).toBe(0);
  });

  it("picks fruit by hand for 7 foraging XP, gold for a Botanist", () => {
    const g = newGame();
    g.cave.addEarnings(CAVE_MARK, 1);
    g.cave.choose("bats");
    g.cave.endDay([{ x: 3, y: 3 }], () => 0.999);
    const at = [...g.cave.eachFruit()][0]!;
    g.skills.gain("foraging", 0);
    const r = pickBatFruit(g, at.x, at.y, () => 0.99);
    expect(r.ok).toBe(true);
    expect(g.inventory.count(at.id)).toBe(1);
    expect(g.cave.fruitAt(at.x, at.y)).toBeUndefined();
    expect(pickBatFruit(g, at.x, at.y)).toEqual({
      ok: false,
      reason: "nothing here",
    });
  });
});

describe("mushrooms", () => {
  it("weights the five kinds 50, 20, 15, 10, 5", () => {
    expect(MUSHROOM_WEIGHTS.map((m) => m.weight)).toEqual([50, 20, 15, 10, 5]);
    expect(pickMushroom(0)).toBe("field-mushroom");
    expect(pickMushroom(0.55)).toBe("morel");
    expect(pickMushroom(0.99)).toBe("snowcap");
  });

  it("grows one every second day in every box, and holds it until picked", () => {
    const c = new FarmCave();
    c.addEarnings(CAVE_MARK, 1);
    c.choose("mushrooms");
    c.endDay([], () => 0);
    expect(c.boxes.every((b) => b.ready === undefined)).toBe(true);
    for (let d = 1; d < MUSHROOM_DAYS; d++) c.endDay([], () => 0);
    expect(c.boxes.every((b) => b.ready === "field-mushroom")).toBe(true);
    c.endDay([], () => 0.99);
    expect(c.boxes.every((b) => b.ready === "field-mushroom")).toBe(true);
  });

  it("is picked by hand, normal quality, 5 XP", () => {
    const g = newGame();
    g.cave.boxes[0]!.ready = "morel";
    const xp = g.skills.xpOf("foraging");
    expect(pickMushroomBox(g, 0).ok).toBe(true);
    expect(g.inventory.count("morel")).toBe(1);
    expect(g.skills.xpOf("foraging")).toBe(xp + 5);
    expect(pickMushroomBox(g, 0)).toEqual({
      ok: false,
      reason: "nothing here",
    });
  });
});

describe("the free dehydrator", () => {
  it("comes only with the mushroom cave, takes 5 and finishes the next morning", () => {
    const g = newGame();
    g.inventory.add("morel", 5);
    expect(loadCaveDehydrator(g, "morel")).toMatchObject({ ok: false });
    g.cave.addEarnings(CAVE_MARK, 1);
    g.cave.choose("bats");
    expect(loadCaveDehydrator(g, "morel")).toMatchObject({ ok: false });
    const m = newGame();
    m.cave.addEarnings(CAVE_MARK, 1);
    m.cave.choose("mushrooms");
    m.inventory.add("morel", 4);
    expect(loadCaveDehydrator(m, "morel")).toMatchObject({
      reason: "not enough input",
    });
    m.inventory.add("morel", 1);
    expect(loadCaveDehydrator(m, "morel").ok).toBe(true);
    expect(m.inventory.count("morel")).toBe(0);
    expect(collectCaveDehydrator(m)).toMatchObject({ reason: "machine busy" });
    m.day.clock.day += 1;
    expect(caveDehydratorDone(m)).toBe(true);
    expect(collectCaveDehydrator(m)).toMatchObject({
      ok: true,
      item: "morel-dried",
    });
    expect(m.inventory.count("morel-dried")).toBe(1);
    expect(m.cave.dehydrator).toBeUndefined();
  });
});
