import { describe, expect, it } from "vitest";
import { defeatCreature } from "../src/core/creature-defeat";
import { Combat, Health } from "../src/core/combat";
import { SLAYER_GOALS, type Creature } from "../src/core/creatures";
import { Equipment, RINGS, ringById } from "../src/core/equipment";
import { HATS } from "../src/core/hats";
import { newGame, serialize, deserialize } from "../src/core/save";
import {
  buyReward,
  claimGoal,
  goalState,
  rewardOf,
  rewardShop,
  wallList,
} from "../src/core/slayerlist";

const goal = (id: string) => SLAYER_GOALS.find((s) => s.id === id)!;

describe("wall list", () => {
  it("has twelve goals, each with a reward", () => {
    const g = newGame();
    const list = wallList(g);
    expect(list).toHaveLength(12);
    for (const row of list) expect(row.reward, row.goal.id).toBeDefined();
    expect(rewardOf(goal("dustmoth"))?.id).toBe("burglar-ring");
    expect(rewardOf(goal("pebbleback"))?.kind).toBe("hat");
    expect(rewardOf(goal("icicle-hopper"))?.count).toBe(25);
  });

  it("the shop prices are the note 22 table", () => {
    const want: Record<string, number> = {
      gloop: 25000,
      dustmoth: 20000,
      "cave-bat": 15000,
      "cinder-pup": 25000,
      "rock-crab": 15000,
      mossbeetle: 10000,
      "old-digger": 20000,
      pebbleback: 20000,
      lanternmoth: 20000,
      frostnibbler: 15000,
      nabbler: 15000,
    };
    for (const [id, price] of Object.entries(want))
      expect(rewardOf(goal(id))?.price, id).toBe(price);
    expect(rewardOf(goal("icicle-hopper"))?.price).toBeUndefined();
  });

  it("state follows the tally: progress, ready, claimed", () => {
    const g = newGame();
    expect(goalState(g, goal("pebbleback"))).toBe("progress");
    g.combat.kills["pebbleback"] = 30;
    expect(goalState(g, goal("pebbleback"))).toBe("ready");
    expect(claimGoal(g, "pebbleback")).toBeUndefined();
    expect(goalState(g, goal("pebbleback"))).toBe("claimed");
  });

  it("claims once: a ring, a hat and the bug meat", () => {
    const g = newGame();
    expect(claimGoal(g, "dustmoth")).toBe("That goal is not met yet.");
    g.combat.kills["dustmoth"] = 500;
    g.combat.kills["pebbleback"] = 30;
    g.combat.kills["icicle-hopper"] = 100;
    expect(claimGoal(g, "dustmoth")).toBeUndefined();
    expect(claimGoal(g, "dustmoth")).toBe("You already took it.");
    expect(g.inventory.count("burglar-ring")).toBe(1);
    expect(claimGoal(g, "pebbleback")).toBeUndefined();
    expect(g.wardrobe.has("hard-hat")).toBe(true);
    expect(claimGoal(g, "icicle-hopper")).toBeUndefined();
    expect(g.inventory.count("bug-meat")).toBe(25);
    expect(claimGoal(g, "icicle-hopper")).toBe("You already took it.");
  });

  it("posts the reward when the pack is full", () => {
    const g = newGame();
    g.combat.kills["dustmoth"] = 500;
    for (let i = 0; i < 200; i++) g.inventory.add(`filler-${i}`, 1);
    expect(g.inventory.add("burglar-ring", 1)).toBe(false);
    const had = g.inventory.count("burglar-ring");
    expect(claimGoal(g, "dustmoth")).toBeUndefined();
    expect(g.inventory.count("burglar-ring")).toBe(had);
    expect(goalState(g, goal("dustmoth"))).toBe("claimed");
  });

  it("the shop lists a met goal's reward, claimed or not, never Bug Meat", () => {
    const g = newGame();
    expect(rewardShop(g)).toEqual([]);
    g.combat.kills["mossbeetle"] = 80;
    g.combat.kills["icicle-hopper"] = 100;
    expect(rewardShop(g).map((r) => r.id)).toEqual(["beetle-head-hat"]);
    g.money = 9999;
    expect(buyReward(g, "beetle-head-hat")).toBe("Not enough money.");
    g.money = 10000;
    expect(buyReward(g, "beetle-head-hat")).toBeUndefined();
    expect(g.money).toBe(0);
    expect(g.wardrobe.has("beetle-head-hat")).toBe(true);
    expect(buyReward(g, "beetle-head-hat")).toBe("You already have one.");
    expect(buyReward(g, "bug-meat")).toBe("She does not sell that.");
    expect(buyReward(g, "thorns-ring")).toBe("She does not sell that.");
  });

  it("sells a ring again after a claim, and keeps the claim in a save", () => {
    const g = newGame();
    g.combat.kills["nabbler"] = 60;
    claimGoal(g, "nabbler");
    g.inventory.remove("thorns-ring", 1);
    g.money = 15000;
    expect(buyReward(g, "thorns-ring")).toBeUndefined();
    expect(g.money).toBe(0);
    const back = deserialize(serialize(g))!;
    expect(goalState(back, goal("nabbler"))).toBe("claimed");
  });

  it("loads an old save without claims", () => {
    const g = newGame();
    const raw = JSON.parse(serialize(g));
    delete raw.combat.slayerClaimed;
    const back = deserialize(JSON.stringify(raw))!;
    expect(wallList(back).every((r) => r.state === "progress")).toBe(true);
  });

  it("every slayer reward item exists", () => {
    for (const r of RINGS.filter((x) => x.slayer))
      expect(ringById(r.id)).toBeDefined();
    expect(HATS.filter((h) => h.slayer)).toHaveLength(3);
  });
});

