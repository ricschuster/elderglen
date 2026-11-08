import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { COOP_SITES } from "../src/core/animals";
import { till } from "../src/core/actions";
import { act, useHeld } from "../src/core/tools";
import { CROPS } from "../src/core/crops";
import { DAYS_PER_SEASON } from "../src/core/calendar";
import { MATURE_DAYS, MAX_FRUIT, saplingId } from "../src/core/fruittrees";
import {
  GREENHOUSE_MAP,
  GREENHOUSE_SITE,
  greenhouseBlocks,
  greenhouseSite,
} from "../src/core/greenhouse";
import {
  mapWithDoors,
  moveBuilding,
  moveProblem,
  placementBlockers,
} from "../src/core/placement";
import { deserialize, newGame, serialize } from "../src/core/save";
import type { GameState } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { Trees } from "../src/core/trees";
import { Rocks } from "../src/core/rocks";
import { Weeds } from "../src/core/weeds";
import { Twigs } from "../src/core/debris";
import { ForageField } from "../src/core/forage";
import { seedId } from "../src/core/items";

const house = () => maps.get(GREENHOUSE_MAP);
const WINTER_DAY = 3 * DAYS_PER_SEASON + 5;
const held = (id: string) => ({ kind: "item", id }) as never;
const tool = (t: string) => ({ kind: "tool", tool: t }) as never;
const spring = CROPS.find(
  (c) =>
    c.seasons.length === 1 &&
    c.seasons[0] === "spring" &&
    c.regrowDays === undefined,
)!;

/** A game with the Larder done, so the greenhouse is repaired. */
function repaired(): GameState {
  const g = newGame();
  g.hall.roomComplete = () => true;
  g.trees = new Trees([]);
  g.rocks = new Rocks([]);
  g.weeds = new Weeds();
  g.twigs = new Twigs();
  g.forage = new ForageField();
  return g;
}

describe("sprinklers in the greenhouse", () => {
  it("go on the border and inside the plot, apart from the farm's", () => {
    const g = newGame();
    g.inventory.add("sprinkler", 3);
    const m = house();
    // The margin outside the soil plot (the border), and a tile inside it.
    expect(useHeld(g, m, held("sprinkler"), 2, 2)).toMatchObject({ ok: true });
    expect(useHeld(g, m, held("sprinkler"), 8, 8)).toMatchObject({ ok: true });
    expect(g.greenhouseSprinklers.at(2, 2)).toBe("sprinkler");
    expect(g.greenhouseSprinklers.at(8, 8)).toBe("sprinkler");
    expect(g.sprinklers.count).toBe(0);
    // Not on a wall, and not twice on one tile.
    expect(useHeld(g, m, held("sprinkler"), 0, 0)).toMatchObject({ ok: false });
    expect(useHeld(g, m, held("sprinkler"), 8, 8)).toMatchObject({ ok: false });
    // Digging under one is refused, and the hand lifts it back.
    expect(till(g, 8, 8, Math.random, g.greenhouse)).toMatchObject({
      ok: false,
      reason: "a sprinkler is in the way",
    });
    expect(act(g, m, 8, 8)).toMatchObject({ ok: true, item: "sprinkler" });
    expect(g.greenhouseSprinklers.at(8, 8)).toBeUndefined();
    expect(g.inventory.count("sprinkler")).toBe(2);
  });

  it("water the greenhouse plot overnight, in any season, and not the farm", () => {
    const g = newGame();
    g.day.clock.day = WINTER_DAY;
    g.greenhouse.till(7, 8);
    g.greenhouse.plant(7, 8, spring.id, "winter");
    g.farm.till(7, 8);
    g.greenhouseSprinklers.add(8, 8, "sprinkler");
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouse.plotAt(7, 8)?.wateredToday).toBe(true);
    expect(g.farm.plotAt(7, 8)?.wateredToday).toBe(false);
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouse.plotAt(7, 8)?.crop?.daysGrown).toBe(1);
  });

  it("a farm sprinkler on the same tile numbers does not water the greenhouse", () => {
    const g = newGame();
    g.greenhouse.till(7, 8);
    g.sprinklers.add(8, 8, "sprinkler");
    g.weather = "sun" as never;
    g.tomorrow = "sun" as never;
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouse.plotAt(7, 8)?.wateredToday).toBe(false);
  });
});

