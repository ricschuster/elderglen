import { describe, expect, it } from "vitest";
import { defeatCreature } from "../src/core/creature-defeat";
import {
  CREATURES,
  RARE_BASE,
  RARE_CAP,
  RARE_STEP,
  applyRares,
  baseKind,
  creatureById,
  loadCreature,
  newCreature,
  rareChance,
  rollDrops,
  saveCreature,
  slayerKills,
  SLAYER_GOALS,
  spawnCreatures,
  stepCreature,
  type Creature,
} from "../src/core/creatures";
import {
  DANGER_CREATURES,
  DANGER_DROPS,
  DANGER_HEALTH,
  DANGER_HITS,
  LEVER_FLOOR,
  LEVER_KIND,
  dangerCount,
  dangerDropChance,
  dangerHealth,
  dangerHit,
  dangerOre,
  leverWorks,
} from "../src/core/danger";
import {
  Mines,
  floorCreatures,
  floorLayout,
  floorMapJson,
} from "../src/core/mines";
import { GEMS } from "../src/core/gems";
import { mine } from "../src/core/mining";
import { newGame, serialize, deserialize } from "../src/core/save";
import { seeded } from "../src/core/rng";
import { itemById } from "../src/core/items";

const make = (kind: string): Creature => ({
  ...newCreature(1, kind, 40, 40),
  hp: 0,
});

describe("rare spawn counter", () => {
  it("rises by a step a miss and is capped", () => {
    expect(rareChance(0)).toBe(RARE_BASE);
    expect(rareChance(10)).toBeCloseTo(RARE_BASE + 10 * RARE_STEP);
    expect(rareChance(10000)).toBe(RARE_CAP);
  });

  it("a miss adds one per creature, a hit resets", () => {
    const list = [1, 2, 3].map((i) => newCreature(i, "pebbleback", 0, 0));
    expect(applyRares(list, 1, 4, () => 0.99)).toBe(7);
    expect(list.every((c) => c.kind === "pebbleback")).toBe(true);
    // A roll of 0 always hits: the first creature turns rare, the streak resets, then two misses.
    const seq = [0, 0.99, 0.99];
    let i = 0;
    const left = applyRares(list, 1, 4, () => seq[i++]!);
    expect(list[0]!.kind).toBe("golden-gloop");
    expect(list[0]!.hp).toBe(creatureById("golden-gloop")!.hp);
    expect(left).toBe(2);
  });

  it("each band has its own rare", () => {
    for (const [band, id] of [
      [1, "golden-gloop"],
      [2, "glimmer-nibbler"],
      [3, "ember-lantern"],
    ] as const) {
      const list = [newCreature(1, "x", 0, 0)];
      applyRares(list, band, 0, () => 0);
      expect(list[0]!.kind).toBe(id);
    }
  });

  it("never enters the normal spawn pool", () => {
    const rares = CREATURES.filter((c) => c.rare);
    expect(rares).toHaveLength(3);
    for (const r of rares) expect(r.bands).toEqual([]);
  });

  it("the mine keeps one saved counter per band", () => {
    const m = new Mines();
    m.visit(3, 5);
    m.visit(50, 5);
    expect(m.rareMisses[0]).toBeGreaterThan(0);
    expect(m.rareMisses[1]).toBeGreaterThan(0);
    expect(m.rareMisses[2]).toBe(0);
    const back = new Mines();
    back.load(JSON.parse(JSON.stringify(m.save())));
    expect(back.rareMisses).toEqual(m.rareMisses);
    const old = new Mines();
    old.load({ deepest: 0, misses: 0, copperHandedIn: false, floors: {} });
    expect(old.rareMisses).toEqual([0, 0, 0]);
  });
});

