import { describe, expect, it } from "vitest";
import {
  ASSIST_DAMAGE,
  BASE_HEALTH,
  FORGED,
  GRACE_SECONDS,
  HEALTH_PER_ENERGY,
  Health,
  STARTERS,
  WEAPONS,
  buyBack,
  forgeWeapon,
  healthShown,
  isSafeFromDefeat,
  loseItems,
  maxHealth,
  recoveryFee,
  swingTargets,
  takeStarter,
  weaponById,
} from "../src/core/combat";
import {
  ASSIST_WINDUP,
  CREATURES,
  creaturesOfBand,
  LOSE_SECONDS,
  bandNumber,
  creatureById,
  floorHasCreatures,
  hurtCreature,
  loadCreature,
  newCreature,
  rollDrops,
  saveCreature,
  spawnCreatures,
  stepCreature,
  type Creature,
  type StepWorld,
} from "../src/core/creatures";
import { Mines, floorCreatures, floorLayout } from "../src/core/mines";
import { deserialize, newGame, serialize } from "../src/core/save";
import { eat } from "../src/core/actions";
import { itemById } from "../src/core/items";
import { reportLines } from "../src/core/report";
import { sleep } from "../src/core/sleep";
import { MAX_ENERGY } from "../src/core/energy";
import { PASS_OUT_WAKE_ENERGY } from "../src/core/day";
import { BUNDLES } from "../src/core/bundles";
import {
  deserializeSettings,
  serializeSettings,
  defaultSettings,
} from "../src/core/bindings";

const never = () => 0.99;

describe("health", () => {
  it("starts at 100 and grows 5 a combat level", () => {
    expect(BASE_HEALTH).toBe(100);
    expect(maxHealth()).toBe(100);
    expect(maxHealth(4)).toBe(120);
  });

  it("takes a hit, then gives grace so hits never chain", () => {
    const h = new Health();
    expect(h.hurt(8)).toBe(8);
    expect(h.current).toBe(92);
    expect(h.hurt(8)).toBe(0);
    h.tick(GRACE_SECONDS + 0.01);
    expect(h.hurt(8)).toBe(8);
  });

  it("assist halves a hit, rounded up, never to nothing", () => {
    const h = new Health();
    expect(h.hurt(9, true)).toBe(Math.ceil(9 * ASSIST_DAMAGE));
    const g = new Health();
    expect(g.hurt(1, true)).toBe(1);
  });

  it("stops at zero, heals to the maximum and refills", () => {
    const h = new Health();
    h.current = 3;
    expect(h.hurt(12)).toBe(3);
    expect(h.down).toBe(true);
    h.heal(500);
    expect(h.current).toBe(h.max);
    h.current = 10;
    h.fill();
    expect(h.full).toBe(true);
  });

  it("shows only where health can be lost", () => {
    expect(healthShown(true, false)).toBe(true);
    expect(healthShown(true, true)).toBe(false);
    expect(healthShown(false, false)).toBe(false);
    expect(floorHasCreatures(1)).toBe(true);
    expect(floorHasCreatures(60)).toBe(true);
    expect(floorHasCreatures(120)).toBe(true);
  });

  it("food restores health as a share of its energy", () => {
    const g = newGame();
    g.combat.health.current = 50;
    g.day.energy.current = MAX_ENERGY - 10;
    g.inventory.add("parsnip");
    const gain = itemById("parsnip")!.energy!;
    expect(eat(g, "parsnip").ok).toBe(true);
    expect(g.combat.health.current).toBe(
      50 + Math.round(gain * HEALTH_PER_ENERGY),
    );
  });

  it("a hurt player is hungry even with full energy", () => {
    const g = newGame();
    g.inventory.add("parsnip");
    expect(eat(g, "parsnip")).toEqual({ ok: false, reason: "not hungry" });
    g.combat.health.current = 90;
    expect(eat(g, "parsnip").ok).toBe(true);
  });
});

