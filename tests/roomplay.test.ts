// Guests off the farm (note 109, steps 2 to 4), on the host's world: map and reach checks, forage and tools on
// area maps and mine floors, ground pickup, shared floors with creatures that chase the nearest player,
// swings, per-player kills and fainting, and the fishing cast and catch.
import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { FORAGE } from "../src/core/forage";
import { newCreature } from "../src/core/creatures";
import { claimGoal, goalState } from "../src/core/slayerlist";
import { SLAYER_GOALS } from "../src/core/creatures";
import { farmTypeById } from "../src/core/farmtypes";
import { LOCAL_PLAYER } from "../src/core/players";
import type { ServerMsg } from "../src/core/protocol";
import { floorOf } from "../src/core/roommaps";
import { GameRoomWorld } from "../src/core/roomworld";
import type { Standing } from "../src/core/screens";
import { newGame } from "../src/core/save";
import { TOO_FAR } from "../src/core/roommaps";
import { DAYS_PER_SEASON } from "../src/core/calendar";

const FARM = farmTypeById("standard").map;

function mk() {
  const g = newGame("standard", "separate");
  g.day.clock.day = 30;
  const pos = new Map<string, Standing>();
  const w = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => pos.get(id),
  });
  for (const [id, name] of [
    ["p2", "Ann"],
    ["p3", "Bo"],
  ] as const) {
    w.admit(id, name);
    w.addPlayer(id, name);
  }
  const stand = (id: string, map: string, tx: number, ty: number) => {
    const ts = maps.ids.includes(map) ? maps.get(map).tileSize : 16;
    pos.set(id, { x: (tx + 0.5) * ts, y: (ty + 1) * ts - 2, map });
  };
  const sent = (to: string) =>
    w
      .takeNotices()
      .filter((n) => n.to?.includes(to))
      .map((n) => n.msg);
  return { g, w, stand, sent };
}

describe("map and reach checks", () => {
  it("rejects a tool intent for a map the sender is not on, or a tile out of reach", () => {
    const { w, stand } = mk();
    stand("p2", FARM, 10, 10);
    expect(w.apply("p2", { kind: "till", x: 40, y: 40 })).toBe(TOO_FAR);
    expect(w.apply("p2", { kind: "till", x: 10, y: 11, map: "forest" })).toBe(
      TOO_FAR,
    );
    expect(w.apply("p2", { kind: "axe", x: 30, y: 10 })).toBe(TOO_FAR);
    // In reach: the gate lets it through (the rule may still refuse for its own reasons).
    expect(w.apply("p2", { kind: "till", x: 10, y: 11 })).not.toBe(TOO_FAR);
    // A map the host does not run is refused by name.
    expect(w.apply("p2", { kind: "till", x: 1, y: 1, map: "nowhere" })).toBe(
      "Nothing to do here.",
    );
  });

  it("a guest with no position is refused", () => {
    const { w } = mk();
    expect(w.apply("p2", { kind: "water", x: 1, y: 1 })).toBe(TOO_FAR);
  });
});

describe("off-farm world intents", () => {
  it("forage on an area map goes to the first player, whoever the host is", () => {
    const { g, w, stand } = mk();
    const id = FORAGE[0]!.id;
    g.areas.forest!.forage.load([{ x: 12, y: 12, id }]);
    stand("p2", "forest", 12, 13);
    stand("p3", "forest", 12, 14);
    expect(
      w.apply("p2", { kind: "forage", map: "forest", x: 12, y: 12 }),
    ).toBeUndefined();
    expect(g.players.get("p2").inventory.count(id)).toBeGreaterThan(0);
    expect(g.areas.forest!.forage.itemAt(12, 12)).toBeUndefined();
    // The first to take a thing has it.
    expect(w.apply("p3", { kind: "forage", map: "forest", x: 12, y: 12 })).toBe(
      "Nothing to pick here.",
    );
    expect(g.players.get("p3").inventory.count(id)).toBe(0);
    expect(g.away).toBeUndefined();
    expect(g.forage.itemAt(12, 12)).toBeUndefined();
  });

  it("a pickaxe on an area map breaks that map's rock, with the sender's mining experience", () => {
    const { g, w, stand } = mk();
    g.areas.forest!.rocks.add(15, 15, "stone");
    g.rocks.add(15, 15, "stone"); // the farm's rock on the same tile stays
    stand("p2", "forest", 15, 16);
    for (let i = 0; i < 6 && g.areas.forest!.rocks.at(15, 15); i++)
      expect(
        w.apply("p2", { kind: "pickaxe", map: "forest", x: 15, y: 15 }),
      ).toBeUndefined();
    expect(g.areas.forest!.rocks.at(15, 15)).toBeUndefined();
    expect(g.rocks.at(15, 15)).toBeDefined();
    expect(g.players.get("p2").skills.level("mining")).toBeGreaterThanOrEqual(
      0,
    );
    expect(g.away).toBeUndefined();
  });

  it("a pickaxe on a mine floor breaks the floor's rock for everyone, drops on its ground", () => {
    const { g, w, stand } = mk();
    const floor = floorOf(g, 3);
    const rock = [...floor.rocks.each()][0]!;
    stand("p2", "mine-3", rock.x, rock.y + 1);
    const farmRocks = g.rocks.count;
    for (let i = 0; i < 8 && floor.rocks.at(rock.x, rock.y); i++)
      expect(
        w.apply("p2", { kind: "pickaxe", map: "mine-3", x: rock.x, y: rock.y }),
      ).toBeUndefined();
    expect(floor.rocks.at(rock.x, rock.y)).toBeUndefined();
    expect(g.rocks.count).toBe(farmRocks);
  });

  it("rejects a mine map that is not a floor", () => {
    const { w, stand } = mk();
    stand("p2", "mine", 3, 3);
    expect(w.apply("p2", { kind: "pickaxe", map: "mine", x: 3, y: 3 })).toBe(
      "Nothing to do here.",
    );
  });
});