describe("rare creatures", () => {
  it("Golden Gloop drops gold ore and gilded jelly, and the item exists", () => {
    const d = rollDrops(creatureById("golden-gloop")!, () => 0);
    expect(d.map((x) => x.id).sort()).toEqual(["gilded-jelly", "gold-ore"]);
    expect(itemById("gilded-jelly")?.sellPrice).toBeGreaterThan(0);
  });

  it("Glimmer Nibbler drops a gem of band 2", () => {
    const mid = GEMS.filter((g) => g.minFloor >= 41 && g.minFloor < 81).map(
      (g) => g.id,
    );
    for (const r of [0, 0.4, 0.99]) {
      const d = rollDrops(creatureById("glimmer-nibbler")!, () => r);
      expect(d).toHaveLength(1);
      expect(mid).toContain(d[0]!.id);
    }
  });

  it("Ember Lantern drops Hearthsilver ore", () => {
    expect(rollDrops(creatureById("ember-lantern")!, () => 0)).toEqual([
      { id: "hearthsilver-ore", count: 1 },
    ]);
  });

  it("a rare kill counts for its base goal and is found once", () => {
    const g = newGame();
    expect(baseKind("golden-gloop")).toBe("gloop");
    defeatCreature(g, make("golden-gloop"), "farm", undefined, 16, () => 0);
    defeatCreature(g, make("golden-gloop"), "farm", undefined, 16, () => 0);
    expect(g.combat.kills["gloop"]).toBe(2);
    expect(g.combat.kills["golden-gloop"]).toBeUndefined();
    const goal = SLAYER_GOALS.find((s) => s.id === "gloop")!;
    expect(slayerKills(goal, g.combat.kills)).toBe(2);
    expect(g.combat.rareFound).toEqual(["golden-gloop"]);
    const back = newGame();
    back.combat.load(JSON.parse(JSON.stringify(g.combat.save())));
    expect(back.combat.rareFound).toEqual(["golden-gloop"]);
    // Older saves have none.
    const old = newGame();
    old.combat.load({ health: 50, trainerMet: false, kills: {}, counter: [] });
    expect(old.combat.rareFound).toEqual([]);
    const full = deserialize(serialize(g))!;
    expect(full?.combat.rareFound).toEqual(["golden-gloop"]);
  });

  it("the Golden Gloop flees and never attacks", () => {
    const c = newCreature(1, "golden-gloop", 100, 100);
    const player = { x: 110, y: 100 };
    const w = {
      player,
      walk: (_: Creature, dx: number, dy: number) => ({
        x: c.x + dx,
        y: c.y + dy,
      }),
      random: () => 0.5,
      assist: false,
      tileSize: 16,
    };
    let hit = false;
    for (let i = 0; i < 400; i++) hit = !!stepCreature(c, 0.05, w).hit || hit;
    expect(hit).toBe(false);
    expect(c.x).toBeLessThan(100);
  });

  it("saves and loads as itself", () => {
    const c = newCreature(2, "ember-lantern", 40, 40);
    expect(loadCreature(saveCreature(c))?.kind).toBe("ember-lantern");
  });
});

