import { describe, expect, it } from "vitest";
import {
  BUNDLES,
  Hall,
  LAST_ROOM,
  ROOMS,
  normalizeBundle,
  rewardText,
  type BundleDef,
} from "../src/core/bundles";
import { Inventory } from "../src/core/inventory";
import { itemById } from "../src/core/items";
import { CROPS } from "../src/core/crops";
import { FORAGE } from "../src/core/forage";
import { FRUIT_TREES } from "../src/core/fruittrees";
import { SEASONS } from "../src/core/calendar";
import { machineById } from "../src/core/processing";
import { RECIPES } from "../src/core/crafting";
import { CATEGORY_NAMES, type ArtisanCategory } from "../src/core/artisan";
import { fillHall } from "./hall-helpers";

describe("bundle data", () => {
  it("has the ten slice 1 bundles with known items and sane requirements", () => {
    expect(BUNDLES.map((b) => b.id)).toEqual([
      "spring-foraging",
      "summer-foraging",
      "winter-foraging",
      "woodland",
      "spring-crops",
      "summer-crops",
      "autumn-crops",
      "quality-crops",
      "artisan-goods",
      "smiths",
    ]);
    for (const b of BUNDLES) {
      expect(b.required).toBeGreaterThanOrEqual(1);
      expect(b.required).toBeLessThanOrEqual(b.items.length);
      expect(b.hint, b.id).not.toBe("");
      expect(
        ROOMS.some((r) => r.id === b.room),
        b.id,
      ).toBe(true);
      for (const { id, count } of b.items) {
        expect(
          itemById(id) ?? CATEGORY_NAMES[id as ArtisanCategory],
          `${b.id}: ${id}`,
        ).toBeDefined();
        expect(count).toBeGreaterThanOrEqual(1);
      }
      if (b.reward.item) expect(itemById(b.reward.item.id)).toBeDefined();
    }
  });
});

const openRooms = ROOMS.map((r) => ({ ...r, opensAfter: 0 }));
/** A hall with every room open, for tests that are not about the gate. */
const openHall = () => new Hall(BUNDLES, {}, openRooms);

/** Hand a foraging bundle in full, so the Larder opens. */
function openLarder(hall: Hall, inv: Inventory, w: { money: number }) {
  for (const id of ["daffodil", "leek", "dandelion", "horseradish"]) {
    inv.add(id);
    hall.handIn(inv, w, "spring-foraging", id);
  }
}

describe("Hall", () => {
  it("accepts goods one by one and rewards on completion", () => {
    const hall = openHall();
    const inv = new Inventory();
    const wallet = { money: 0 };
    inv.add("parsnip");
    inv.add("potato");
    inv.add("cauliflower");
    expect(hall.handIn(inv, wallet, "spring-crops", "parsnip")).toBe(
      "accepted",
    );
    expect(hall.handIn(inv, wallet, "spring-crops", "potato")).toBe("accepted");
    expect(wallet.money).toBe(0);
    expect(hall.handIn(inv, wallet, "spring-crops", "cauliflower")).toBe(
      "completed",
    );
    expect(wallet.money).toBe(300);
    expect(hall.complete("spring-crops")).toBe(true);
    expect(inv.count("parsnip")).toBe(0);
  });

  it("gives item rewards", () => {
    const hall = openHall();
    const inv = new Inventory();
    for (const id of ["grape", "spice-berry", "sweet-pea"]) {
      inv.add(id);
      hall.handIn(inv, { money: 0 }, "summer-foraging", id);
    }
    expect(inv.count("radish-seed")).toBe(15);
  });

  it("rejects unwanted, duplicate, missing and unknown hand-ins", () => {
    const hall = openHall();
    const inv = new Inventory();
    const w = { money: 0 };
    inv.add("melon", 2);
    expect(hall.handIn(inv, w, "spring-crops", "melon")).toBe("rejected");
    expect(hall.handIn(inv, w, "summer-crops", "radish")).toBe("rejected");
    expect(hall.handIn(inv, w, "nope", "melon")).toBe("rejected");
    expect(hall.handIn(inv, w, "summer-crops", "melon")).toBe("accepted");
    expect(hall.handIn(inv, w, "summer-crops", "melon")).toBe("rejected");
    expect(inv.count("melon")).toBe(1);
  });

  it("takes any N of M in a bundle and then closes", () => {
    const hall = openHall();
    const inv = new Inventory();
    const w = { money: 0 };
    const picks = [
      "daffodil",
      "leek",
      "dandelion",
      "horseradish",
      "salmonberry",
    ];
    for (const id of picks) inv.add(id);
    const results = picks.map((id) =>
      hall.handIn(inv, w, "spring-foraging", id),
    );
    expect(results).toEqual([
      "accepted",
      "accepted",
      "accepted",
      "completed",
      "rejected",
    ]);
    expect(inv.count("parsnip-seed")).toBe(15);
  });

  it("keeps progress through save and load, and reports all complete", () => {
    const hall = openHall();
    const inv = new Inventory();
    const w = { money: 0 };
    inv.add("parsnip");
    hall.handIn(inv, w, "spring-crops", "parsnip");
    const again = new Hall(
      undefined,
      JSON.parse(JSON.stringify(hall.save())),
      openRooms,
    );
    expect(again.handedIn("spring-crops")).toEqual(["parsnip"]);
    expect(again.allComplete).toBe(false);
    fillHall(again, inv, w);
    expect(again.allComplete).toBe(true);
  });
});