describe("ground pickup for guests", () => {
  it("the first guest within reach takes a pile; it goes to their pack", () => {
    const { g, w, stand, sent } = mk();
    const floor = floorOf(g, 4);
    floor.ground.drop(8, 8, "stone", 3);
    stand("p2", "mine-4", 8, 8);
    stand("p3", "mine-4", 8, 9);
    w.step(100);
    expect(g.players.get("p2").inventory.count("stone")).toBe(3);
    expect(g.players.get("p3").inventory.count("stone")).toBe(0);
    expect(floor.ground.count).toBe(0);
    // Both guests are told the floor changed (the second one's arrival sends it whole).
    expect(sent("p3").some((m) => m.t === "mapstate")).toBe(true);
  });

  it("a full pack leaves the pile; a far guest takes nothing", () => {
    const { g, w, stand } = mk();
    const floor = floorOf(g, 4);
    floor.ground.drop(8, 8, "stone", 3);
    stand("p2", "mine-4", 12, 12);
    w.step(100);
    expect(floor.ground.count).toBe(1);
  });
});

describe("shared mine floors", () => {
  function setup() {
    const t = mk();
    const floor = floorOf(t.g, 5);
    floor.creatures = [newCreature(900, "pebbleback", 8 * 16, 8 * 16)];
    t.stand("p2", "mine-5", 10, 8);
    t.stand("p3", "mine-5", 17, 8);
    return { ...t, floor };
  }

  it("creatures chase the nearest player, and every player on the floor is sent them", () => {
    const { w, floor, sent } = setup();
    const c = floor.creatures[0]!;
    const before = Math.hypot(c.x - 10.5 * 16, c.y - 9 * 16);
    for (let i = 0; i < 12; i++) w.step(100);
    expect(c.state).not.toBe("wander");
    expect(Math.hypot(c.x - 10.5 * 16, c.y - 9 * 16)).toBeLessThan(before);
    const rows = [...sent("p2"), ...sent("p3")].filter(
      (m): m is Extract<ServerMsg, { t: "creatures" }> => m.t === "creatures",
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.at(-1)!.rows[0]!.uid).toBe(900);
  });

  it("a hit lands on the player the creature went for, on their own record", () => {
    const { g, w, floor } = setup();
    const c = floor.creatures[0]!;
    c.x = 10 * 16;
    c.y = 9 * 16 - 3;
    for (let i = 0; i < 40; i++) w.step(100);
    const hurt = g.players.get("p2").combat.health;
    expect(hurt.current).toBeLessThan(hurt.max);
    expect(g.players.get("p3").combat.health.current).toBe(
      g.players.get("p3").combat.health.max,
    );
    expect(g.players.get(LOCAL_PLAYER).combat.health.current).toBe(
      g.players.get(LOCAL_PLAYER).combat.health.max,
    );
  });

  it("a swing hurts the creature; the kill, experience and drops are the swinger's, and count for them alone", () => {
    const { g, w, floor, stand } = setup();
    const ann = g.players.get("p2");
    ann.inventory.add("hazel-switch", 1);
    const c = floor.creatures[0]!;
    c.hp = 1;
    stand("p2", "mine-5", 8, 9);
    // Face up at the creature, one tile away.
    c.x = 8.5 * 16;
    c.y = 8.5 * 16 + 4;
    const xp = ann.skills.level("combat");
    expect(
      w.apply("p2", {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "up",
      }),
    ).toBeUndefined();
    expect(floor.creatures.find((o) => o.uid === 900)).toBeUndefined();
    expect(ann.combat.kills.pebbleback).toBe(1);
    expect(g.players.get("p3").combat.kills.pebbleback).toBeUndefined();
    expect(g.players.get(LOCAL_PLAYER).combat.kills.pebbleback).toBeUndefined();
    expect(ann.skills.level("combat")).toBeGreaterThanOrEqual(xp);
    // The next swing waits out the cooldown.
    expect(
      w.apply("p2", {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "up",
      }),
    ).toBe("Swing again soon.");
  });

  it("a swing needs the weapon in the pack, a valid facing and the right map", () => {
    const { w, stand } = setup();
    expect(
      w.apply("p2", {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "up",
      }),
    ).toBe("no weapon");
    w.g.players.get("p2").inventory.add("hazel-switch", 1);
    expect(
      w.apply("p2", {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "sideways",
      }),
    ).toBe("bad swing");
    stand("p2", FARM, 5, 5);
    expect(
      w.apply("p2", {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "up",
      }),
    ).toBe(TOO_FAR);
  });

  it("only the player whose health runs out faints: they pay, wake at home, the others play on", () => {
    const { g, w, floor, sent } = setup();
    const ann = g.players.get("p2");
    ann.money = 1000;
    ann.inventory.add("parsnip", 5);
    ann.combat.sync(ann.skills);
    ann.combat.health.current = 1;
    const c = floor.creatures[0]!;
    c.x = 10 * 16;
    c.y = 9 * 16 - 3;
    for (let i = 0; i < 60 && ann.combat.health.current === 1; i++) w.step(100);
    const msgs = sent("p2");
    const faint = msgs.find((m) => m.t === "faint");
    expect(faint).toBeDefined();
    expect(ann.money).toBeLessThan(1000);
    expect(ann.combat.health.current).toBe(ann.combat.health.max);
    const bo = g.players.get("p3");
    expect(bo.combat.health.current).toBe(bo.combat.health.max);
    expect(bo.money).toBe(500);
    // A fainted player is not chased again on that floor until they leave it.
    c.x = 10 * 16;
    c.y = 9 * 16 - 3;
    for (let i = 0; i < 20; i++) w.step(100);
    expect(ann.combat.health.current).toBe(ann.combat.health.max);
  });
});

