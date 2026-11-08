import { describe, expect, it } from "vitest";
import {
  Combat,
  NIMBLE_GRACE,
  STEADY_HEALTH,
  WEAPONS,
  forgeWeapon,
  graceFor,
  healthFor,
  weaponById,
} from "../src/core/combat";
import {
  CREATURES,
  SLAYER_GOALS,
  creatureById,
  creatureXp,
  hurtCreature,
  loadCreature,
  newCreature,
  saveCreature,
  slayerKills,
  splitOff,
  stepCreature,
  swingDamage,
  type StepWorld,
} from "../src/core/creatures";
import { choose, optionsFor, pendingChoice } from "../src/core/professions";
import { ringProgress } from "../src/core/completion";
import { deserialize, newGame, serialize } from "../src/core/save";
import { itemById } from "../src/core/items";
import { SKILLS, Skills } from "../src/core/skills";

const world = (px: number, py: number): StepWorld => ({
  player: { x: px, y: py },
  walk: (c, dx, dy) => ({ x: c.x + dx, y: c.y + dy }),
  random: () => 0.5,
  assist: false,
  tileSize: 16,
});

describe("the creature roster", () => {
  it("has every drop as an item and a slayer goal for each kind", () => {
    for (const c of CREATURES) {
      for (const d of c.drops) expect(itemById(d.id), d.id).toBeDefined();
      expect(c.xp).toBeGreaterThan(0);
      expect(c.touch).toBeGreaterThanOrEqual(4);
      expect(c.touch).toBeLessThanOrEqual(12);
      if (c.behaviour === "dasher") expect(c.dash).toBeDefined();
    }
    expect(SLAYER_GOALS).toHaveLength(12);
    expect(SLAYER_GOALS.find((g) => g.id === "gloop")?.kinds).toEqual([
      "gloop",
      "gloop-blue",
      "gloop-red",
    ]);
  });

  it("a dasher winds up, dashes in a straight line and hits once", () => {
    const def = creatureById("nabbler")!;
    const c = newCreature(1, "nabbler", 100, 100);
    const w = world(140, 100);
    stepCreature(c, 0.05, w);
    expect(c.state).toBe("windup");
    stepCreature(c, def.windup + 0.01, w);
    expect(c.state).toBe("dash");
    // The player steps aside after the dash is locked: it misses.
    const aside = world(140, 130);
    let hit = 0;
    for (let i = 0; i < 40 && c.state === "dash"; i++)
      hit += stepCreature(c, 0.05, aside).hit ?? 0;
    expect(hit).toBe(0);
    expect(c.state).toBe("recover");
    expect(c.y).toBeCloseTo(100, 5);
    // A player standing in the path is hit.
    const d = newCreature(2, "nabbler", 100, 100);
    stepCreature(d, 0.05, w);
    stepCreature(d, def.windup + 0.01, w);
    let landed = 0;
    for (let i = 0; i < 40 && d.state === "dash"; i++)
      landed += stepCreature(d, 0.05, w).hit ?? 0;
    expect(landed).toBe(def.touch);
  });

  it("a bat hangs still until it dashes", () => {
    const c = newCreature(1, "cave-bat", 100, 100);
    stepCreature(c, 0.1, world(100 + 16 * 5, 100));
    expect(c.x).toBe(100);
  });

  it("a hopper moves in three hops and rests", () => {
    const c = newCreature(1, "icicle-hopper", 100, 100);
    const w = world(100 + 16 * 4.5, 100);
    let moves = 0;
    let was = c.x;
    for (let i = 0; i < 21; i++) {
      stepCreature(c, 0.1, w);
      if (c.x !== was) moves++;
      was = c.x;
      if (c.state === "windup") break;
    }
    expect(moves).toBeGreaterThan(0);
    expect(moves).toBeLessThan(21);
  });

  it("a rock crab plays dead until the player is near", () => {
    const c = newCreature(1, "rock-crab", 100, 100);
    stepCreature(c, 0.1, world(100 + 16 * 4, 100));
    expect(c.state).toBe("wander");
    expect(c.x).toBe(100);
    stepCreature(c, 0.1, world(100 + 16 * 1.5, 100));
    expect(c.state).toBe("chase");
  });

  it("armour halves blade and sling hits from the front, never a club", () => {
    const crab = newCreature(1, "rock-crab", 100, 100);
    crab.face = 0; // facing right
    expect(swingDamage(crab, 4, "blade", { x: 120, y: 100 })).toBe(2);
    expect(swingDamage(crab, 1, "sling", { x: 120, y: 100 })).toBe(1);
    expect(swingDamage(crab, 4, "blade", { x: 80, y: 100 })).toBe(4);
    expect(swingDamage(crab, 4, "club", { x: 120, y: 100 })).toBe(4);
    const beetle = newCreature(2, "mossbeetle", 100, 100);
    expect(swingDamage(beetle, 4, "blade", { x: 80, y: 100 })).toBe(4);
    beetle.state = "dash";
    expect(swingDamage(beetle, 4, "blade", { x: 80, y: 100 })).toBe(2);
    expect(swingDamage(beetle, 4, "club", { x: 80, y: 100 })).toBe(4);
  });

  it("a Gloop splits once, and the small one does not split or hit as hard", () => {
    const g = newCreature(1, "gloop", 100, 100);
    expect(hurtCreature(g, 1)).toBe(false);
    const small = splitOff(g, 2)!;
    expect(small.small).toBe(true);
    expect(small.hp).toBe(1);
    expect(splitOff(small, 3)).toBeUndefined();
    expect(creatureXp(small)).toBe(Math.ceil(creatureXp(g) / 2));
    expect(splitOff(newCreature(4, "pebbleback", 0, 0), 5)).toBeUndefined();
    const back = loadCreature(saveCreature(small))!;
    expect(back.small).toBe(true);
    // A small blob hits for half.
    const w = world(105, 100);
    stepCreature(small, 0.5, { ...w, player: { x: 130, y: 100 } });
    small.state = "windup";
    small.t = 0.01;
    expect(stepCreature(small, 0.05, w).hit).toBe(
      Math.ceil(creatureById("gloop")!.touch / 2),
    );
  });
});