describe("weapons", () => {
  it("has three families and five tiers of each", () => {
    expect(WEAPONS).toHaveLength(15);
    expect(new Set(WEAPONS.map((w) => w.family))).toEqual(
      new Set(["blade", "club", "sling"]),
    );
    expect(STARTERS.map((w) => w.id)).toEqual([
      "hazel-switch",
      "rolling-pin",
      "pocket-sling",
    ]);
    expect(FORGED).toHaveLength(12);
    for (const w of WEAPONS) expect(itemById(w.id)?.keep).toBe(true);
  });

  const at = { x: 100, y: 100 };
  const at2 = (dx: number, dy: number): Creature =>
    newCreature(1, "pebbleback", at.x + dx, at.y + dy);

  it("a blade hits the arc in front, not behind, and only the nearest", () => {
    const blade = weaponById("hazel-switch")!;
    const front = at2(14, 0);
    const front2 = { ...at2(10, 2), uid: 2 };
    const behind = { ...at2(-14, 0), uid: 3 };
    const hits = swingTargets(blade, "right", at, [behind, front2, front]);
    expect(hits.map((c) => c.uid)).toEqual([2]);
    expect(swingTargets(blade, "left", at, [front])).toEqual([]);
  });

  it("a club hits several, and reaches wider than a blade", () => {
    const club = weaponById("rolling-pin")!;
    const a = at2(14, 0);
    const b = { ...at2(6, 20), uid: 2 };
    const hits = swingTargets(club, "right", at, [a, b]);
    expect(hits).toHaveLength(2);
    expect(swingTargets(weaponById("hazel-switch")!, "right", at, [b])).toEqual(
      [],
    );
  });

  it("a sling shot flies straight and hits the first creature on the line", () => {
    const sling = weaponById("pocket-sling")!;
    const near = at2(30, 2);
    const far = { ...at2(60, 0), uid: 2 };
    const off = { ...at2(40, 30), uid: 3 };
    const out = { ...at2(200, 0), uid: 4 };
    const hits = swingTargets(sling, "right", at, [far, near, off, out]);
    expect(hits.map((c) => c.uid)).toEqual([1]);
  });

  it("the trainer gives each starter free, once at a time", () => {
    const g = newGame();
    expect(g.combat.trainerMet).toBe(false);
    expect(takeStarter(g, "hazel-switch")).toBeUndefined();
    expect(g.combat.trainerMet).toBe(true);
    expect(takeStarter(g, "hazel-switch")).toBe("You already carry one.");
    expect(takeStarter(g, "copper-switch")).toBe("She has no such thing.");
    expect(g.money).toBe(500);
  });

  it("the smith forges a copper weapon from bars and gold", () => {
    const g = newGame();
    expect(forgeWeapon(g, "copper-switch")).toMatch(/copper bars/);
    g.inventory.add("copper-bar", 4);
    g.money = 100;
    expect(forgeWeapon(g, "copper-switch")).toBe("Not enough money.");
    g.money = 250;
    expect(forgeWeapon(g, "copper-switch")).toBeUndefined();
    expect(g.money).toBe(50);
    expect(g.inventory.count("copper-bar")).toBe(0);
    expect(g.inventory.count("copper-switch")).toBe(1);
    expect(forgeWeapon(g, "hazel-switch")).toBe("She cannot forge that.");
  });
});

