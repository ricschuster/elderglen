// Core rules of the guest's cabin (note 110): the cabin book in the save, instance ids, beds and wake spots,
// the occupant's carpenter orders and builds, and the per-player mailbox.
import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  CABIN_STYLES,
  cabinDoorTile,
  cabinOf,
  joinNeedsCabin,
  loadCabinBook,
  newCabinBook,
  restyleCabin,
} from "../src/core/cabins";
import {
  advanceCabinBuilds,
  cabinReno,
  cabinUpgradeProblem,
  mailboxOwnerAt,
  orderCabinUpgrade,
} from "../src/core/cabinhome";
import {
  bedOf,
  defaultBed,
  homeData,
  homeMapId,
  homeOwnerOf,
  homeVisibleTier,
  ownHomeMap,
  ownWakeSpot,
  wakeSpot,
  applyBedMove,
} from "../src/core/homes";
import { festivalDayToday } from "../src/core/festivals";
import { isHouseMap } from "../src/core/house";
import type { LetterDef } from "../src/core/mail";
import { baseMapId } from "../src/core/maps";
import { LOCAL_PLAYER } from "../src/core/players";
import { deserialize, newGame, serialize } from "../src/core/save";
import { GameRoomWorld } from "../src/core/roomworld";
import { Room } from "../src/core/room";

const plainDay = () => {
  for (let d = 5; ; d++) if (!festivalDayToday(d)) return d;
};
const festival = () => {
  for (let d = 1; d < 400; d++) if (festivalDayToday(d)) return d;
  throw new Error("no festival");
};

function hosted() {
  const g = newGame("standard", "separate");
  const room = new Room(new GameRoomWorld(g, { random: () => 0.5 }));
  const ann = room.join("Ann")!;
  const bo = room.join("Bo")!;
  return { g, room, ann, bo };
}

describe("home instances", () => {
  it("names one house instance per owner and reads it back", () => {
    expect(homeMapId(LOCAL_PLAYER)).toBe("house");
    expect(homeMapId("p2")).toBe("house@p2");
    expect(homeOwnerOf("house")).toBe(LOCAL_PLAYER);
    expect(homeOwnerOf("house-1")).toBe(LOCAL_PLAYER);
    expect(homeOwnerOf("house@p3")).toBe("p3");
    expect(homeOwnerOf("house@")).toBeUndefined();
    expect(homeOwnerOf("farm")).toBeUndefined();
    expect(isHouseMap("house@p2")).toBe(true);
    expect(isHouseMap("housekeeper")).toBe(false);
  });

  it("the registry serves the one house map for every instance", () => {
    expect(baseMapId("house@p2")).toBe("house");
    expect(baseMapId("farm")).toBe("farm");
    expect(maps.get("house@p2")).toBe(maps.get("house"));
    expect(maps.maxTier("house@p2")).toBe(maps.maxTier("house"));
    expect(maps.getWith("house@p9", new Set(), 1)).toBe(
      maps.getWith("house", new Set(), 1),
    );
  });

  it("gives each home its owner's tier and renovations", () => {
    const { g } = hosted();
    g.houseTier = 2;
    const c = cabinOf(g.cabins!, "p2")!;
    c.tier = 1;
    expect(homeData(g, "house")?.tier).toBe(2);
    expect(homeData(g, "house@p2")?.tier).toBe(1);
    expect(homeVisibleTier(g, "house@p2")).toBe(1);
    expect(homeData(g, "house@p7")).toBeUndefined();
    expect(homeData(g, "farm")).toBeUndefined();
  });
});

