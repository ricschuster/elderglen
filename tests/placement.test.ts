import { describe, expect, it } from "vitest";
import {
  BARN_COST,
  BARN_SITES,
  COOP_COST,
  COOP_SITES,
  SILO_SITES,
  barnBlocks,
  buyAnimal,
  coopBlocks,
  loadAnimals,
  saveAnimals,
  siteOf,
} from "../src/core/animals";
import { maps } from "../src/content/maps";
import {
  doorAt,
  mapWithDoors,
  moveBuilding,
  moveProblem,
  orderBuildingAt,
  placementBlockers,
  placementProblem,
  refundOf,
  removeBuilding,
  removeProblem,
} from "../src/core/placement";
import { Trees } from "../src/core/trees";
import { Rocks } from "../src/core/rocks";
import { Weeds } from "../src/core/weeds";
import { Twigs } from "../src/core/debris";
import { ForageField } from "../src/core/forage";
import { deserialize, newGame, serialize } from "../src/core/save";
import type { GameState } from "../src/core/save";
import { FarmMap } from "../src/core/map";
import { GREENHOUSE_SITE, greenhouseRuinSite } from "../src/core/greenhouse";

const MAP_ID = "farm";
const map = (): FarmMap => maps.get(MAP_ID);

/** Take the day 1 clutter off the farm, so the free spots are easy to find. */
function clearFarm(g: GameState) {
  g.trees = new Trees([]);
  g.rocks = new Rocks([]);
  g.weeds = new Weeds();
  g.twigs = new Twigs();
  g.forage = new ForageField();
}

/** A game with a coop and a barn built and money for anything. */
function built(): GameState {
  const g = newGame();
  g.animals.coopBuilt = true;
  g.animals.barnBuilt = true;
  g.money = 100000;
  clearFarm(g);
  g.inventory.add("wood", 100);
  g.inventory.add("stone", 100);
  return g;
}

/** The first spot, in reading order, where a building is free to stand. */
function freeSpot(g: GameState, b: "coop" | "barn", skip = 0) {
  const m = map();
  let seen = 0;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (
        placementBlockers(g, m, MAP_ID, b, x, y).length === 0 &&
        seen++ >= skip
      )
        return { x, y };
  throw new Error("no free spot");
}