describe("creatures", () => {
  it("has twelve kinds across the three bands, each with a drop list", () => {
    expect(CREATURES).toHaveLength(14);
    for (const band of [1, 2, 3])
      expect(creaturesOfBand(band).length).toBeGreaterThanOrEqual(4);
    for (const c of CREATURES) {
      expect(c.speed).toBeLessThan(80);
      expect(c.windup).toBeGreaterThanOrEqual(0.6);
      for (const d of c.drops) expect(itemById(d.id)).toBeDefined();
    }
  });

  it("spawns 2 to 5 on a first band floor, never on rocks, ladders or near the arrival", () => {
    expect(bandNumber(40)).toBe(1);
    expect(bandNumber(41)).toBe(2);
    for (let floor = 1; floor <= 40; floor++) {
      const day = 5 + floor;
      const layout = floorLayout(floor, day);
      const list = floorCreatures(floor, day);
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.length).toBeLessThanOrEqual(5);
      for (const c of list) {
        const tx = Math.floor(c.x / 16);
        const ty = Math.floor((c.y - 1) / 16);
        expect(layout.walls[ty * 20 + tx]).toBe(false);
        expect(layout.rocks.some((r) => r.x === tx && r.y === ty)).toBe(false);
        expect(
          layout.ladder && layout.ladder.x === tx && layout.ladder.y === ty,
        ).toBeFalsy();
        expect(
          Math.max(Math.abs(tx - 2), Math.abs(ty - 1)),
        ).toBeGreaterThanOrEqual(6);
      }
      expect(floorCreatures(floor, day).map((c) => c.x)).toEqual(
        list.map((c) => c.x),
      );
    }
    for (const floor of [41, 80, 81, 120]) {
      const list = floorCreatures(floor, 9);
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.length).toBeLessThanOrEqual(8);
      for (const c of list)
        expect(creatureById(c.kind)!.bands).toContain(bandNumber(floor));
    }
  });

  it("spawnCreatures spreads over open tiles only", () => {
    const list = spawnCreatures(
      1,
      () => 0.5,
      (x) => x === 10,
      20,
      14,
      { x: 2, y: 1 },
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => Math.floor(c.x / 16) === 10)).toBe(true);
  });

  const world = (px: number, py: number, assist = false): StepWorld => ({
    player: { x: px, y: py },
    walk: (c, dx, dy) => ({ x: c.x + dx, y: c.y + dy }),
    random: () => 0.5,
    assist,
    tileSize: 16,
  });

  it("winds up before it hits, and walking away dodges the hit", () => {
    const def = creatureById("pebbleback")!;
    const c = newCreature(1, "pebbleback", 100, 100);
    const w = world(110, 100);
    expect(stepCreature(c, 0.05, w).hit).toBeUndefined();
    expect(c.state).toBe("windup");
    // Half way through the wind up nothing has landed.
    expect(stepCreature(c, def.windup / 2, w).hit).toBeUndefined();
    expect(stepCreature(c, def.windup, w).hit).toBe(def.touch);
    expect(c.state).toBe("recover");

    const d = newCreature(2, "pebbleback", 100, 100);
    stepCreature(d, 0.05, world(110, 100));
    expect(d.state).toBe("windup");
    expect(
      stepCreature(d, def.windup + 0.1, world(180, 100)).hit,
    ).toBeUndefined();
  });

  it("assist lengthens the wind up", () => {
    const def = creatureById("pebbleback")!;
    const c = newCreature(1, "pebbleback", 100, 100);
    stepCreature(c, 0.01, world(110, 100, true));
    expect(c.t).toBeCloseTo(def.windup * ASSIST_WINDUP, 5);
  });

  it("steps back and pauses after a hit, then goes back to wandering", () => {
    const def = creatureById("pebbleback")!;
    const c = newCreature(1, "pebbleback", 100, 100);
    const w = world(110, 100);
    stepCreature(c, 0.05, w);
    stepCreature(c, def.windup + 0.01, w);
    const x = c.x;
    stepCreature(c, 0.1, w);
    expect(c.x).toBeLessThan(x);
    expect(stepCreature(c, 0.1, w).hit).toBeUndefined();
    stepCreature(c, def.recover, w);
    expect(c.state).toBe("wander");
  });

  it("chases only inside its sight, and loses interest when far for 3 seconds", () => {
    const c = newCreature(1, "pebbleback", 100, 100);
    stepCreature(c, 0.05, world(100 + 8 * 16, 100));
    expect(c.state).toBe("wander");
    stepCreature(c, 0.05, world(100 + 4 * 16, 100));
    expect(c.state).toBe("chase");
    const far = {
      ...world(100 + 7 * 16, 100),
      walk: (cr: Creature) => ({ x: cr.x, y: cr.y }),
    };
    for (let t = 0; t < LOSE_SECONDS + 0.2; t += 0.1) stepCreature(c, 0.1, far);
    expect(c.state).toBe("wander");
  });

  it("is never faster than walking", () => {
    const c = newCreature(1, "pebbleback", 100, 100);
    stepCreature(c, 0.05, world(100 + 4 * 16, 100));
    const x = c.x;
    stepCreature(c, 1, world(100 + 4 * 16, 100));
    expect(c.x - x).toBeLessThan(80);
  });

  it("a dustmoth drifts in loops and puffs with a wind up", () => {
    const c = newCreature(1, "dustmoth", 100, 100);
    const a = c.angle;
    stepCreature(c, 0.5, world(300, 100));
    expect(c.angle).toBeGreaterThan(a);
    const d = newCreature(2, "dustmoth", 100, 100);
    stepCreature(d, 0.05, world(108, 100));
    expect(d.state).toBe("windup");
  });

  it("a weapon hit staggers it, and the last hit beats it", () => {
    const c = newCreature(1, "pebbleback", 0, 0);
    expect(hurtCreature(c, 2)).toBe(false);
    expect(c.state).toBe("stagger");
    expect(hurtCreature(c, 2)).toBe(true);
  });

  it("rolls drops by chance and count", () => {
    const def = creatureById("pebbleback")!;
    expect(rollDrops(def, () => 0)).toEqual([
      { id: "stone", count: 1 },
      { id: "copper-ore", count: 1 },
    ]);
    expect(rollDrops(def, never)).toEqual([{ id: "stone", count: 2 }]);
  });

  it("saves and loads a creature, dropping an unknown kind", () => {
    const c = newCreature(3, "dustmoth", 40, 50);
    c.hp = 1;
    const back = loadCreature(saveCreature(c))!;
    expect(back.hp).toBe(1);
    expect(back.x).toBe(40);
    expect(loadCreature({ ...saveCreature(c), kind: "nope" })).toBeUndefined();
  });
});