describe("Hall.problem", () => {
  const setup = () => {
    const hall = openHall();
    const inv = new Inventory();
    inv.add("parsnip");
    inv.add("daffodil");
    return { hall, inv, wallet: { money: 0 } };
  };

  it("is silent when the item would be taken", () => {
    const { hall, inv } = setup();
    expect(hall.problem(inv, "spring-crops", "parsnip")).toBeUndefined();
  });

  it("says why an item is refused", () => {
    const { hall, inv, wallet } = setup();
    expect(hall.problem(inv, "nope", "parsnip")).toMatch(/no such bundle/);
    expect(hall.problem(inv, "spring-crops", "daffodil")).toMatch(
      /does not take/,
    );
    expect(hall.problem(inv, "spring-crops", "potato")).toMatch(/do not have/);
    hall.handIn(inv, wallet, "spring-crops", "parsnip");
    inv.add("parsnip");
    expect(hall.problem(inv, "spring-crops", "parsnip")).toMatch(
      /already handed in/i,
    );
  });

  it("refuses everything once a bundle is done", () => {
    const { hall, inv, wallet } = setup();
    for (const id of ["parsnip", "potato", "cauliflower"]) {
      inv.add(id);
      hall.handIn(inv, wallet, "spring-crops", id);
    }
    inv.add("parsnip");
    expect(hall.problem(inv, "spring-crops", "parsnip")).toMatch(/done/);
  });
});

describe("rewardText", () => {
  it("names money and items", () => {
    const by = (id: string) => BUNDLES.find((b) => b.id === id)!;
    expect(rewardText(by("spring-crops"))).toBe("300g");
    expect(rewardText(by("spring-foraging"))).toBe("15 Parsnip seeds");
    expect(
      rewardText({
        ...by("spring-crops"),
        reward: { money: 5, item: { id: "leek", count: 2 } },
      }),
    ).toBe("5g and 2 Wild leek");
  });
});

describe("the soft gate", () => {
  it("opens only the Foragers' Shelf at the start", () => {
    const hall = new Hall();
    expect(hall.roomOpen("foragers-shelf")).toBe(true);
    expect(hall.roomOpen("larder")).toBe(false);
    expect(hall.openBundles.map((b) => b.room)).not.toContain("larder");
    const inv = new Inventory();
    inv.add("parsnip");
    expect(hall.problem(inv, "spring-crops", "parsnip")).toMatch(/not open/);
    expect(hall.handIn(inv, { money: 0 }, "spring-crops", "parsnip")).toBe(
      "rejected",
    );
  });

  it("opens the Larder after one bundle is done elsewhere", () => {
    const hall = new Hall();
    const inv = new Inventory();
    openLarder(hall, inv, { money: 0 });
    expect(hall.roomOpen("larder")).toBe(true);
    expect(hall.openBundles.map((b) => b.id)).toContain("spring-crops");
  });

  it("reads each room as ready, locked, empty or done", () => {
    const hall = new Hall();
    expect(hall.roomStatus("foragers-shelf")).toBe("ready");
    expect(hall.roomStatus("larder")).toBe("locked");
    expect(hall.gateRemaining("larder")).toBe(1);
    // The Hearth has the Smith's, and opens after two bundles elsewhere.
    expect(hall.roomStatus("hearth")).toBe("locked");
    // No bundles are written for the Water room yet, so it is never ready.
    expect(hall.roomStatus("water-room")).toBe("empty");
    const inv = new Inventory();
    openLarder(hall, inv, { money: 0 });
    expect(hall.roomStatus("larder")).toBe("ready");
    expect(hall.gateRemaining("larder")).toBe(0);
    expect(hall.bundlesIn("larder").map((b) => b.id)).toContain("spring-crops");
  });

  it("counts bundles finished in other rooms only", () => {
    const rooms = [
      { id: "a", name: "A", opensAfter: 0 },
      { id: "b", name: "B", opensAfter: 2 },
    ];
    const mk = (id: string, room: string): BundleDef =>
      normalizeBundle({
        id,
        name: id,
        room,
        hint: "h",
        items: ["leek"],
        reward: {},
      });
    const bundles = [mk("a1", "a"), mk("a2", "a"), mk("b1", "b")];
    const hall = new Hall(bundles, { a1: ["leek"] }, rooms);
    expect(hall.roomOpen("b")).toBe(false);
    const more = new Hall(bundles, { a1: ["leek"], a2: ["leek"] }, rooms);
    expect(more.roomOpen("b")).toBe(true);
    expect(more.roomComplete("a")).toBe(true);
    expect(more.roomComplete("b")).toBe(false);
  });
});