describe("fruit trees in the greenhouse", () => {
  it("plants indoors, refuses a neighbour, and is felled by the axe", () => {
    const g = newGame();
    const m = house();
    g.inventory.add(saplingId("apricot"), 3);
    expect(useHeld(g, m, held(saplingId("apricot")), 6, 6)).toMatchObject({
      ok: true,
    });
    expect(g.greenhouseFruitTrees.at(6, 6)).toBeDefined();
    expect(g.fruitTrees.count).toBe(0);
    expect(useHeld(g, m, held(saplingId("apricot")), 7, 7)).toMatchObject({
      ok: false,
      reason: "too close to another tree",
    });
    // It can stand on the border too, and the hoe will not dig it up.
    expect(useHeld(g, m, held(saplingId("apricot")), 2, 14)).toMatchObject({
      ok: true,
    });
    expect(useHeld(g, m, tool("hoe"), 6, 6)).toMatchObject({ ok: false });
    // A young tree falls in one swing and gives its sapling back.
    expect(useHeld(g, m, tool("axe"), 6, 6)).toMatchObject({ ok: true });
    expect(g.greenhouseFruitTrees.at(6, 6)).toBeUndefined();
    expect(g.inventory.count(saplingId("apricot"))).toBe(2);
  });

  it("grows in winter and bears every day, whatever its season", () => {
    const g = newGame();
    g.day.clock.day = WINTER_DAY;
    g.inventory.add(saplingId("apricot"));
    useHeld(g, house(), held(saplingId("apricot")), 6, 6);
    const tree = g.greenhouseFruitTrees.at(6, 6)!;
    for (let i = 0; i < MATURE_DAYS; i++) sleep(g, [], () => 0.99, undefined);
    expect(tree.age).toBe(MATURE_DAYS);
    expect(tree.fruit).toBe(0);
    sleep(g, [], () => 0.99, undefined);
    expect(tree.fruit).toBe(1);
    for (let i = 0; i < 5; i++) sleep(g, [], () => 0.99, undefined);
    expect(tree.fruit).toBe(MAX_FRUIT);
    expect(act(g, house(), 6, 6)).toMatchObject({ ok: true });
    expect(tree.fruit).toBe(0);
    expect(g.inventory.count("apricot")).toBe(MAX_FRUIT);
  });

  it("stops growing while a crop or a sprinkler stands beside it", () => {
    const g = newGame();
    g.greenhouseFruitTrees.add(6, 6, "apricot");
    g.greenhouse.till(7, 6);
    g.greenhouse.plant(7, 6, spring.id, "spring");
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouseFruitTrees.at(6, 6)?.age).toBe(0);
    g.greenhouse.load({});
    g.greenhouseSprinklers.add(5, 5, "sprinkler");
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouseFruitTrees.at(6, 6)?.age).toBe(0);
    g.greenhouseSprinklers.remove(5, 5);
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouseFruitTrees.at(6, 6)?.age).toBe(1);
  });

  it("will not fell a tree with a full pack, so nothing lands on the farm", () => {
    const g = newGame();
    g.greenhouseFruitTrees.add(6, 6, "apricot");
    for (const c of CROPS) g.inventory.add(seedId(c.id));
    expect(g.inventory.room("wood")).toBe(0);
    expect(useHeld(g, house(), tool("axe"), 6, 6)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.greenhouseFruitTrees.at(6, 6)).toBeDefined();
    expect([...g.ground.each()]).toHaveLength(0);
  });
});

describe("the per-map store in saves", () => {
  it("round-trips both maps' sprinklers and fruit trees apart", () => {
    const g = newGame();
    g.sprinklers.add(3, 3, "sprinkler");
    g.fruitTrees.add(10, 10, "apricot", 5);
    g.greenhouseSprinklers.add(3, 3, "quality-sprinkler");
    g.greenhouseFruitTrees.add(10, 10, "cherry", 9);
    const back = deserialize(serialize(g))!;
    expect(back.sprinklers.at(3, 3)).toBe("sprinkler");
    expect(back.fruitTrees.at(10, 10)?.id).toBe("apricot");
    expect(back.greenhouseSprinklers.at(3, 3)).toBe("quality-sprinkler");
    expect(back.greenhouseFruitTrees.at(10, 10)).toMatchObject({
      id: "cherry",
      age: 9,
    });
  });

  it("loads an old save: its outdoor items stay on the farm, the greenhouse is empty", () => {
    const g = newGame();
    g.sprinklers.add(3, 3, "sprinkler");
    g.fruitTrees.add(10, 10, "apricot", 12);
    const raw = JSON.parse(serialize(g));
    // The shape before the per-map store: two top level lists.
    raw.sprinklers = raw.mapItems.farm.sprinklers;
    raw.fruitTrees = raw.mapItems.farm.fruitTrees;
    delete raw.mapItems;
    delete raw.greenhouseSite;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.sprinklers.at(3, 3)).toBe("sprinkler");
    expect(back.fruitTrees.at(10, 10)).toMatchObject({
      id: "apricot",
      age: 12,
    });
    expect(back.greenhouseSprinklers.count).toBe(0);
    expect(back.greenhouseFruitTrees.count).toBe(0);
    expect(back.greenhouseSite).toBeUndefined();
  });

  it("drops damaged entries instead of failing", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.mapItems = {
      farm: { sprinklers: "nope", fruitTrees: [{ x: 1 }] },
      greenhouse: {
        sprinklers: [
          { x: 2, y: 2, id: "sprinkler" },
          { x: 3, y: 3, id: "no-such" },
        ],
      },
    };
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.sprinklers.count).toBe(0);
    expect(back.fruitTrees.count).toBe(0);
    expect(back.greenhouseSprinklers.count).toBe(1);
  });
});

