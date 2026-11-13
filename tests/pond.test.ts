import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { isClear } from "../src/core/actions";
import { FISH } from "../src/core/fishing";
import { itemById } from "../src/core/items";
import {
  advancePonds,
  capOf,
  collectProduct,
  giveQuestItem,
  orderPond,
  pondAt,
  pondBlocks,
  pondNight,
  pondProblem,
  POND_BUILD_DAYS,
  POND_COST,
  pondable,
  putFish,
  putProblem,
  questItemFor,
  rollProduct,
  spawnDaysOf,
  stateOf,
  takeFish,
} from "../src/core/pond";
import { POND_SPECIES, roeOf, speciesById } from "../src/core/pondspecies";
import { START } from "../src/core/maps";
import { mayPlaceOn } from "../src/core/placeables";
import { deserialize, newGame, serialize } from "../src/core/save";
import type { GameState } from "../src/core/save";

const farm = maps.get(START.map);

/** The top left of the first 5 by 5 patch of clear ground, scanning the whole map. */
function patch(g: GameState): { x: number; y: number } {
  for (let y = 0; y < farm.height - 5; y++)
    for (let x = 0; x < farm.width - 5; x++) {
      let ok = true;
      for (let dy = 0; dy < 5 && ok; dy++)
        for (let dx = 0; dx < 5 && ok; dx++)
          ok = isClear(g, farm, x + dx, y + dy);
      if (
        ok &&
        !/taken|busy|only/.test(pondProblem(g, farm, "farm", x, y) ?? "")
      )
        return { x, y };
    }
  throw new Error("no clear patch");
}

function rich(): GameState {
  const g = newGame();
  g.money = 10000;
  g.inventory.add("stone", 200);
  g.inventory.add("seaweed", 5);
  g.inventory.add("pondweed", 5);
  return g;
}

function built(): { g: GameState; at: { x: number; y: number } } {
  const g = rich();
  const at = patch(g);
  expect(orderPond(g, farm, "farm", at.x, at.y).ok).toBe(true);
  for (let i = 0; i < POND_BUILD_DAYS; i++) advancePonds(g);
  return { g, at };
}

const never = () => 0.999;

describe("the pond building", () => {
  it("is a placeable that stands on the farm only", () => {
    expect(mayPlaceOn("fish-pond", "farm")).toBe(true);
    expect(mayPlaceOn("fish-pond", "mine")).toBe(false);
  });

  it("costs 5,000g, 200 stone, 5 seaweed and 5 pondweed", () => {
    expect(POND_COST).toEqual({
      coin: 5000,
      stone: 200,
      seaweed: 5,
      pondweed: 5,
    });
    const g = newGame();
    const at = patch(g);
    expect(pondProblem(g, farm, "farm", at.x, at.y)).toMatch(/You need/);
    expect(orderPond(g, farm, "farm", at.x, at.y).ok).toBe(false);
  });

  it("takes the payment and builds in two days", () => {
    const g = rich();
    const at = patch(g);
    expect(orderPond(g, farm, "farm", at.x, at.y).ok).toBe(true);
    expect(g.money).toBe(5000);
    expect(g.inventory.count("stone")).toBe(0);
    expect(g.inventory.count("seaweed")).toBe(0);
    const p = pondAt(g, at.x, at.y)!;
    expect(stateOf(p).building).toBe(2);
    expect(putProblem(g, at.x, at.y, "carp")).toMatch(/not finished/);
    expect(advancePonds(g)).toBe(0);
    expect(advancePonds(g)).toBe(1);
    expect(stateOf(p).building).toBe(0);
  });

  it("blocks walking across its whole 5 by 5 footprint", () => {
    const { g, at } = built();
    expect(pondBlocks(g, "farm", at.x + 4, at.y + 4)).toBe(true);
    expect(pondBlocks(g, "farm", at.x + 5, at.y)).toBe(false);
    expect(pondBlocks(g, "mine-1", at.x, at.y)).toBe(false);
  });

  it("refuses an overlapping second pond", () => {
    const { g, at } = built();
    g.money = 10000;
    g.inventory.add("stone", 200);
    g.inventory.add("seaweed", 5);
    g.inventory.add("pondweed", 5);
    expect(pondProblem(g, farm, "farm", at.x + 2, at.y)).toMatch(
      /another pond/,
    );
  });

  it("survives a save and load", () => {
    const { g, at } = built();
    g.inventory.add("carp", 2);
    putFish(g, at.x, at.y, "carp");
    const back = deserialize(serialize(g))!;
    const s = stateOf(pondAt(back, at.x, at.y)!);
    expect(s.species).toBe("carp");
    expect(s.count).toBe(1);
    expect(s.building).toBe(0);
  });
});

