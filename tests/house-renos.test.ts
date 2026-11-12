import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { mapFiles } from "../src/content/maps";
import {
  CORNER_STAIRS_HOLD,
  HOUSE_MAP,
  RENOVATIONS,
  SPOUSE_HOLD,
  WAITING_ROOMS_LINE,
  houseHolds,
  orderRenovation,
  refundRenovation,
  renoArea,
  renoHold,
  renoOrderProblem,
  renoRefundProblem,
  renovationById,
  validRenos,
} from "../src/core/house";
import { conditionsOf } from "../src/core/map";
import {
  deserialize,
  newGame,
  serialize,
  type GameState,
} from "../src/core/save";

const W = 74;
const H = 44;
const IDS = RENOVATIONS.map((r) => r.id);
const house = (holds: string[], tier = 2) =>
  maps.getWith(HOUSE_MAP, new Set(holds), tier);
/** The holds for these renovations, with their prerequisites, at tier 2. */
const holdsFor = (ids: string[], spouse = false) => houseHolds(2, spouse, ids);
const cells = (m: ReturnType<typeof house>) => {
  const out: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) out.push(m.isBlocked(x, y) ? "#" : ".");
  return out;
};
const differs = (a: string[], b: string[]) => {
  const out = new Set<string>();
  a.forEach((v, i) => {
    if (v !== b[i]) out.add(`${i % W},${Math.floor(i / W)}`);
  });
  return out;
};

const owner = (money = 1_000_000): GameState => {
  const g = newGame();
  g.houseTier = 2;
  g.money = money;
  return g;
};

describe("renovation prices and needs (note 85)", () => {
  it("has the eight, at Stardew's placeholder prices", () => {
    expect(Object.fromEntries(RENOVATIONS.map((r) => [r.id, r.price]))).toEqual(
      {
        "open-bedroom": 10000,
        south: 30000,
        corner: 20000,
        "corner-big": 100000,
        attic: 60000,
        cubby: 10000,
        dining: 150000,
        "dining-open": 10000,
      },
    );
  });

  it("needs tier 2, enough coin and no house work", () => {
    const g = owner(5000);
    expect(renoOrderProblem(g, "cubby")).toBe("You need 5000g more.");
    g.money = 10000;
    expect(renoOrderProblem(g, "cubby")).toBeUndefined();
    g.houseTier = 1;
    expect(renoOrderProblem(g, "cubby")).toMatch(/upper floor/);
    g.houseTier = 2;
    g.houseBuild = { tier: 3, daysLeft: 2 };
    expect(renoOrderProblem(g, "cubby")).toMatch(/already at work/);
  });

  it("makes the expansions need their rooms", () => {
    const g = owner();
    expect(renoOrderProblem(g, "corner-big")).toMatch(/corner room first/);
    expect(renoOrderProblem(g, "dining-open")).toMatch(/dining room first/);
    expect(orderRenovation(g, "corner-big")).toBe(false);
    expect(orderRenovation(g, "corner")).toBe(true);
    expect(renoOrderProblem(g, "corner-big")).toBeUndefined();
  });

  it("pays at once and refuses a second order", () => {
    const g = owner(25000);
    expect(orderRenovation(g, "corner")).toBe(true);
    expect(g.money).toBe(5000);
    expect(g.houseRenos).toEqual(["corner"]);
    expect(orderRenovation(g, "corner")).toBe(false);
    expect(g.money).toBe(5000);
  });
});

describe("renovation refund (note 85)", () => {
  it("pays back in full when the area is empty", () => {
    const g = owner(10000);
    orderRenovation(g, "cubby");
    expect(g.money).toBe(0);
    expect(renoRefundProblem(g, "cubby")).toBeUndefined();
    expect(refundRenovation(g, "cubby")).toBe(true);
    expect(g.money).toBe(10000);
    expect(g.houseRenos).toEqual([]);
    expect(refundRenovation(g, "cubby")).toBe(false);
  });

  it("says to clear furniture or a chest out of the area first", () => {
    const g = owner();
    orderRenovation(g, "cubby");
    const [x, y] = [...renoArea("cubby")][0]!.split(",").map(Number) as [
      number,
      number,
    ];
    g.furniture.add(HOUSE_MAP, x, y, "round-table");
    expect(renoRefundProblem(g, "cubby")).toMatch(/Clear your furniture/);
    expect(refundRenovation(g, "cubby")).toBe(false);
    g.furniture.remove(HOUSE_MAP, x, y);
    g.chests.add(HOUSE_MAP, x, y, "chest");
    expect(renoRefundProblem(g, "cubby")).toMatch(/Clear your furniture/);
  });

  it("ignores furniture outside the area", () => {
    const g = owner();
    orderRenovation(g, "cubby");
    g.furniture.add(HOUSE_MAP, 45, 30, "round-table");
    expect(renoRefundProblem(g, "cubby")).toBeUndefined();
  });

  it("will not take a room back while its expansion stands", () => {
    const g = owner();
    orderRenovation(g, "dining");
    orderRenovation(g, "dining-open");
    expect(renoRefundProblem(g, "dining")).toMatch(/open dining room first/);
    expect(refundRenovation(g, "dining-open")).toBe(true);
    expect(refundRenovation(g, "dining")).toBe(true);
  });
});