describe("the cabin book in the save", () => {
  it("round trips cabins, styles, tiers, builds and moved beds", () => {
    const { g } = hosted();
    const c = cabinOf(g.cabins!, "p2")!;
    c.style = "stone";
    c.tier = 2;
    c.renos = ["south"];
    c.build = { tier: 3, daysLeft: 2 };
    g.cabins = { ...g.cabins!, beds: { p2: { x: 41, y: 31 } } };
    const back = deserialize(serialize(g))!;
    expect(back.cabins).toEqual(g.cabins);
    expect(back.players.has("p2")).toBe(true);
  });

  it("an old save with no cabin book loads with none, and an empty book is not written", () => {
    const g = newGame();
    expect(JSON.parse(serialize(g)).cabins).toBeUndefined();
    const raw = JSON.parse(serialize(g));
    delete raw.cabins;
    expect(deserialize(JSON.stringify(raw))!.cabins).toBeUndefined();
  });

  it("fills defaults for cabins saved before styles and tiers, and drops bad rows", () => {
    const book = loadCabinBook({
      origin: "converted",
      nextId: 1,
      cabins: [
        { id: 3, x: 4, y: 5, ownerKey: "p2", free: true },
        { id: 3, x: 9, y: 9, ownerKey: "p4", free: false },
        { id: 0, x: 1, y: 1 },
        "junk",
        {
          id: 4,
          x: 1,
          y: 2,
          ownerKey: null,
          free: false,
          style: "castle",
          tier: 99,
          renos: ["a", 3],
        },
      ],
      beds: { p2: { x: 3, y: 4 }, p5: { x: "a" } },
    })!;
    expect(book.origin).toBe("converted");
    expect(book.cabins.map((c) => c.id)).toEqual([3, 4]);
    expect(book.cabins[0]).toMatchObject({ style: "log", tier: 0, renos: [] });
    expect(book.cabins[1]).toMatchObject({
      style: "log",
      tier: 3,
      renos: ["a"],
    });
    expect(book.nextId).toBe(5);
    expect(book.beds).toEqual({ p2: { x: 3, y: 4 } });
    expect(loadCabinBook(undefined)).toBeUndefined();
    expect(loadCabinBook({ cabins: "x" })).toBeUndefined();
  });

  it("guests' letters are saved with them and the host's stay in the flat save", () => {
    const { g, ann } = hosted();
    g.players.get(ann).mail.queue("x", 5, LETTER);
    g.players.get(LOCAL_PLAYER).mail.queue("y", 5, LETTER);
    const raw = JSON.parse(serialize(g));
    expect(
      raw.players.find((p: { id: string }) => p.id === ann).mail,
    ).toHaveLength(1);
    expect(
      raw.players.find((p: { id: string }) => p.id === LOCAL_PLAYER).mail,
    ).toBeUndefined();
    const back = deserialize(serialize(g))!;
    expect(back.players.get(ann).mail.has("x")).toBe(true);
    expect(back.players.get(LOCAL_PLAYER).mail.has("y")).toBe(true);
    expect(back.players.get(LOCAL_PLAYER).mail.has("x")).toBe(false);
    // The accessor follows the acting player.
    back.players.localId = ann;
    expect(back.mail.has("x")).toBe(true);
  });
});

const LETTER: LetterDef = {
  id: "n",
  sender: "s",
  title: "t",
  body: "b",
  trigger: { kind: "first-achievement" },
};

describe("cabin styles and the book", () => {
  it("a new cabin keeps the style it was placed with, a returning key keeps its own", () => {
    const area = { x: 0, y: 0, w: 40, h: 30 };
    const book = newCabinBook("multiplayer-start");
    const a = joinNeedsCabin(book, "p2", area, () => false, "plank");
    expect(a.kind === "assigned" && a.cabin.style).toBe("plank");
    if (a.kind !== "assigned") throw new Error("x");
    const again = joinNeedsCabin(a.book, "p2", area, () => false, "stone");
    expect(again.kind === "returning" && again.cabin.style).toBe("plank");
    expect(CABIN_STYLES).toHaveLength(3);
  });

  it("only the occupant restyles, and only to a known, different style", () => {
    const { g } = hosted();
    const book = g.cabins!;
    expect(restyleCabin(book, "p9", "stone")).toMatchObject({ ok: false });
    expect(restyleCabin(book, "p2", "castle")).toEqual({
      ok: false,
      reason: "bad style",
    });
    expect(restyleCabin(book, "p2", "log")).toMatchObject({ ok: false });
    const r = restyleCabin(book, "p2", "plank");
    expect(r.ok && cabinOf(r.book, "p2")?.style).toBe("plank");
    expect(cabinOf(book, "p2")?.style).toBe("log");
  });
});

describe("beds", () => {
  it("the default wake tiles are open floor at every tier", () => {
    for (const tier of [0, 1, 2, 3]) {
      const b = defaultBed(tier);
      expect(maps.get("house", Math.min(tier, 2)).isBlocked(b.x, b.y)).toBe(
        false,
      );
    }
  });

  it("wakes in the owner's bed of the home slept in, and passes out to the player's own home", () => {
    const { g, ann, bo } = hosted();
    expect(wakeSpot(g, "house@p3")).toEqual({
      map: "house@p3",
      ...defaultBed(0),
    });
    expect(wakeSpot(g, "house")).toEqual({ map: "house", ...defaultBed(0) });
    expect(wakeSpot(g, "house@p8")).toBeUndefined();
    expect(ownHomeMap(g, ann)).toBe("house@p2");
    expect(ownHomeMap(g, LOCAL_PLAYER)).toBe("house");
    expect(ownWakeSpot(g, bo)?.map).toBe("house@p3");
    expect(ownWakeSpot(g, "p9")).toBeUndefined();
  });

  it("a moved bed is the owner's alone, on free floor, and is where they wake", () => {
    const { g, ann, bo } = hosted();
    const to = { x: 38, y: 31 };
    const ok = applyBedMove(g, ann, {
      kind: "bed-move",
      map: "house@p2",
      ...to,
    });
    expect(ok).toBeUndefined();
    expect(bedOf(g, ann)).toEqual(to);
    expect(wakeSpot(g, "house@p2")).toEqual({ map: "house@p2", ...to });
    // A visitor, a wall, a service tile, a bad shape and a furniture tile are all refused.
    expect(
      applyBedMove(g, bo, { kind: "bed-move", map: "house@p2", x: 37, y: 31 }),
    ).toMatch(/Only the one who lives here/);
    expect(
      applyBedMove(g, ann, { kind: "bed-move", map: "house@p2", x: 0, y: 0 }),
    ).toBe("The bed will not go there.");
    expect(
      applyBedMove(g, ann, { kind: "bed-move", map: "house@p2", x: 40, y: 30 }),
    ).toBe("The bed will not go there.");
    expect(
      applyBedMove(g, ann, { kind: "bed-move", map: "farm", x: 1, y: 1 }),
    ).toBe("There is no home here.");
    expect(
      applyBedMove(g, ann, { kind: "bed-move", map: "house@p2", x: 1.5, y: 1 }),
    ).toBe("bad bed-move");
    g.furniture.add("house@p2", 37, 31, "oak-chair");
    expect(
      applyBedMove(g, ann, { kind: "bed-move", map: "house@p2", x: 37, y: 31 }),
    ).toBe("Something is in the way.");
  });

  it("a host without a book can still move their bed", () => {
    const g = newGame();
    g.cabins = undefined;
    expect(
      applyBedMove(g, LOCAL_PLAYER, {
        kind: "bed-move",
        map: "house",
        x: 38,
        y: 31,
      }),
    ).toBeUndefined();
    expect(bedOf(g, LOCAL_PLAYER)).toEqual({ x: 38, y: 31 });
  });
});