describe("moving the greenhouse at the carpenter", () => {
  const raw = () => maps.get("farm");

  it("stays put while it is a ruin, and moves once repaired", () => {
    const g = newGame();
    expect(moveProblem(g, "greenhouse")).toMatch(/ruin/);
    expect(moveBuilding(g, raw(), "farm", "greenhouse", 20, 10)).toBe(false);
    const r = repaired();
    expect(moveProblem(r, "greenhouse")).toBeUndefined();
    expect(greenhouseSite(r)).toEqual({
      x: GREENHOUSE_SITE.x,
      y: GREENHOUSE_SITE.y,
    });
  });

  it("is refused on rocks, soil and the other buildings, and accepted on bare ground", () => {
    const g = repaired();
    g.farm.till(20, 12);
    expect(
      placementBlockers(g, raw(), "farm", "greenhouse", 20, 12).map(
        (b) => b.why,
      ),
    ).toContain("tilled soil");
    expect(moveBuilding(g, raw(), "farm", "greenhouse", 20, 12)).toBe(false);
    g.animals.coopBuilt = true;
    const c = COOP_SITES.farm!;
    expect(
      placementBlockers(g, raw(), "farm", "greenhouse", c.x, c.y).length,
    ).toBeGreaterThan(0);
    // A coop is likewise kept off the greenhouse where it stands.
    expect(
      placementBlockers(
        g,
        raw(),
        "farm",
        "coop",
        GREENHOUSE_SITE.x,
        GREENHOUSE_SITE.y,
      ).some((b) => b.why === "your greenhouse"),
    ).toBe(true);
    g.farm.load({});
    let spot: { x: number; y: number } | undefined;
    for (let y = 8; y < 24 && !spot; y++)
      for (let x = 2; x < 30 && !spot; x++)
        if (
          placementBlockers(g, raw(), "farm", "greenhouse", x, y).length === 0
        )
          spot = { x, y };
    expect(spot).toBeDefined();
    expect(moveBuilding(g, raw(), "farm", "greenhouse", spot!.x, spot!.y)).toBe(
      true,
    );
    expect(greenhouseSite(g)).toEqual(spot);
  });

  it("leaves the interior alone: soil, crops, sprinklers and trees stay", () => {
    const g = repaired();
    g.inventory.add(seedId(spring.id));
    useHeld(g, house(), tool("hoe"), 6, 6);
    useHeld(g, house(), held(seedId(spring.id)), 6, 6);
    g.greenhouseSprinklers.add(2, 2, "sprinkler");
    g.greenhouseFruitTrees.add(12, 12, "apricot", 3);
    let spot: { x: number; y: number } | undefined;
    for (let y = 8; y < 24 && !spot; y++)
      for (let x = 2; x < 30 && !spot; x++)
        if (
          placementBlockers(g, raw(), "farm", "greenhouse", x, y).length === 0
        )
          spot = { x, y };
    expect(moveBuilding(g, raw(), "farm", "greenhouse", spot!.x, spot!.y)).toBe(
      true,
    );
    expect(g.greenhouse.plotAt(6, 6)?.crop?.id).toBe(spring.id);
    expect(g.greenhouseSprinklers.at(2, 2)).toBe("sprinkler");
    expect(g.greenhouseFruitTrees.at(12, 12)?.age).toBe(3);
  });

  it("moves its door and its walls on the farm map, and frees the old site", () => {
    const g = repaired();
    g.greenhouseSite = { x: 20, y: 12 };
    const m = mapWithDoors(g, raw(), "farm");
    const door = m.exits.find((e) => e.id === "greenhouse")!;
    expect(door).toMatchObject({ x: 22, y: 15 });
    expect(m.entry("from_greenhouse")).toMatchObject({ x: 22, y: 16 });
    expect(m.isBlocked(21, 13)).toBe(true);
    expect(m.isBlocked(22, 15)).toBe(false);
    expect(greenhouseBlocks(g, 21, 13)).toBe(true);
    expect(m.isTillable(21, 13)).toBe(false);
    // The ruin site is open ground again.
    expect(m.isBlocked(GREENHOUSE_SITE.x + 1, GREENHOUSE_SITE.y + 1)).toBe(
      false,
    );
    // And at the default site the walls stand.
    const d = mapWithDoors(newGame(), raw(), "farm");
    expect(d.isBlocked(GREENHOUSE_SITE.x + 1, GREENHOUSE_SITE.y + 1)).toBe(
      true,
    );
    expect(d.exits.find((e) => e.id === "greenhouse")).toMatchObject({
      x: 15,
      y: 5,
    });
  });

  it("saves the new site, and an old save has none", () => {
    const g = repaired();
    g.greenhouseSite = { x: 20, y: 12 };
    expect(deserialize(serialize(g))!.greenhouseSite).toEqual({ x: 20, y: 12 });
    const old = JSON.parse(serialize(newGame()));
    expect(old.greenhouseSite).toBeUndefined();
    expect(deserialize(JSON.stringify(old))!.greenhouseSite).toBeUndefined();
    old.greenhouseSite = { x: "a", y: 1 };
    expect(deserialize(JSON.stringify(old))!.greenhouseSite).toBeUndefined();
  });
});