describe("houseRenos in holds and saves", () => {
  it("adds reno ids from tier 2, and corner-stairs for a married corner room", () => {
    expect(houseHolds(1, false, ["cubby"])).toEqual([]);
    expect(houseHolds(2, false, ["cubby", "south"])).toEqual([
      "reno-south",
      "reno-cubby",
    ]);
    expect(houseHolds(2, false, ["corner"])).toEqual(["reno-corner"]);
    expect(houseHolds(2, true, ["corner"])).toEqual([
      SPOUSE_HOLD,
      "reno-corner",
      CORNER_STAIRS_HOLD,
    ]);
    expect(houseHolds(2, true, ["cubby"])).not.toContain(CORNER_STAIRS_HOLD);
  });

  it("drops an expansion whose room is not there", () => {
    expect(validRenos(2, ["corner-big", "bogus", "cubby", "cubby"])).toEqual([
      "cubby",
    ]);
    expect(houseHolds(2, false, ["corner-big"])).toEqual([]);
  });

  it("round-trips through a save and cleans a bad list", () => {
    const g = owner();
    orderRenovation(g, "attic");
    const text = serialize(g);
    expect(deserialize(text)?.houseRenos).toEqual(["attic"]);
    expect(newGame().houseRenos).toEqual([]);
    const raw = JSON.parse(text) as Record<string, unknown>;
    raw.houseRenos = ["attic", "nope", 7, "corner-big"];
    expect(deserialize(JSON.stringify(raw))?.houseRenos).toEqual(["attic"]);
    raw.houseTier = 1;
    expect(deserialize(JSON.stringify(raw))?.houseRenos).toEqual([]);
  });
});

describe("renovation layers on the house map", () => {
  const base = cells(house([]));

  it("has every renovation condition on the map", () => {
    const used = conditionsOf(mapFiles[HOUSE_MAP]!);
    for (const id of IDS) expect(used).toContain(renoHold(id));
    expect(used).toContain(CORNER_STAIRS_HOLD);
  });

  it("is the plain house until a renovation is on", () => {
    expect(differs(cells(house(["unused-hold"])), base).size).toBe(0);
  });

  it.each(IDS)(
    "%s changes only its own area, and taking it back restores the tiles",
    (id) => {
      const need = renovationById(id)!.needs;
      const withIt = house(holdsFor(need ? [need, id] : [id]));
      const without = need ? house(holdsFor([need])) : house([]);
      const changed = differs(cells(withIt), cells(without));
      expect(changed.size).toBeGreaterThan(0);
      const area = renoArea(id);
      for (const c of changed) expect(area.has(c)).toBe(true);
      // Taking it back is the same as never having had it.
      expect(
        differs(cells(house(holdsFor(need ? [need] : []))), cells(without))
          .size,
      ).toBe(0);
    },
  );

  it.each(IDS)("%s is walkable from the door and joins the house", (id) => {
    const need = renovationById(id)!.needs;
    const m = house(holdsFor(need ? [need, id] : [id]));
    const reach = m.reachable(m.entry("door")!);
    const area = [...renoArea(id)].filter((c) => {
      const [x, y] = c.split(",").map(Number) as [number, number];
      return !m.isBlocked(x, y);
    });
    expect(area.length).toBeGreaterThan(0);
    for (const c of area) expect(reach.has(c)).toBe(true);
  });

  it("opens the nursery to the corner room by 5 rows", () => {
    const m = house(holdsFor(["corner"]));
    const reach = m.reachable(m.entry("door")!);
    // Note 85: x 34 to 35, y 3 to 7, in the old frame, shifted by (20, 11).
    for (let y = 3; y <= 7; y++)
      for (const x of [34, 35])
        expect(reach.has(`${x + 20},${y + 11}`)).toBe(true);
    expect(m.isBlocked(54, 2 + 11)).toBe(true);
    expect(m.isBlocked(54, 8 + 11)).toBe(true);
  });

  it("shows the corner stairs only with a spouse and the corner room", () => {
    const stairs = renoArea("corner");
    const key = "60,21";
    expect(stairs.has(key)).toBe(true);
    const open = (holds: string[]) => {
      const m = house(holds);
      return m.reachable(m.entry("door")!).has(key);
    };
    expect(open(holdsFor(["corner"], false))).toBe(false);
    expect(open(holdsFor([], true))).toBe(false);
    expect(open(holdsFor(["corner"], true))).toBe(true);
  });

  it("opens the open rooms into one room", () => {
    const bed = house(holdsFor(["open-bedroom"]));
    for (let y = 13; y <= 20; y++)
      for (let x = 21; x <= 23; x++)
        expect(bed.isBlocked(x + 20, y + 11)).toBe(false);
    const dining = house(holdsFor(["dining", "dining-open"]));
    const cut = house(holdsFor(["dining"]));
    expect(dining.isBlocked(-1 + 20, 12 + 11)).toBe(false);
    expect(cut.isBlocked(-1 + 20, 12 + 11)).toBe(true);
  });

  it("keeps the map problem-free with every condition true and false", () => {
    expect(maps.problems()).toEqual([]);
  });

  it("holds with every renovation, a spouse and every tier", () => {
    for (const tier of [2, 3]) {
      const m = house(holdsFor(IDS, true), tier);
      expect(m.problems()).toEqual([]);
    }
  });
});

describe("the waiting line (#837)", () => {
  it("names the spare room only", () => {
    expect(WAITING_ROOMS_LINE).toContain("spare room");
    expect(WAITING_ROOMS_LINE).not.toContain("nursery");
  });
});