describe("what goes in", () => {
  it("takes any fish, shellfish, urchin or coral, and never a water find", () => {
    for (const f of FISH) expect(pondable(f.id)).toBe(true);
    expect(pondable("legend-less")).toBe(false);
    expect(pondable("pin-urchin")).toBe(true);
    expect(pondable("sea-fan")).toBe(true);
    expect(pondable("crab")).toBe(true);
    for (const id of ["pondweed", "seaweed", "brook-jelly", "tide-jelly"])
      expect(pondable(id)).toBe(false);
  });

  it("holds one species and refuses a second", () => {
    const { g, at } = built();
    g.inventory.add("carp", 2);
    g.inventory.add("perch", 1);
    expect(putFish(g, at.x, at.y, "carp").ok).toBe(true);
    expect(putProblem(g, at.x, at.y, "perch")).toMatch(/another kind/);
    expect(putFish(g, at.x, at.y, "carp").ok).toBe(true);
    expect(stateOf(pondAt(g, at.x, at.y)!).count).toBe(2);
  });

  it("takes a fish of any quality", () => {
    const { g, at } = built();
    g.inventory.add("carp@gold");
    expect(putFish(g, at.x, at.y, "carp@gold").ok).toBe(true);
    expect(g.inventory.count("carp@gold")).toBe(0);
  });

  it("refuses when full at the cap of 3", () => {
    const { g, at } = built();
    g.inventory.add("carp", 4);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, "carp");
    expect(putProblem(g, at.x, at.y, "carp")).toMatch(/full/);
  });

  it("holds one legend at most", () => {
    const { g, at } = built();
    g.inventory.add("hearthwell-carp", 2);
    expect(putFish(g, at.x, at.y, "hearthwell-carp").ok).toBe(true);
    expect(capOf(stateOf(pondAt(g, at.x, at.y)!))).toBe(1);
    expect(putProblem(g, at.x, at.y, "hearthwell-carp")).toMatch(/full/);
  });
});

describe("population and breeding", () => {
  it("breeds one fish on the species' days and stops at the cap", () => {
    const { g, at } = built();
    g.inventory.add("carp");
    putFish(g, at.x, at.y, "carp");
    const days = spawnDaysOf(speciesById("carp")!);
    const p = pondAt(g, at.x, at.y)!;
    for (let i = 0; i < days - 1; i++) pondNight(g, never);
    expect(stateOf(p).count).toBe(1);
    pondNight(g, never);
    expect(stateOf(p).count).toBe(2);
    for (let i = 0; i < 50; i++) pondNight(g, never);
    expect(stateOf(p).count).toBe(3);
  });

  it("makes dearer fish breed slower, between 1 and 5 days", () => {
    const days = POND_SPECIES.filter((s) => !s.legend).map(spawnDaysOf);
    expect(Math.min(...days)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...days)).toBeLessThanOrEqual(5);
    const cheap = POND_SPECIES.reduce((a, b) =>
      a.sellPrice <= b.sellPrice ? a : b,
    );
    const dear = POND_SPECIES.filter((s) => !s.legend).reduce((a, b) =>
      a.sellPrice >= b.sellPrice ? a : b,
    );
    expect(spawnDaysOf(cheap)).toBeLessThanOrEqual(spawnDaysOf(dear));
  });

  it("does not reset the clock when more fish are thrown in", () => {
    const { g, at } = built();
    g.inventory.add("salmon", 2);
    putFish(g, at.x, at.y, "salmon");
    pondNight(g, never);
    const left = stateOf(pondAt(g, at.x, at.y)!).spawn;
    expect(left).toBeGreaterThan(0);
    putFish(g, at.x, at.y, "salmon");
    expect(stateOf(pondAt(g, at.x, at.y)!).spawn).toBe(left);
  });

  it("does not breed a legend", () => {
    const { g, at } = built();
    g.inventory.add("hearthwell-carp");
    putFish(g, at.x, at.y, "hearthwell-carp");
    for (let i = 0; i < 20; i++) pondNight(g, never);
    expect(stateOf(pondAt(g, at.x, at.y)!).count).toBe(1);
  });
});