describe("weapons part two", () => {
  it("has iron, gold and Hearthsilver tiers, each stronger than the last", () => {
    for (const fam of ["switch", "rolling-pin", "sling"]) {
      const ids = ["copper", "iron", "gold", "hearthsilver"].map((t) =>
        weaponById(`${t}-${fam}`),
      );
      ids.forEach((w) => expect(w).toBeDefined());
      for (let i = 1; i < ids.length; i++)
        expect(ids[i]!.damage).toBeGreaterThan(ids[i - 1]!.damage);
    }
    expect(WEAPONS.filter((w) => w.tier === 4)).toHaveLength(3);
  });

  it("forges an iron weapon from iron bars and gold", () => {
    const g = newGame();
    g.inventory.add("iron-bar", 4);
    g.money = 400;
    expect(forgeWeapon(g, "iron-switch")).toBeUndefined();
    expect(g.inventory.count("iron-switch")).toBe(1);
    expect(g.money).toBe(0);
  });
});

describe("the combat skill", () => {
  it("is a fifth skill that raises health", () => {
    expect(SKILLS).toContain("combat");
    const s = new Skills();
    expect(healthFor(s)).toBe(100);
    s.gain("combat", 380);
    expect(s.level("combat")).toBe(2);
    expect(healthFor(s)).toBe(110);
  });

  it("offers Steady and Nimble at level 5", () => {
    const s = new Skills();
    s.gain("combat", 2150);
    expect(pendingChoice(s)).toBe("combat");
    expect(optionsFor("combat").map((p) => p.id)).toEqual(["steady", "nimble"]);
    expect(choose(s, "combat", "steady")).toBe(true);
    expect(healthFor(s)).toBe(125 + STEADY_HEALTH);
    expect(graceFor(s)).toBe(1.5);
    const n = new Skills();
    n.gain("combat", 2150);
    choose(n, "combat", "nimble");
    expect(graceFor(n)).toBe(NIMBLE_GRACE);
  });

  it("sync raises the ceiling without healing, and nimble lengthens grace", () => {
    const g = newGame();
    g.combat.health.current = 50;
    g.skills.gain("combat", 2150);
    g.skills.setProfession("combat", "nimble");
    g.combat.sync(g.skills);
    expect(g.combat.health.max).toBe(125);
    expect(g.combat.health.current).toBe(50);
    g.combat.health.hurt(5);
    expect(g.combat.health.grace).toBe(NIMBLE_GRACE);
  });

  it("an old save with no combat row loads at level 0", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.skills.combat;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.skills.level("combat")).toBe(0);
    expect(back.combat.health.max).toBe(100);
  });

  it("a save keeps combat XP, Steady health and the current health", () => {
    const g = newGame();
    g.skills.gain("combat", 2150);
    g.skills.setProfession("combat", "steady");
    g.combat.sync(g.skills);
    g.combat.health.current = 140;
    const back = deserialize(serialize(g))!;
    expect(back.skills.level("combat")).toBe(5);
    expect(back.combat.health.max).toBe(150);
    expect(back.combat.health.current).toBe(140);
  });
});

describe("the slayer goals", () => {
  it("count Gloop colours together and feed the completion total", () => {
    const g = newGame();
    const slayer = () =>
      ringProgress(g)[0]!.categories.find((c) => c.id === "slayer")!;
    expect(slayer().total).toBe(12);
    g.combat.kills = { gloop: 400, "gloop-blue": 400, "gloop-red": 200 };
    const gloop = SLAYER_GOALS.find((s) => s.id === "gloop")!;
    expect(slayerKills(gloop, g.combat.kills)).toBe(1000);
    expect(slayer().done).toBe(1);
    g.combat.kills.pebbleback = 30;
    expect(slayer().done).toBe(2);
  });
});

describe("combat defaults", () => {
  it("a new Combat has full health", () => {
    expect(new Combat().health.max).toBe(100);
  });
});