describe("counts, minimum quality and all-of rules", () => {
  const bundle = normalizeBundle({
    id: "t",
    name: "T",
    room: "foragers-shelf",
    hint: "h",
    items: [
      { id: "parsnip", count: 2, minQuality: "silver" },
      { id: "potato", count: 1 },
    ],
    reward: { furniture: "Oak stool" },
  });

  it("defaults to all goods, one each, any quality", () => {
    expect(bundle.required).toBe(2);
    const plain = normalizeBundle({
      ...bundle,
      items: ["leek"],
      required: undefined,
    });
    expect(plain.items).toEqual([
      { id: "leek", count: 1, minQuality: "normal" },
    ]);
  });

  it("needs the full count of each good, at the minimum quality", () => {
    const hall = new Hall([bundle], {}, openRooms);
    const inv = new Inventory();
    const w = { money: 0 };
    inv.add("parsnip", 1);
    inv.add("parsnip@silver", 1);
    inv.add("parsnip@gold", 1);
    inv.add("potato");
    expect(hall.problem(inv, "t", "parsnip")).toMatch(
      /silver quality or better/,
    );
    expect(hall.handIn(inv, w, "t", "parsnip@silver")).toBe("accepted");
    expect(hall.handedIn("t")).toEqual([]);
    expect(hall.have("t", "parsnip")).toBe(1);
    expect(hall.handIn(inv, w, "t", "potato")).toBe("accepted");
    expect(hall.complete("t")).toBe(false);
    expect(hall.handIn(inv, w, "t", "parsnip@gold")).toBe("completed");
    expect(hall.problem(inv, "t", "parsnip@gold")).toMatch(/done/);
  });

  it("names a furniture reward", () => {
    expect(rewardText(bundle)).toBe("Oak stool");
  });
});

describe("saves", () => {
  it("round-trips counts", () => {
    const hall = new Hall(
      [
        normalizeBundle({
          id: "t",
          name: "T",
          room: "larder",
          hint: "h",
          items: [{ id: "parsnip", count: 3 }],
          reward: {},
        }),
      ],
      { t: { parsnip: 2 } },
      openRooms,
    );
    expect(hall.save()).toEqual({ t: { parsnip: 2 } });
  });

  it("reads an old save, where a listed good counts as filled", () => {
    const hall = new Hall(
      [
        normalizeBundle({
          id: "t",
          name: "T",
          room: "larder",
          hint: "h",
          items: [{ id: "parsnip", count: 3 }],
          reward: {},
        }),
      ],
      { t: ["parsnip"] },
      openRooms,
    );
    expect(hall.have("t", "parsnip")).toBe(3);
    expect(hall.complete("t")).toBe(true);
  });
});

describe("rooms and the bridge", () => {
  it("lists all six rooms, with the Last Seat last and opening at 20", () => {
    expect(ROOMS.map((r) => r.id)).toEqual([
      "foragers-shelf",
      "larder",
      "water-room",
      "hearth",
      "guests-board",
      "last-seat",
    ]);
    expect(ROOMS.map((r) => r.opensAfter)).toEqual([0, 1, 1, 2, 3, 20]);
    expect(ROOMS.every((r) => r.unlock)).toBe(true);
  });

  it("reports finished rooms and mends the bridge with the Last Seat", () => {
    const mk = (id: string, room: string) =>
      normalizeBundle({
        id,
        name: id,
        room,
        hint: "h",
        items: ["leek"],
        reward: {},
      });
    const bundles = [mk("f1", "foragers-shelf"), mk("l1", LAST_ROOM)];
    const rooms = ROOMS.map((r) => ({ ...r, opensAfter: 0 }));
    const hall = new Hall(bundles, { f1: ["leek"] }, rooms);
    expect(hall.completedRooms.map((r) => r.id)).toEqual(["foragers-shelf"]);
    expect(hall.bridgeMended).toBe(false);
    const done = new Hall(bundles, { f1: ["leek"], l1: ["leek"] }, rooms);
    expect(done.bridgeMended).toBe(true);
  });
});