describe("dangerous mode", () => {
  it("the multipliers are the owner's numbers", () => {
    expect([
      DANGER_HEALTH,
      DANGER_HITS,
      DANGER_CREATURES,
      DANGER_DROPS,
    ]).toEqual([3, 2.5, 1.5, 1.5]);
    expect(dangerHealth(6, true)).toBe(18);
    expect(dangerHealth(6, false)).toBe(6);
    expect(dangerHit(4, true)).toBe(10);
    expect(dangerHit(9, true)).toBe(23);
    expect(dangerHit(9, false)).toBe(9);
    expect(dangerCount(5, true)).toBe(8);
    expect(dangerCount(8, true)).toBe(12);
    expect(dangerCount(8, false)).toBe(8);
    expect(dangerDropChance(0.6, true)).toBeCloseTo(0.9);
    expect(dangerDropChance(0.8, true)).toBe(1);
    expect(dangerDropChance(0.6, false)).toBe(0.6);
    expect(dangerOre(2, true)).toBe(3);
    expect(dangerOre(2, false)).toBe(2);
  });

  it("the lever works once floor 120 is reached", () => {
    expect(leverWorks(119)).toBe(false);
    expect(leverWorks(120)).toBe(true);
    const m = new Mines();
    expect(m.flipDangerous()).toBeUndefined();
    expect(m.dangerous).toBe(false);
    m.visit(LEVER_FLOOR, 5);
    expect(m.flipDangerous()).toBe(true);
    expect(m.flipDangerous()).toBe(false);
  });

  it("a flip has no effect today and applies when the day ends", () => {
    const m = new Mines();
    m.visit(LEVER_FLOOR, 5);
    expect(m.flipDangerous()).toBe(true);
    expect(m.dangerous).toBe(false);
    expect(m.dangerousTomorrow).toBe(true);
    // A floor made today, after the flip, is still calm.
    expect(m.visit(60, 5).dangerous).toBe(false);
    m.endDay();
    expect(m.dangerous).toBe(true);
    expect(m.visit(60, 6).dangerous).toBe(true);
    expect(m.visit(61, 6).dangerous).toBe(true);
  });

  it("flipping back before the day ends cancels the flip", () => {
    const m = new Mines();
    m.visit(LEVER_FLOOR, 5);
    m.flipDangerous();
    m.flipDangerous();
    m.endDay();
    expect(m.dangerous).toBe(false);
    expect(m.save().dangerousTomorrow).toBeUndefined();
  });

  it("a flip back to calm applies tomorrow too", () => {
    const m = new Mines();
    m.visit(LEVER_FLOOR, 5);
    m.flipDangerous();
    m.endDay();
    expect(m.flipDangerous()).toBe(false);
    expect(m.dangerous).toBe(true);
    expect(m.visit(40, 6).dangerous).toBe(true);
    m.endDay();
    expect(m.dangerous).toBe(false);
  });

  it("a pending flip survives a save, through the whole game save too", () => {
    const g = newGame();
    g.mines.visit(LEVER_FLOOR, 1);
    g.mines.flipDangerous();
    const back = deserialize(serialize(g))!;
    expect(back.mines.dangerous).toBe(false);
    expect(back.mines.dangerousTomorrow).toBe(true);
    back.mines.endDay();
    expect(back.mines.dangerous).toBe(true);
    // Active mode and a dangerous floor also come back.
    const h = newGame();
    h.mines.visit(LEVER_FLOOR, 1);
    h.mines.flipDangerous();
    h.mines.endDay();
    h.mines.visit(50, 2);
    const again = deserialize(serialize(h))!;
    expect(again.mines.dangerous).toBe(true);
    expect(again.mines.dangerousTomorrow).toBe(true);
    expect(again.mines.today(50, 2)?.dangerous).toBe(true);
  });

  it("floor 120 has the lever, no other floor does", () => {
    expect(floorLayout(120, 7).lever).toBeDefined();
    expect(floorLayout(119, 7).lever).toBeUndefined();
    const json = floorMapJson(floorLayout(120, 7));
    const text = JSON.stringify(json);
    expect(text).toContain(LEVER_KIND);
    expect(JSON.stringify(floorMapJson(floorLayout(30, 7)))).not.toContain(
      LEVER_KIND,
    );
    // Never under a rock or creature.
    const lever = floorLayout(120, 7).lever!;
    expect(
      floorLayout(120, 7).rocks.some((r) => r.x === lever.x && r.y === lever.y),
    ).toBe(false);
    expect(
      floorCreatures(120, 7).some(
        (c) =>
          Math.floor(c.x / 16) === lever.x &&
          Math.floor((c.y - 1) / 16) === lever.y,
      ),
    ).toBe(false);
  });

  it("floors made while on have more, tougher creatures and are saved", () => {
    const m = new Mines();
    m.visit(120, 5);
    m.flipDangerous();
    m.endDay();
    const hard = m.visit(60, 5);
    expect(hard.dangerous).toBe(true);
    const calm = floorCreatures(60, 5, false);
    expect(hard.creatures.length).toBeGreaterThan(calm.length);
    for (const c of hard.creatures) {
      const def = creatureById(c.kind)!;
      expect(c.hp).toBe(def.hp * 3);
    }
    // A floor made earlier stays as it was.
    expect(m.visit(120, 5).dangerous).toBe(false);
    const back = new Mines();
    back.load(JSON.parse(JSON.stringify(m.save())));
    expect(back.dangerous).toBe(true);
    expect(back.today(60, 5)?.dangerous).toBe(true);
    expect(back.today(60, 5)?.creatures[0]!.hp).toBe(hard.creatures[0]!.hp);
    m.flipDangerous();
    m.endDay();
    expect(m.visit(61, 5).dangerous).toBe(false);
  });

  it("special floors still work", () => {
    const m = new Mines();
    m.visit(120, 1);
    m.flipDangerous();
    m.endDay();
    let infested = 0;
    let geode = 0;
    for (let f = 10; f < 119; f++)
      for (let day = 5; day < 30; day++) {
        const sp = floorLayout(f, day).special;
        if (sp === "geode") {
          geode++;
          expect(floorCreatures(f, day, true)).toEqual([]);
        }
        if (sp === "infested") {
          infested++;
          expect(floorCreatures(f, day, true).length).toBeGreaterThan(
            floorCreatures(f, day, false).length,
          );
        }
      }
    expect(infested).toBeGreaterThan(0);
    expect(geode).toBeGreaterThan(0);
  });

  it("creatures spawn in the dangerous count by band", () => {
    const open = () => true;
    const count = (dangerous: boolean) =>
      spawnCreatures(
        60,
        seeded(9),
        open,
        20,
        14,
        { x: 0, y: 0 },
        16,
        6,
        0,
        dangerous,
      ).length;
    expect(count(true)).toBe(Math.round(count(false) * 1.5));
  });

  it("drops are likelier on a dangerous floor", () => {
    const def = creatureById("gloop")!;
    // The 0.6 jelly drops at a roll of 0.8 only when dangerous (0.9).
    expect(rollDrops(def, () => 0.8, false).map((d) => d.id)).not.toContain(
      "gloop-jelly",
    );
    expect(rollDrops(def, () => 0.8, true).map((d) => d.id)).toContain(
      "gloop-jelly",
    );
  });

  it("a node gives one more ore on a dangerous floor", () => {
    const run = (dangerous: boolean) => {
      const g = newGame();
      g.mines.visit(120, g.day.clock.day);
      if (dangerous) {
        g.mines.flipDangerous();
        g.mines.endDay();
      }
      const f = g.mines.visit(40, g.day.clock.day);
      f.rocks.add(5, 5, "copper");
      const before = g.ground.count;
      void before;
      mine(g, 5, 5, 40, () => 0.99);
      mine(g, 5, 5, 40, () => 0.99);
      mine(g, 5, 5, 40, () => 0.99);
      mine(g, 5, 5, 40, () => 0.99);
      mine(g, 5, 5, 40, () => 0.99);
      mine(g, 5, 5, 40, () => 0.99);
      return f;
    };
    const plain = run(false);
    const hard = run(true);
    const count = (f: ReturnType<typeof run>) =>
      f.ground
        .each()
        .reduce((n, p) => n + (p.id === "copper-ore" ? p.count : 0), 0);
    expect(count(hard)).toBe(count(plain) + 1);
  });
});