describe("the occupant's carpenter orders", () => {
  it("pays from the occupant's wallet and pack and builds over three mornings", () => {
    const { g, ann, bo } = hosted();
    const c = cabinOf(g.cabins!, ann)!;
    expect(cabinUpgradeProblem(g, c, ann)).toMatch(
      /You need 9500g more and 450 more wood/,
    );
    g.players.get(ann).money = 10500;
    g.players.get(ann).inventory.add("wood", 450);
    g.players.get(bo).money = 99999;
    expect(orderCabinUpgrade(g, c, ann)).toBeUndefined();
    expect(g.players.get(ann).money).toBe(500);
    expect(g.players.get(ann).inventory.count("wood")).toBe(0);
    expect(g.players.get(bo).money).toBe(99999);
    expect(c.build).toEqual({ tier: 1, daysLeft: 3 });
    expect(orderCabinUpgrade(g, c, ann)).toMatch(/already at work/);
    g.day.clock.day = plainDay();
    expect(advanceCabinBuilds(g, () => true)).toEqual([]);
    expect(advanceCabinBuilds(g, () => true)).toEqual([]);
    expect(c.build?.daysLeft).toBe(1);
    expect(advanceCabinBuilds(g, () => true)).toEqual([c]);
    expect(c.tier).toBe(1);
    expect(c.build).toBeUndefined();
    expect(homeVisibleTier(g, "house@p2")).toBe(1);
  });

  it("a night does not count for an occupant who was passed out away from the farm, nor on a festival morning", () => {
    const { g, ann, bo } = hosted();
    for (const id of [ann, bo])
      cabinOf(g.cabins!, id)!.build = { tier: 1, daysLeft: 3 };
    g.day.clock.day = plainDay();
    advanceCabinBuilds(g, (o) => o === ann);
    expect(cabinOf(g.cabins!, ann)!.build?.daysLeft).toBe(2);
    expect(cabinOf(g.cabins!, bo)!.build?.daysLeft).toBe(3);
    g.day.clock.day = festival();
    advanceCabinBuilds(g, () => true);
    expect(cabinOf(g.cabins!, ann)!.build?.daysLeft).toBe(2);
  });

  it("orders and takes back renovations in the cabin, paying the occupant", () => {
    const { g, ann } = hosted();
    const c = cabinOf(g.cabins!, ann)!;
    g.players.get(ann).money = 100000;
    expect(cabinReno(g, c, ann, "south", false)).toMatch(/upper floor/);
    c.tier = 2;
    const before = g.players.get(ann).money;
    expect(cabinReno(g, c, ann, "south", false)).toBeUndefined();
    expect(c.renos).toEqual(["south"]);
    expect(g.players.get(ann).money).toBeLessThan(before);
    expect(g.houseRenos).toEqual([]);
    expect(cabinReno(g, c, ann, "south", true)).toBeUndefined();
    expect(c.renos).toEqual([]);
    expect(g.players.get(ann).money).toBe(before);
  });
});

describe("mailboxes", () => {
  it("finds a cabin's mailbox by its tile and nothing else", () => {
    const { g } = hosted();
    const c = cabinOf(g.cabins!, "p3")!;
    const door = cabinDoorTile(c);
    expect(door).toEqual({ x: c.x + 1, y: c.y + 2 });
    expect(mailboxOwnerAt(g, "farm", c.x + 3, c.y + 3)).toBe("p3");
    expect(mailboxOwnerAt(g, "forest", c.x + 3, c.y + 3)).toBeUndefined();
    expect(mailboxOwnerAt(g, "farm", c.x, c.y)).toBeUndefined();
  });
});