describe("the slice 1 hall", () => {
  const by = (id: string) => BUNDLES.find((b) => b.id === id)!;

  it("matches the pools in notes 16 and 35 for the new bundles", () => {
    expect(by("woodland").items).toEqual([
      { id: "wood", count: 50, minQuality: "normal" },
      { id: "stone", count: 50, minQuality: "normal" },
      { id: "fiber", count: 30, minQuality: "normal" },
    ]);
    expect(by("smiths").required).toBe(3);
    expect(by("smiths").items.map((i) => `${i.count} ${i.id}`)).toEqual([
      "5 copper-bar",
      "5 iron-bar",
      "3 gold-bar",
    ]);
    const quality = by("quality-crops");
    expect(quality.required).toBe(3);
    expect(
      quality.items.every((i) => i.count === 5 && i.minQuality === "silver"),
    ).toBe(true);
  });

  it("keeps keg goods out of the bundle that gives the keg", () => {
    const ids = by("artisan-goods").items.map((i) => i.id);
    expect(ids).not.toContain("wine");
    expect(ids).not.toContain("juice");
    expect(ids).not.toContain("mead");
    expect(by("artisan-goods").reward.item?.id).toBe("keg");
  });

  it("gives each bundle's reward item and teaches the machine recipe", () => {
    const machines: Record<string, string> = {
      "winter-foraging": "seed-maker",
      woodland: "charcoal-kiln",
      "autumn-crops": "bee-house",
      "quality-crops": "preserves-jar",
      "artisan-goods": "keg",
    };
    for (const [bundle, machine] of Object.entries(machines)) {
      expect(by(bundle).reward.item, bundle).toEqual({
        id: machine,
        count: 1,
      });
      expect(machineById(machine), machine).toBeDefined();
      const recipe = RECIPES.find((r) => r.id === machine)!;
      expect(
        recipe.sources.some((s) => s.kind === "bundle" && s.bundle === bundle),
        machine,
      ).toBe(true);
    }
    expect(by("smiths").reward.item).toEqual({ id: "coal", count: 20 });
  });

  it("can be finished from goods the two season calendar can supply", () => {
    // Every good must come from something that exists in spring or summer.
    const supplied = new Set<string>([
      "wood",
      "stone",
      "fiber",
      "copper-bar",
      "iron-bar",
      "gold-bar",
      ...CROPS.filter((c) => c.seasons.some((s) => SEASONS.includes(s))).map(
        (c) => c.id,
      ),
      ...FORAGE.filter((f) => f.seasons.some((s) => SEASONS.includes(s))).map(
        (f) => f.id,
      ),
      ...FRUIT_TREES.filter((t) =>
        (SEASONS as readonly string[]).includes(t.season),
      ).map((t) => t.id),
      "jam",
      "pickles",
      "honey",
    ]);
    for (const b of BUNDLES) {
      const fillable = b.items.filter((i) => supplied.has(i.id)).length;
      expect(fillable, `${b.id} needs ${b.required}`).toBeGreaterThanOrEqual(
        b.required,
      );
    }
  });

  it("finishes in file order, opening each room in turn", () => {
    const hall = new Hall();
    const inv = new Inventory();
    const wallet = { money: 0 };
    fillHall(hall, inv, wallet);
    expect(hall.allComplete).toBe(true);
    expect(hall.completedRooms.map((r) => r.id)).toEqual([
      "foragers-shelf",
      "larder",
      "hearth",
    ]);
    expect(inv.count("keg")).toBe(1);
    expect(inv.count("coal")).toBe(20);
  });
});

describe("bundle gold counts as earnings (SC-54)", () => {
  it("tells the caller the gold a finished bundle pays, once", () => {
    const hall = openHall();
    const bundle = hall.bundles.find((b) => b.reward.money)!;
    const wallet = { money: 0 };
    const inv = new Inventory();
    const told: number[] = [];
    let last: string | undefined;
    for (const item of bundle.items) {
      if (hall.complete(bundle.id)) break;
      const stack =
        item.minQuality === "normal"
          ? item.id
          : `${item.id}@${item.minQuality}`;
      for (let n = 0; n < item.count; n++) {
        inv.add(stack);
        last = hall.handIn(inv, wallet, bundle.id, stack, (g) => told.push(g));
      }
    }
    expect(last).toBe("completed");
    expect(told).toEqual([bundle.reward.money]);
    expect(wallet.money).toBe(bundle.reward.money);
  });
});