describe("where a building may stand", () => {
  it("accepts the fixed sites of both farms, so old saves stay valid", () => {
    for (const id of Object.keys(COOP_SITES)) {
      const g = built();
      g.farmType = id === "farm" ? "standard" : "woodland";
      const m = maps.get(id);
      const c = COOP_SITES[id]!;
      const b = BARN_SITES[id]!;
      expect(placementBlockers(g, m, id, "coop", c.x, c.y)).toEqual([]);
      expect(placementBlockers(g, m, id, "barn", b.x, b.y)).toEqual([]);
    }
  });

  it("blocks rocks, trees, stumps, weeds and twigs, and says what", () => {
    const g = built();
    const m = map();
    const spot = freeSpot(g, "coop");
    const why = (x: number, y: number) =>
      placementBlockers(g, m, MAP_ID, "coop", spot.x, spot.y).find(
        (b) => b.x === x && b.y === y,
      )?.why;
    expect(placementBlockers(g, m, MAP_ID, "coop", spot.x, spot.y)).toEqual([]);
    g.rocks.add(spot.x, spot.y, "stone");
    expect(why(spot.x, spot.y)).toBe("a rock");
    g.rocks = new Rocks([]);
    g.trees = new Trees([{ x: spot.x + 1, y: spot.y, stage: 5 }]);
    expect(why(spot.x + 1, spot.y)).toBe("a tree");
    g.trees = new Trees([{ x: spot.x + 2, y: spot.y, stage: 5, large: true }]);
    expect(why(spot.x + 2, spot.y)).toMatch(/tree|stump/);
    g.trees = new Trees([]);
    g.weeds.add(spot.x, spot.y + 1);
    expect(why(spot.x, spot.y + 1)).toBe("weeds");
    g.weeds = new Weeds();
    g.twigs.add(spot.x + 5, spot.y + 2);
    expect(why(spot.x + 5, spot.y + 2)).toBe("a twig");
    expect(placementProblem(g, m, MAP_ID, "coop", spot.x, spot.y)).toMatch(
      /in the way: a twig/,
    );
    g.twigs = new Twigs();
    expect(
      placementProblem(g, m, MAP_ID, "coop", spot.x, spot.y),
    ).toBeUndefined();
  });

  it("needs the tile in front of the door free too", () => {
    const g = built();
    const spot = freeSpot(g, "coop");
    const door = doorAt("coop", spot.x, spot.y);
    g.rocks.add(door.x, door.y + 1, "stone");
    const found = placementBlockers(g, map(), MAP_ID, "coop", spot.x, spot.y);
    expect(found).toEqual([{ x: door.x, y: door.y + 1, why: "a rock" }]);
  });

  it("blocks water, cliffs and walls, and the edge of the farm", () => {
    const g = newGame();
    const m = map();
    let wall: { x: number; y: number } | undefined;
    for (let y = 0; y < m.height && !wall; y++)
      for (let x = 0; x < m.width; x++)
        if (m.isBlocked(x, y)) {
          wall = { x, y };
          break;
        }
    expect(wall).toBeDefined();
    const found = placementBlockers(g, m, MAP_ID, "coop", wall!.x, wall!.y);
    expect(found.some((b) => /water, a cliff or a wall/.test(b.why))).toBe(
      true,
    );
    expect(
      placementBlockers(g, m, MAP_ID, "barn", m.width - 2, 0).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the exits, the entries and the counters clear", () => {
    const g = newGame();
    const m = map();
    const exit = m.exits.find(
      (e) => e.id !== "coop" && e.id !== "barn" && e.id !== "greenhouse",
    )!;
    const found = placementBlockers(g, m, MAP_ID, "coop", exit.x, exit.y - 1);
    expect(found.length).toBeGreaterThan(0);
    for (const e of m.exits) {
      if (e.id === "coop" || e.id === "barn" || e.id === "greenhouse") continue;
      for (let y = e.y - 1; y <= e.y + e.h; y++)
        for (let x = e.x - 1; x <= e.x + e.w; x++)
          expect(
            placementBlockers(g, m, MAP_ID, "coop", x, y).length,
          ).toBeGreaterThan(0);
    }
  });

  it("will not stand on the other building, nor on the silo's spot", () => {
    const g = built();
    const m = map();
    const b = BARN_SITES[MAP_ID]!;
    expect(
      placementBlockers(g, m, MAP_ID, "coop", b.x, b.y).some((x) =>
        /your barn/.test(x.why),
      ),
    ).toBe(true);
    const s = SILO_SITES[MAP_ID]!;
    expect(
      placementBlockers(g, m, MAP_ID, "barn", s.x, s.y).some((x) =>
        /silo/.test(x.why),
      ),
    ).toBe(true);
  });

  it("will not wall off an exit", () => {
    // A hall four rows tall with the entry at one end and an exit at the other.
    // A barn across the hall would seal it, and its door only opens to a dead end.
    const W = 16;
    const H = 8;
    const open = (x: number, y: number) =>
      (y >= 1 && y <= 4) || (x === 6 && y === 5);
    const data = Array.from({ length: W * H }, (_, i) =>
      open(i % W, Math.floor(i / W)) ? 0 : 1,
    );
    const obj = (
      id: number,
      name: string,
      cls: string,
      x: number,
      y: number,
    ) => ({
      id,
      name,
      class: cls,
      type: cls,
      x: x * 16,
      y: y * 16,
      width: cls === "exit" ? 16 : 0,
      height: cls === "exit" ? 16 : 0,
      properties:
        cls === "exit"
          ? [
              { name: "map", type: "string", value: "elsewhere" },
              { name: "entry", type: "string", value: "start" },
            ]
          : [],
    });
    const hall = FarmMap.fromTiled({
      width: W,
      height: H,
      tilewidth: 16,
      tileheight: 16,
      layers: [
        { name: "collision", type: "tilelayer", data },
        {
          name: "markers",
          type: "objectgroup",
          objects: [
            obj(1, "start", "entry", 0, 2),
            obj(2, "gate", "exit", 15, 2),
          ],
        },
      ],
    } as never);
    const g = newGame();
    const sealed = placementProblem(g, hall, MAP_ID, "barn", 3, 1);
    expect(sealed).toMatch(/wall off a way out/);
    // Nothing in the hall is in the way otherwise, so the spot is only refused for the seal.
    expect(placementBlockers(g, hall, MAP_ID, "barn", 3, 1)).toHaveLength(1);
    // A building that leaves a way round is fine: the hall is only four rows.
    expect(placementProblem(g, hall, MAP_ID, "coop", 3, 1)).toBeUndefined();
    expect(placementProblem(g, map(), MAP_ID, "barn", -3, 4)).toMatch(
      /off the farm/,
    );
  });
});

describe("ordering, moving and removing", () => {
  it("empty tilled soil does not block and is cleared; a crop still blocks", () => {
    const g = built();
    const m = map();
    const spot = freeSpot(g, "coop");
    g.farm.till(spot.x, spot.y);
    g.farm.till(spot.x + 1, spot.y);
    g.farm.plant(spot.x + 1, spot.y, "parsnip", "spring");
    const blockers = placementBlockers(g, m, MAP_ID, "coop", spot.x, spot.y);
    expect(blockers.map((b) => b.why)).toEqual(["a growing crop"]);
    delete g.farm.plotAt(spot.x + 1, spot.y)?.crop;
    expect(placementBlockers(g, m, MAP_ID, "coop", spot.x, spot.y)).toEqual([]);
  });

  it("clears the empty soil under a placed building", () => {
    const g = newGame();
    g.money = COOP_COST.coin;
    g.inventory.add("wood", COOP_COST.wood);
    g.inventory.add("stone", COOP_COST.stone);
    const spot = freeSpot(g, "coop", 40);
    g.farm.till(spot.x, spot.y);
    g.farm.till(spot.x + 40, spot.y + 40);
    expect(orderBuildingAt(g, map(), MAP_ID, "coop", spot.x, spot.y)).toBe(
      true,
    );
    expect(g.farm.plotAt(spot.x, spot.y)).toBeUndefined();
    expect(g.farm.plotAt(spot.x + 40, spot.y + 40)).toBeDefined();
  });

  it("orders on a chosen spot and remembers it", () => {
    const g = newGame();
    g.money = COOP_COST.coin;
    g.inventory.add("wood", COOP_COST.wood);
    g.inventory.add("stone", COOP_COST.stone);
    const spot = freeSpot(g, "coop", 40);
    expect(orderBuildingAt(g, map(), MAP_ID, "coop", spot.x, spot.y)).toBe(
      true,
    );
    expect(g.money).toBe(0);
    expect(siteOf(g, "coop", MAP_ID)).toEqual(spot);
    expect(g.animals.build?.building).toBe("coop");
  });

  it("charges nothing for a blocked spot", () => {
    const g = newGame();
    g.money = COOP_COST.coin;
    g.inventory.add("wood", COOP_COST.wood);
    g.inventory.add("stone", COOP_COST.stone);
    expect(orderBuildingAt(g, map(), MAP_ID, "coop", 0, 0)).toBe(false);
    expect(g.money).toBe(COOP_COST.coin);
    expect(g.animals.build).toBeUndefined();
    expect(g.animals.sites.coop).toBeUndefined();
  });

  it("moves for free, and the door and the blocking move with it", () => {
    const g = built();
    const before = g.money;
    const old = COOP_SITES[MAP_ID]!;
    const spot = freeSpot(g, "coop", 120);
    expect(moveBuilding(g, map(), MAP_ID, "coop", spot.x, spot.y)).toBe(true);
    expect(g.money).toBe(before);
    expect(coopBlocks(g, MAP_ID, spot.x, spot.y)).toBe(true);
    expect(coopBlocks(g, MAP_ID, old.x, old.y)).toBe(false);
    const door = doorAt("coop", spot.x, spot.y);
    expect(coopBlocks(g, MAP_ID, door.x, door.y)).toBe(false);
    const moved = mapWithDoors(g, map(), MAP_ID);
    const exit = moved.exits.find((e) => e.id === "coop")!;
    expect({ x: exit.x, y: exit.y }).toEqual(door);
    expect(moved.entry("from_coop")).toMatchObject({
      x: door.x,
      y: door.y + 1,
    });
    // The barn kept its own door.
    const b = BARN_SITES[MAP_ID]!;
    expect(moved.exits.find((e) => e.id === "barn")).toMatchObject({
      x: b.x + 3,
      y: b.y + 3,
    });
  });

  it("can move a coop over its own old spot, and refuses a blocked one", () => {
    const g = built();
    const c = COOP_SITES[MAP_ID]!;
    expect(moveBuilding(g, map(), MAP_ID, "coop", c.x + 1, c.y)).toBe(
      placementProblem(g, map(), MAP_ID, "coop", c.x + 1, c.y) === undefined,
    );
    const b = BARN_SITES[MAP_ID]!;
    expect(moveBuilding(g, map(), MAP_ID, "coop", b.x, b.y)).toBe(false);
  });

  it("keeps animals in a moved coop", () => {
    const g = built();
    g.money = 100000;
    expect(buyAnimal(g, "chicken", "Pip")).toBeDefined();
    const spot = freeSpot(g, "coop", 120);
    moveBuilding(g, map(), MAP_ID, "coop", spot.x, spot.y);
    expect(g.animals.animals).toHaveLength(1);
  });

  it("only moves a building that is built", () => {
    const g = newGame();
    expect(moveProblem(g, "coop")).toMatch(/no coop/);
    g.animals.build = { daysLeft: 2, tier: 1, building: "coop" };
    expect(moveProblem(g, "coop")).toMatch(/still building/);
  });

  it("removes with half of the gold and materials back, rounded down", () => {
    const g = built();
    g.money = 0;
    const wood = g.inventory.count("wood");
    expect(refundOf(g, "coop")).toEqual({
      coin: COOP_COST.coin / 2,
      wood: COOP_COST.wood / 2,
      stone: COOP_COST.stone / 2,
      hardwood: 0,
      iron: 0,
    });
    expect(removeBuilding(g, "coop")).toBe(true);
    expect(g.money).toBe(COOP_COST.coin / 2);
    expect(g.inventory.count("wood")).toBe(wood + COOP_COST.wood / 2);
    expect(g.animals.coopBuilt).toBe(false);
    expect(g.animals.sites.coop).toBeUndefined();
    expect(removeProblem(g, "coop")).toMatch(/no coop/);
  });

  it("refunds the upgrades too, and resets the tier", () => {
    const g = built();
    g.animals.barnTier = 2;
    const r = refundOf(g, "barn");
    expect(r.coin).toBe(Math.floor((BARN_COST.coin + 10000) / 2));
    removeBuilding(g, "barn");
    expect(g.animals.barnTier).toBe(1);
    expect(barnBlocks(g, MAP_ID, BARN_SITES[MAP_ID]!.x, 9)).toBe(false);
  });

  it("will not remove a building with animals, or an egg, or while it is being worked on", () => {
    const g = built();
    buyAnimal(g, "chicken", "Pip");
    expect(removeProblem(g, "coop")).toMatch(/1 animal in it/);
    expect(removeBuilding(g, "coop")).toBe(false);
    expect(g.animals.coopBuilt).toBe(true);
    expect(removeProblem(g, "barn")).toBeUndefined();
    g.animals.build = { daysLeft: 2, tier: 2, building: "barn" };
    expect(removeProblem(g, "barn")).toMatch(/working/);
  });

  it("needs room in the pack for the refund", () => {
    const g = built();
    for (let i = 0; i < 40; i++) g.inventory.add(`filler-${i}`, 1);
    const full = g.inventory.room("wood") < COOP_COST.wood / 2;
    expect(removeProblem(g, "coop") !== undefined).toBe(full);
  });
});

describe("saving sites", () => {
  it("an old save with no sites keeps the fixed site", () => {
    const g = built();
    const raw = JSON.parse(serialize(g));
    delete raw.animals.sites;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.animals.sites).toEqual({});
    expect(siteOf(back, "coop", MAP_ID)).toEqual(COOP_SITES[MAP_ID]);
    expect(siteOf(back, "barn", MAP_ID)).toEqual(BARN_SITES[MAP_ID]);
  });

  it("a chosen site survives a save", () => {
    const g = built();
    const spot = freeSpot(g, "coop", 120);
    moveBuilding(g, map(), MAP_ID, "coop", spot.x, spot.y);
    const back = deserialize(serialize(g))!;
    expect(siteOf(back, "coop", MAP_ID)).toEqual(spot);
    expect(siteOf(back, "barn", MAP_ID)).toEqual(BARN_SITES[MAP_ID]);
  });

  it("drops a site for a building that is not there, and broken ones", () => {
    const a = loadAnimals({
      barnBuilt: true,
      sites: { coop: { x: 3, y: 4 }, barn: { x: "no", y: 2 } },
    });
    expect(a.sites).toEqual({});
    const b = loadAnimals({
      barnBuilt: true,
      sites: { barn: { x: 7.8, y: 2 } },
    });
    expect(b.sites.barn).toEqual({ x: 7, y: 2 });
    expect(saveAnimals(b).sites).toEqual({ barn: { x: 7, y: 2 } });
  });
});