describe("taking fish out", () => {
  it("gives a normal quality fish with no XP and no log entry", () => {
    const { g, at } = built();
    g.inventory.add("carp@gold");
    putFish(g, at.x, at.y, "carp@gold");
    const xp = g.skills.save().fishing;
    expect(takeFish(g, at.x, at.y).ok).toBe(true);
    expect(g.inventory.count("carp")).toBe(1);
    expect(g.skills.save().fishing).toBe(xp);
    expect(g.fishing.total).toBe(0);
  });

  it("resets the pond, quest capacity too, when emptied", () => {
    const { g, at } = built();
    const p = pondAt(g, at.x, at.y)!;
    g.inventory.add("carp", 3);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, "carp");
    const s = stateOf(p);
    s.capLevel = 2;
    p.state = { ...s };
    for (let i = 0; i < 3; i++) takeFish(g, at.x, at.y);
    const after = stateOf(p);
    expect(after.count).toBe(0);
    expect(after.capLevel).toBe(0);
    expect(after.species).toBeUndefined();
    // The pond now accepts another species.
    g.inventory.add("perch");
    expect(putFish(g, at.x, at.y, "perch").ok).toBe(true);
  });

  it("refuses with a full backpack", () => {
    const { g, at } = built();
    g.inventory.add("carp", 2);
    putFish(g, at.x, at.y, "carp");
    g.inventory.remove("carp", g.inventory.count("carp"));
    for (let i = 0; i < 200 && g.inventory.room("stone") >= 999; i++)
      g.inventory.add("stone", 999);
    expect(g.inventory.room("carp")).toBe(0);
    expect(takeFish(g, at.x, at.y).ok).toBe(false);
  });
});

describe("products", () => {
  const carp = speciesById("carp")!;

  it("uses Stardew's chance, population x 0.08 + 0.15", () => {
    // 1 fish: 0.23. A roll of 0.22 makes something and 0.24 does not.
    expect(rollProduct(carp, 1, () => 0.22)).toBeDefined();
    expect(rollProduct(carp, 1, () => 0.24)).toBeUndefined();
    // 10 fish: 0.95.
    expect(rollProduct(carp, 10, () => 0.94)).toBeDefined();
    expect(rollProduct(carp, 10, () => 0.96)).toBeUndefined();
    // An empty pond never.
    expect(rollProduct(carp, 0, () => 0)).toBeUndefined();
  });

  it("gives a legend a 50 percent chance", () => {
    const l = speciesById("hearthwell-carp")!;
    expect(rollProduct(l, 1, () => 0.49)).toBeDefined();
    expect(rollProduct(l, 1, () => 0.51)).toBeUndefined();
  });

  it("makes roe, with extra roe 20 percent of the time again and again", () => {
    const seq = [0.1, 0.1, 0.1, 0.1, 0.9];
    let i = 0;
    const r = rollProduct(carp, 3, () => seq[i++] ?? 0.99)!;
    expect(r.item).toBe(roeOf("carp"));
    // chance roll, pick roll, then two extras at 0.1 (< 0.2), then 0.1 once more, then 0.9 stops.
    expect(r.count).toBe(3);
  });

  it("has a roe item for every species", () => {
    for (const s of POND_SPECIES) {
      expect(itemById(roeOf(s.id))?.name).toBe(`${s.name} roe`);
    }
  });

  it("holds the night's product until taken", () => {
    const { g, at } = built();
    g.inventory.add("carp");
    putFish(g, at.x, at.y, "carp");
    pondNight(g, () => 0);
    const s = stateOf(pondAt(g, at.x, at.y)!);
    expect(s.out?.item).toBe("carp-roe");
    expect(collectProduct(g, at.x, at.y).ok).toBe(true);
    expect(g.inventory.count("carp-roe")).toBeGreaterThan(0);
    expect(stateOf(pondAt(g, at.x, at.y)!).out).toBeUndefined();
    expect(collectProduct(g, at.x, at.y).ok).toBe(false);
  });

  it("makes nothing in an empty pond", () => {
    const { g, at } = built();
    pondNight(g, () => 0);
    expect(stateOf(pondAt(g, at.x, at.y)!).out).toBeUndefined();
  });
});