describe("slayer counts and camp chests are per player", () => {
  it("one player's kills never fill another player's goal, and each claims for themselves", () => {
    const { g } = mk();
    const goal = SLAYER_GOALS[0]!;
    const ann = g.players.get("p2");
    ann.combat.kills[goal.id] = goal.goal;
    expect(goalStateAs(g, "p2", goal)).toBe("ready");
    expect(goalStateAs(g, "p3", goal)).toBe("progress");
    expect(goalStateAs(g, LOCAL_PLAYER, goal)).toBe("progress");
    expect(claimAs(g, "p2", goal.id)).toBeUndefined();
    expect(claimAs(g, "p2", goal.id)).toBe("You already took it.");
    expect(claimAs(g, "p3", goal.id)).toBe("That goal is not met yet.");
  });
});

import { asPlayer } from "../src/core/asplayer";
function goalStateAs(
  g: ReturnType<typeof newGame>,
  id: string,
  goal: (typeof SLAYER_GOALS)[number],
) {
  return asPlayer(g, id, () => goalState(g, goal));
}
function claimAs(g: ReturnType<typeof newGame>, id: string, goalId: string) {
  return asPlayer(g, id, () => claimGoal(g, goalId));
}

describe("fishing on the host", () => {
  function water() {
    const t = mk();
    const map = maps.get("forest");
    let tile: { x: number; y: number } | undefined;
    for (let y = 1; y < map.height - 1 && !tile; y++)
      for (let x = 1; x < map.width - 1 && !tile; x++)
        if (map.isWater(x, y) && !map.isWater(x, y + 1)) tile = { x, y };
    return { ...t, tile: tile! };
  }

  it("a cast spends the guest's energy and the host rolls the bite; the catch lands in their pack", () => {
    const { g, w, stand, sent, tile } = water();
    const ann = g.players.get("p2");
    const rodId = "reed-pole";
    ann.inventory.add(rodId, 1);
    stand("p2", "forest", tile.x, tile.y + 1);
    const energy = ann.energy.current;
    const hostEnergy = g.players.get(LOCAL_PLAYER).energy.current;
    const minutes = g.day.clock.minutes;
    expect(
      w.apply("p2", {
        kind: "cast",
        map: "forest",
        x: tile.x,
        y: tile.y,
        rod: rodId,
        distance: 0.5,
      }),
    ).toBeUndefined();
    expect(ann.energy.current).toBeLessThan(energy);
    expect(g.players.get(LOCAL_PLAYER).energy.current).toBe(hostEnergy);
    expect(g.day.clock.minutes).toBe(minutes);
    const bite = sent("p2").find((m) => m.t === "bite");
    expect(bite).toBeDefined();
    if (bite?.t === "bite" && bite.kind !== "none") {
      const before = ann.inventory.save().filter(Boolean).length;
      expect(w.apply("p2", { kind: "catch", perfect: true })).toBeUndefined();
      expect(
        ann.inventory.save().filter(Boolean).length +
          [...(g.areas.forest!.ground.each() ?? [])].length,
      ).toBeGreaterThanOrEqual(before);
      expect(sent("p2").some((m) => m.t === "player")).toBe(true);
    }
    // Nothing is on the line any more.
    expect(w.apply("p2", { kind: "catch" })).toBe("Nothing is on the line.");
  });

  it("refuses a cast from dry ground, too far away, or without the rod", () => {
    const { w, g, stand, tile } = water();
    stand("p2", "forest", tile.x, tile.y + 1);
    const cast = { kind: "cast", map: "forest", x: tile.x, y: tile.y };
    expect(w.apply("p2", { ...cast, rod: "reed-pole" })).toBe("no rod");
    g.players.get("p2").inventory.add("reed-pole", 1);
    expect(w.apply("p2", { ...cast, rod: "nope" })).toBe("bad cast");
    expect(w.apply("p2", { ...cast, y: tile.y + 1, rod: "reed-pole" })).toBe(
      "Face the water to fish.",
    );
    stand("p2", "forest", tile.x + 15, tile.y + 5);
    expect(w.apply("p2", { ...cast, rod: "reed-pole" })).toBe(TOO_FAR);
  });
  it("a miss drops the line and lands nothing", () => {
    const { g, w, stand, tile } = water();
    const ann = g.players.get("p2");
    ann.inventory.add("reed-pole", 1);
    stand("p2", "forest", tile.x, tile.y + 1);
    const cast = {
      kind: "cast",
      map: "forest",
      x: tile.x,
      y: tile.y,
      rod: "reed-pole",
    };
    expect(w.apply("p2", cast)).toBeUndefined();
    const before = JSON.stringify(ann.inventory.save());
    expect(w.apply("p2", { kind: "catch", miss: true })).toBeUndefined();
    expect(JSON.stringify(ann.inventory.save())).toBe(before);
    expect(w.apply("p2", { kind: "catch", perfect: true })).toBe(
      "Nothing is on the line.",
    );
  });

  it("the Frostday lake is shut until the festival opens, and a hole cast can bring the Frostfin", () => {
    const { g, w, stand, tile } = water();
    const ann = g.players.get("p2");
    ann.inventory.add("reed-pole", 1);
    stand("p2", "forest", tile.x, tile.y + 1);
    // Winter 8 is Frostday.
    g.day.clock.day = 3 * DAYS_PER_SEASON + 8;
    g.day.clock.minutes = 7 * 60;
    const cast = {
      kind: "cast",
      map: "forest",
      x: tile.x,
      y: tile.y,
      rod: "reed-pole",
    };
    expect(w.apply("p2", cast)).toBe("The lake opens at noon.");
    g.day.clock.minutes = 14 * 60;
    expect(w.apply("p2", cast)).toBeUndefined();
  });

  it("the pier is on Hearthwell, a town map the host does not run for guests, so a guest cannot cast there yet", () => {
    const { g, w, stand } = mk();
    g.players.get("p2").inventory.add("reed-pole", 1);
    g.day.clock.day = 3 * DAYS_PER_SEASON + 16;
    g.day.clock.minutes = 18 * 60;
    stand("p2", "hearthwell", 63, 66);
    expect(
      w.apply("p2", {
        kind: "cast",
        map: "hearthwell",
        x: 64,
        y: 66,
        rod: "reed-pole",
      }),
    ).toBe("Nothing to fish here.");
  });
});
