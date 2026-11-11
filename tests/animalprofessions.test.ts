import { describe, expect, it } from "vitest";
import {
  GROW_DAYS,
  INCUBATE_DAYS,
  PET_FRIENDSHIP,
  buyAnimal,
  endDay,
  incubateDays,
  pet,
  putEgg,
} from "../src/core/animals";
import {
  choose,
  optionsFor,
  pendingChoice,
  sellMultiplier,
} from "../src/core/professions";
import { deserialize, newGame, serialize } from "../src/core/save";
import { LEVEL_XP } from "../src/core/skills";

function farmer(first: string, top?: string) {
  const g = newGame();
  g.money = 100000;
  g.animals.coopBuilt = true;
  g.animals.tier = 3;
  g.animals.barnBuilt = true;
  g.animals.barnTier = 3;
  g.skills.gain("farming", LEVEL_XP[9]!);
  expect(choose(g.skills, "farming", first)).toBe(true);
  if (top) expect(choose(g.skills, "farming", top)).toBe(true);
  return g;
}

describe("animal professions", () => {
  it("the farming tree is Rancher or Tiller, then two under each", () => {
    const g = newGame();
    g.skills.gain("farming", LEVEL_XP[9]!);
    expect(optionsFor("farming", g.skills).map((p) => p.id)).toEqual([
      "tiller",
      "rancher",
    ]);
    choose(g.skills, "farming", "rancher");
    expect(pendingChoice(g.skills)).toBe("farming");
    expect(optionsFor("farming", g.skills).map((p) => p.id)).toEqual([
      "coopmaster",
      "shepherd",
    ]);
    expect(choose(g.skills, "farming", "artisan")).toBe(false);
    expect(choose(g.skills, "farming", "shepherd")).toBe(true);
    expect(pendingChoice(g.skills)).toBeUndefined();
  });

  it("Rancher raises animal goods by 20%, Artisan raises artisan goods by 40%", () => {
    const r = farmer("rancher");
    expect(sellMultiplier(r.skills, "milk@gold")).toBe(1.2);
    expect(sellMultiplier(r.skills, "moonwool")).toBe(1.2);
    expect(sellMultiplier(r.skills, "parsnip")).toBe(1);
    const t = farmer("tiller", "artisan");
    expect(sellMultiplier(t.skills, "milk")).toBe(1);
    expect(sellMultiplier(t.skills, "parsnip")).toBe(1.1);
  });

  it("the Coopmaster halves the incubator time", () => {
    const g = farmer("rancher", "coopmaster");
    expect(incubateDays(g)).toBe(INCUBATE_DAYS / 2);
    g.inventory.add("egg");
    expect(putEgg(g, "egg")).toBe(true);
    expect(g.animals.incubator!.daysLeft).toBe(3);
    expect(incubateDays(farmer("rancher", "shepherd"))).toBe(INCUBATE_DAYS);
  });

  it("each master befriends only their own building's animals faster", () => {
    const g = farmer("rancher", "coopmaster");
    const hen = buyAnimal(g, "chicken", "H")!;
    const cow = buyAnimal(g, "cow", "C")!;
    pet(g, hen.id);
    pet(g, cow.id);
    expect(hen.friendship).toBe(Math.round(PET_FRIENDSHIP * 1.5));
    expect(cow.friendship).toBe(PET_FRIENDSHIP);
  });

  it("the Shepherd's sheep give wool after two fed nights, not three", () => {
    const wool = (g: ReturnType<typeof newGame>) => {
      const s = buyAnimal(g, "sheep", "S")!;
      s.age = GROW_DAYS;
      s.mood = 255;
      let nights = 0;
      while (s.product === undefined && nights < 5) {
        s.fed = true;
        s.petted = true;
        endDay(g, () => 0.99);
        nights++;
      }
      return nights;
    };
    expect(wool(farmer("rancher", "shepherd"))).toBe(2);
    expect(wool(farmer("rancher", "coopmaster"))).toBe(3);
  });

  it("masters get better quality from the same friendship", () => {
    const make = (top: string) => {
      const g = farmer("rancher", top);
      const c = buyAnimal(g, "chicken", "H")!;
      c.age = GROW_DAYS;
      c.friendship = 600;
      c.mood = 255;
      c.fed = true;
      c.petted = true;
      endDay(g, () => 0);
      return c.product;
    };
    expect(make("shepherd")).toBe("silver");
    expect(make("coopmaster")).toBe("gold");
  });

  it("saves, and an old Agriculturist save becomes Tiller then Agriculturist", () => {
    const g = farmer("rancher", "coopmaster");
    const back = deserialize(serialize(g))!;
    expect(back.skills.has("coopmaster")).toBe(true);
    const raw = JSON.parse(serialize(g));
    raw.professions = { farming: "agriculturist" };
    delete raw.topProfessions;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old.skills.professionOf("farming")).toBe("tiller");
    expect(old.skills.topProfessionOf("farming")).toBe("agriculturist");
  });
});