describe("the greenhouse's old site", () => {
  for (const id of ["farm", "farm-woodland"]) {
    it(`is tillable only after a move, on ${id}`, () => {
      const base = maps.get(id);
      const type = id === "farm" ? "standard" : "woodland";
      const s = {
        ...greenhouseRuinSite(type),
        w: GREENHOUSE_SITE.w,
        h: GREENHOUSE_SITE.h,
      };
      const tiles: { x: number; y: number }[] = [];
      for (let y = s.y; y < s.y + s.h; y++)
        for (let x = s.x; x < s.x + s.w; x++) tiles.push({ x, y });
      const g = newGame();
      g.farmType = type;
      const before = mapWithDoors(g, base, id);
      for (const t of tiles) expect(before.isTillable(t.x, t.y)).toBe(false);
      g.greenhouseSite = { x: s.x + 8, y: s.y + 6 };
      const after = mapWithDoors(g, base, id);
      for (const t of tiles) {
        expect(after.isBlocked(t.x, t.y)).toBe(false);
        expect(after.isTillable(t.x, t.y)).toBe(true);
      }
      const n = g.greenhouseSite;
      for (let y = n.y; y < n.y + GREENHOUSE_SITE.h; y++)
        for (let x = n.x; x < n.x + GREENHOUSE_SITE.w; x++)
          expect(after.isTillable(x, y)).toBe(false);
    });
  }

  it("stays untillable under an overlapping new footprint", () => {
    const g = newGame();
    g.greenhouseSite = { x: GREENHOUSE_SITE.x + 2, y: GREENHOUSE_SITE.y };
    const m = mapWithDoors(g, maps.get("farm"), "farm");
    expect(m.isTillable(GREENHOUSE_SITE.x + 3, GREENHOUSE_SITE.y)).toBe(false);
    expect(m.isTillable(GREENHOUSE_SITE.x, GREENHOUSE_SITE.y)).toBe(true);
  });
});
