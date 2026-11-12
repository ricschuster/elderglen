import { describe, expect, it } from "vitest";
import {
  Effects,
  RESIST_PER_POINT,
  resistChance,
  effectById,
} from "../src/core/effects";
import { Health } from "../src/core/combat";
import { CREATURES } from "../src/core/creatures";
import { Equipment } from "../src/core/equipment";
import { Inventory } from "../src/core/inventory";
import { drink } from "../src/core/elixirs";
import { newGame } from "../src/core/save";

const never = () => 0.999;
const always = () => 0;

describe("Immunity", () => {
  it("resists 9.1 percent a point with no cap", () => {
    expect(resistChance(0)).toBe(0);
    expect(resistChance(1)).toBeCloseTo(RESIST_PER_POINT);
    expect(resistChance(6)).toBeCloseTo(0.546);
    expect(resistChance(11)).toBe(1);
    expect(resistChance(20)).toBe(1);
  });

  it("rolls once per hit against the chance", () => {
    const e = new Effects();
    // 2 points resist 18.2 percent: a roll of 0.1 resists, 0.2 does not.
    expect(e.inflict("slimed", () => 0.1, { immunity: 2 })).toBe("resisted");
    expect(e.has("slimed")).toBe(false);
    expect(e.inflict("slimed", () => 0.2, { immunity: 2 })).toBe("afflicted");
    expect(e.has("slimed")).toBe(true);
  });

  it("makes eleven points immune", () => {
    const e = new Effects();
    expect(e.inflict("burned", never, { immunity: 11 })).toBe("resisted");
  });
});

describe("bad effects", () => {
  it("have the placeholder lengths", () => {
    expect(effectById("slimed")?.seconds).toBe(8);
    expect(effectById("chilled")?.seconds).toBe(8);
    expect(effectById("burned")?.seconds).toBe(4);
  });

  it("refresh rather than stack", () => {
    const e = new Effects();
    e.inflict("slimed", never, { immunity: 0 });
    e.tick(5);
    expect(e.remaining("slimed")).toBe(3);
    e.inflict("slimed", never, { immunity: 0 });
    expect(e.remaining("slimed")).toBe(8);
    expect(e.speedFactor()).toBeCloseTo(2 / 3);
  });

  it("expire and clear", () => {
    const e = new Effects();
    e.inflict("chilled", never, { immunity: 0 });
    expect(e.swingFactor()).toBeCloseTo(1 / 0.75);
    e.tick(8);
    expect(e.has("chilled")).toBe(false);
    expect(e.swingFactor()).toBe(1);
    e.inflict("slimed", never, { immunity: 0 });
    e.inflict("burned", never, { immunity: 0 });
    expect(e.describe()).toBe("Slimed 8s Burned 4s");
    e.clear();
    expect(e.any).toBe(false);
  });

  it("burn takes 1 health a second and never more than it has left", () => {
    const e = new Effects();
    e.inflict("burned", never, { immunity: 0 });
    expect(e.tick(1)).toBe(1);
    expect(e.tick(10)).toBe(3);
    expect(e.tick(1)).toBe(0);
  });

  it("burn drain ignores grace and can knock out", () => {
    const h = new Health();
    h.current = 2;
    h.grace = 1;
    expect(h.drain(1)).toBe(1);
    expect(h.down).toBe(false);
    expect(h.drain(5)).toBe(1);
    expect(h.current).toBe(0);
    expect(h.down).toBe(true);
  });

  it("the Sturdy ring halves the length that lands", () => {
    const e = new Effects();
    e.inflict("slimed", never, { immunity: 0, halfLength: true });
    expect(e.remaining("slimed")).toBe(4);
  });

  it("slime proof blocks slimed only", () => {
    const e = new Effects();
    expect(e.inflict("slimed", always, { immunity: 0, slimeProof: true })).toBe(
      "proof",
    );
    expect(e.has("slimed")).toBe(false);
    expect(e.inflict("chilled", never, { immunity: 0, slimeProof: true })).toBe(
      "afflicted",
    );
  });
});

describe("equipment stats", () => {
  it("adds ring Defense and Immunity to the boots", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("warded-boots");
    inv.add("sturdy-band");
    inv.add("iron-defense-ring");
    eq.wearBoots(inv, "warded-boots");
    eq.wear(inv, 0, "sturdy-band");
    eq.wear(inv, 1, "iron-defense-ring");
    expect(eq.defense()).toBe(7);
    expect(eq.immunity()).toBe(5);
    expect(eq.halvesEffects()).toBe(true);
    expect(eq.resistPercent()).toBe(45);
  });

  it("slime proof ring is reported", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    expect(eq.slimeProof()).toBe(false);
    inv.add("slime-proof-ring");
    eq.wear(inv, 0, "slime-proof-ring");
    expect(eq.slimeProof()).toBe(true);
  });
});

describe("creature rows", () => {
  it("inflict one effect per band, with a chance", () => {
    const by = (id: string) => CREATURES.find((c) => c.id === id)?.inflicts;
    expect(by("gloop")).toEqual({ effect: "slimed", chance: 1 });
    expect(by("frostnibbler")?.effect).toBe("chilled");
    expect(by("cinder-pup")).toEqual({ effect: "burned", chance: 0.5 });
    for (const c of CREATURES)
      if (c.inflicts) expect(effectById(c.inflicts.effect)).toBeDefined();
  });
});

describe("clearing", () => {
  it("a Life Elixir clears every effect, even at full health", () => {
    const g = newGame();
    g.inventory.add("life-elixir");
    g.combat.effects.inflict("burned", never, { immunity: 0 });
    expect(drink(g, "life-elixir").ok).toBe(true);
    expect(g.combat.effects.any).toBe(false);
  });
});