describe("capacity quests", () => {
  function fullPond() {
    const { g, at } = built();
    g.inventory.add("carp", 3);
    for (let i = 0; i < 3; i++) putFish(g, at.x, at.y, "carp");
    return { g, at, p: pondAt(g, at.x, at.y)! };
  }

  it("shows the quest 1 to 5 days after the pond fills, and only while full", () => {
    const { g, p } = fullPond();
    // Roll 0 gives a 1 day wait: night 1 sets it, night 2 shows it.
    pondNight(g, never);
    expect(stateOf(p).quest).toBeUndefined();
    expect(stateOf(p).questWait).toBeDefined();
    for (let i = 0; i < 6; i++) pondNight(g, never);
    expect(stateOf(p).quest).toBeDefined();
  });

  it("pauses when fish are taken out, and the same item comes back", () => {
    const { g, at, p } = fullPond();
    for (let i = 0; i < 6; i++) pondNight(g, never);
    const item = stateOf(p).quest!.item;
    takeFish(g, at.x, at.y);
    expect(stateOf(p).quest!.item).toBe(item);
    g.inventory.add("carp");
    putFish(g, at.x, at.y, "carp");
    expect(stateOf(p).quest!.item).toBe(item);
  });

  it("raises the cap 3, 5, 7, 10 by quests, with XP and a fresh clock", () => {
    const { g, at, p } = fullPond();
    const days = spawnDaysOf(speciesById("carp")!);
    const caps = [3];
    for (let level = 0; level < 3; level++) {
      for (let i = 0; i < 8 && !stateOf(p).quest; i++) pondNight(g, never);
      const q = stateOf(p).quest!;
      expect(q).toBeDefined();
      g.inventory.add(q.item, q.need);
      const xp = g.skills.save().fishing;
      let res: ReturnType<typeof giveQuestItem> = { ok: false, reason: "" };
      for (let i = 0; i < q.need; i++) res = giveQuestItem(g, at.x, at.y);
      expect(res.ok && res.done).toBe(true);
      expect(g.skills.save().fishing).toBeGreaterThan(xp);
      caps.push(capOf(stateOf(p)));
      expect(stateOf(p).spawn).toBe(days);
      // Breed up to the new cap.
      for (let i = 0; i < 60; i++) pondNight(g, never);
    }
    expect(caps).toEqual([3, 5, 7, 10]);
    expect(stateOf(p).count).toBe(10);
    // No quest at the top.
    for (let i = 0; i < 10; i++) pondNight(g, never);
    expect(stateOf(p).quest).toBeUndefined();
  });

  it("gives fishing XP of 20 plus 5 per spawn day", () => {
    const { g, at, p } = fullPond();
    for (let i = 0; i < 8; i++) pondNight(g, never);
    const q = stateOf(p).quest!;
    g.inventory.add(q.item, q.need);
    const before = g.skills.save().fishing;
    for (let i = 0; i < q.need; i++) giveQuestItem(g, at.x, at.y);
    const days = spawnDaysOf(speciesById("carp")!);
    expect(g.skills.save().fishing - before).toBe(20 + 5 * days);
  });

  it("asks a legend nothing, since its cap is fixed", () => {
    const { g, at } = built();
    g.inventory.add("hearthwell-carp");
    putFish(g, at.x, at.y, "hearthwell-carp");
    for (let i = 0; i < 20; i++) pondNight(g, never);
    expect(stateOf(pondAt(g, at.x, at.y)!).quest).toBeUndefined();
  });

  it("asks by water group, with a made good or gem for the top quest", () => {
    const fresh = questItemFor(speciesById("carp")!, 0, () => 0);
    const sea = questItemFor(speciesById("sardine")!, 0, () => 0);
    const top = questItemFor(speciesById("carp")!, 2, () => 0);
    expect(fresh).toBe("leek");
    expect(sea).toBe("seaweed");
    expect(top).toBe("honey");
    for (const id of [
      "leek",
      "dandelion",
      "wild-garlic",
      "field-mushroom",
      "copper-ore",
      "iron-ore",
      "seaweed",
      "cockleshell",
      "whelk",
      "periwinkle",
      "tide-jelly",
      "honey",
      "cheese",
      "mayonnaise",
      "gem-mid-a",
      "gem-mid-b",
      "stone",
    ])
      expect(itemById(id), id).toBeDefined();
  });

  it("refuses the quest item when you have none", () => {
    const { g, at, p } = fullPond();
    for (let i = 0; i < 8; i++) pondNight(g, never);
    expect(stateOf(p).quest).toBeDefined();
    expect(giveQuestItem(g, at.x, at.y).ok).toBe(false);
  });
});