function wear(...ids: string[]): Equipment {
  const eq = new Equipment();
  const g = newGame();
  ids.forEach((id, i) => {
    g.inventory.add(id, 1);
    eq.wear(g.inventory, i, id);
  });
  return eq;
}

describe("slayer ring effects", () => {
  const kill = (g: ReturnType<typeof newGame>, rng = () => 0) => {
    const c: Creature = {
      uid: 1,
      kind: "dustmoth",
      x: 40,
      y: 40,
      hp: 0,
      state: "wander",
      t: 0,
      angle: 0,
      away: 0,
      face: 0,
      struck: false,
    };
    return defeatCreature(g, c, "mine", 1, 16, rng);
  };

  it("burglar rolls the drops twice", () => {
    const plain = newGame();
    const rich = newGame();
    rich.equipment.load(wear("burglar-ring").save());
    const a = kill(plain)!.got.length;
    const b = kill(rich)!.got.length;
    expect(b).toBeGreaterThan(a);
    expect(wear("burglar-ring").dropsTwice()).toBe(true);
  });

  it("vampire heals 2 on a kill", () => {
    const g = newGame();
    g.equipment.load(wear("vampire-ring").save());
    g.combat.health.current = 5;
    kill(g);
    expect(g.combat.health.current).toBe(7);
  });

  it("savage and warrior start timed buffs on a kill", () => {
    const g = newGame();
    g.equipment.load(wear("savage-ring", "warrior-ring").save());
    expect(g.combat.killSpeedFactor()).toBe(1);
    kill(g);
    expect(g.combat.killSpeedFactor()).toBeGreaterThan(1);
    expect(g.combat.killDamageFactor()).toBeGreaterThan(1);
    g.combat.tickBuffs(3.1);
    expect(g.combat.killSpeedFactor()).toBe(1);
    expect(g.combat.killDamageFactor()).toBeGreaterThan(1);
    g.combat.tickBuffs(2);
    expect(g.combat.killDamageFactor()).toBe(1);
  });

  it("protection adds 0.4 seconds of grace", () => {
    const eq = wear("protection-ring");
    expect(eq.graceBonus()).toBeCloseTo(0.4);
    const c = new Combat();
    c.sync(newGame().skills, eq.graceBonus());
    expect(c.health.graceLength).toBeCloseTo(1.9);
    const h = new Health();
    h.graceLength = c.health.graceLength;
    h.hurt(1);
    expect(h.grace).toBeCloseTo(1.9);
  });

  it("thorns is worn as a flag and survives combining", () => {
    expect(wear("thorns-ring").thorns()).toBe(true);
    expect(wear("glow-ring").thorns()).toBe(false);
    expect(ringById("thorns-ring+vampire-ring")?.thorns).toBe(true);
    expect(ringById("thorns-ring+vampire-ring")?.healOnKill).toBe(2);
  });
});