describe("a beaten creature and the ladder", () => {
  it("rolls the dry streak chance from the same counter as rocks", () => {
    const m = new Mines();
    // A day whose floor shows no free ladder.
    let day = 5;
    while (m.visit(1, day).ladder) day++;
    expect(m.creatureBeaten(1, day, 4, 4, never)).toBe(false);
    expect(m.misses).toBe(1);
    expect(m.creatureBeaten(1, day, 4, 4, () => 0)).toBe(true);
    expect(m.misses).toBe(0);
    expect(m.visit(1, day).ladder).toEqual({ x: 4, y: 4 });
  });

  it("never rolls on the bottom floor", () => {
    const m = new Mines();
    expect(m.creatureBeaten(120, 5, 4, 4, () => 0)).toBe(false);
  });

  it("keeps the floor's creatures and the dead stay dead, through a save", () => {
    const g = newGame();
    const f = g.mines.visit(2, 6);
    const n = f.creatures.length;
    expect(n).toBeGreaterThanOrEqual(2);
    f.creatures.pop();
    const back = deserialize(serialize(g))!;
    expect(back.mines.today(2, 6)!.creatures).toHaveLength(n - 1);
  });

  it("a floor saved before creatures existed gets its day's creatures on load", () => {
    const g = newGame();
    g.mines.visit(3, 7);
    const raw = JSON.parse(serialize(g));
    delete raw.mines.floors[3].creatures;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.mines.today(3, 7)!.creatures.length).toBeGreaterThanOrEqual(2);
  });
});

describe("defeat", () => {
  const stocked = () => {
    const g = newGame();
    g.inventory.add("hazel-switch");
    g.inventory.add("parsnip-seed", 5);
    g.inventory.add("oak-sapling");
    g.inventory.add("parsnip", 8);
    g.inventory.add("daffodil", 3);
    g.inventory.add("stone", 20);
    g.inventory.add("copper-ore", 4);
    g.inventory.add("wood", 30);
    return g;
  };

  it("never takes a tool, weapon, seed, kept item or bundle good", () => {
    expect(isSafeFromDefeat("hazel-switch")).toBe(true);
    expect(isSafeFromDefeat("parsnip-seed")).toBe(true);
    expect(isSafeFromDefeat("mixed-seed")).toBe(true);
    expect(isSafeFromDefeat("chest")).toBe(true);
    const bundleGood = BUNDLES[0]!.items[0]!.id;
    expect(isSafeFromDefeat(bundleGood)).toBe(true);
    expect(isSafeFromDefeat(`${bundleGood}@gold`)).toBe(true);
    expect(isSafeFromDefeat("clay")).toBe(false);
  });

  it("takes at most three stacks, and the rest are kept", () => {
    const g = stocked();
    const lost = loseItems(g, () => 0, false);
    expect(lost.length).toBeLessThanOrEqual(3);
    expect(lost.length).toBeGreaterThan(0);
    expect(g.inventory.count("hazel-switch")).toBe(1);
    expect(g.inventory.count("parsnip-seed")).toBe(5);
    for (const l of lost) expect(isSafeFromDefeat(l.id)).toBe(false);
  });

  it("loses a whole stack or half of it by a coin flip", () => {
    const whole = stocked();
    // First roll takes the stack, the coin (0.9) says whole.
    const rolls = [0, 0.9, 0.99, 0.99, 0.99, 0.99, 0.99];
    const lostWhole = loseItems(whole, () => rolls.shift() ?? 0.99, false);
    expect(lostWhole[0]!.count).toBeGreaterThan(0);
    const half = stocked();
    const halfRolls = [0, 0.1, 0.99, 0.99, 0.99, 0.99, 0.99];
    const lostHalf = loseItems(half, () => halfRolls.shift() ?? 0.99, false);
    const id = lostHalf[0]!.id;
    expect(half.inventory.count(id)).toBeGreaterThan(0);
  });

  it("assist loses no items", () => {
    const g = stocked();
    expect(loseItems(g, () => 0, true)).toEqual([]);
    expect(g.inventory.count("stone")).toBe(20);
    expect(g.combat.counter).toEqual([]);
  });

  it("leaves the lost stacks at the counter, priced at their sell value", () => {
    const g = stocked();
    const lost = loseItems(g, () => 0, false);
    expect(g.combat.counter).toEqual(lost);
    const l = lost[0]!;
    expect(recoveryFee(l)).toBe((itemById(l.id)?.sellPrice ?? 0) * l.count);
  });

  it("buying one back charges the fee and the rest stay lost", () => {
    const g = stocked();
    g.combat.counter = [
      { id: "clay", count: 2 },
      { id: "stone", count: 5 },
    ];
    const l = g.combat.counter[0]!;
    const fee = recoveryFee(l);
    g.money = fee + 5;
    const before = g.inventory.count(l.id);
    expect(buyBack(g, 0)).toBeUndefined();
    expect(g.money).toBe(5);
    expect(g.inventory.count(l.id)).toBe(before + l.count);
    expect(g.combat.counter).toEqual([]);
    expect(buyBack(g, 1)).toBeDefined();
  });

  it("refuses a buy back when money is short", () => {
    const g = stocked();
    loseItems(g, () => 0, false);
    g.money = 0;
    expect(buyBack(g, 0)).toBe("Not enough money.");
    expect(g.combat.counter.length).toBeGreaterThan(0);
  });

  it("a new defeat replaces the counter", () => {
    const g = stocked();
    loseItems(g, () => 0, false);
    g.combat.counter = [{ id: "clay", count: 1 }];
    loseItems(g, () => 0.99, false);
    expect(g.combat.counter).toEqual([]);
  });

  it("the counter survives a save", () => {
    const g = stocked();
    const lost = loseItems(g, () => 0, false);
    const back = deserialize(serialize(g))!;
    expect(back.combat.counter).toEqual(lost);
  });

  it("sleeping after a knock out runs the pass-out rule and the item loss", () => {
    const g = stocked();
    g.money = 400;
    g.combat.health.current = 0;
    g.combat.defeatPending = true;
    const report = sleep(g, [], () => 0);
    expect(report.defeat?.lost.length).toBeGreaterThan(0);
    expect(report.moneyLost).toBe(40);
    expect(g.money).toBe(360);
    expect(g.combat.defeatPending).toBe(false);
    expect(g.combat.health.current).toBe(g.combat.health.max);
    expect(g.day.energy.current).toBe(
      Math.round(MAX_ENERGY * PASS_OUT_WAKE_ENERGY.energy),
    );
    const lines = reportLines(report).join(" ");
    expect(lines).toMatch(/knocked out/);
    expect(lines).toMatch(/buy one back/);
    expect(g.combat.counter.length).toBeGreaterThan(0);
  });

  it("assist still costs money but loses no items", () => {
    const g = stocked();
    g.money = 400;
    g.combat.assist = true;
    g.combat.defeatPending = true;
    const report = sleep(g, [], () => 0);
    expect(report.defeat?.lost).toEqual([]);
    expect(report.moneyLost).toBe(40);
  });

  it("an ordinary night restores health and shows no defeat", () => {
    const g = newGame();
    g.combat.health.current = 20;
    const report = sleep(g, [], Math.random);
    expect(report.defeat).toBeUndefined();
    expect(g.combat.health.current).toBe(g.combat.health.max);
  });
});

describe("saves and settings", () => {
  it("round-trips health, the trainer and the kill tally", () => {
    const g = newGame();
    g.combat.health.current = 61;
    g.combat.trainerMet = true;
    g.combat.noteKill("pebbleback");
    g.combat.noteKill("pebbleback");
    const back = deserialize(serialize(g))!;
    expect(back.combat.health.current).toBe(61);
    expect(back.combat.trainerMet).toBe(true);
    expect(back.combat.kills).toEqual({ pebbleback: 2 });
  });

  it("an old save has full health and no trainer yet", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.combat;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.combat.health.current).toBe(100);
    expect(back.combat.trainerMet).toBe(false);
  });

  it("bad combat data falls back safely", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.combat = { health: "lots", trainerMet: 3, kills: { x: -4, y: 2 } };
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.combat.health.current).toBe(100);
    expect(back.combat.kills).toEqual({ y: 2 });
  });

  it("device settings carry assist and no creatures, defaulting to off", () => {
    const d = defaultSettings();
    expect(d.combatAssist).toBe(false);
    expect(d.noCreatures).toBe(false);
    const s = { ...d, combatAssist: true, noCreatures: true };
    const back = deserializeSettings(serializeSettings(s));
    expect(back.combatAssist).toBe(true);
    expect(back.noCreatures).toBe(true);
    const old = JSON.parse(serializeSettings(d));
    delete old.combatAssist;
    delete old.noCreatures;
    expect(deserializeSettings(JSON.stringify(old)).combatAssist).toBe(false);
  });
});
