import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, checkAchievements } from "../src/core/achievements";
import { ringProgress } from "../src/core/completion";
import { SOURCE_FLAGS } from "../src/core/elderfruit";
import {
  ARTIFACT_REWARDS,
  GALLERY_ARTIFACTS,
  GALLERY_IDS,
  GALLERY_LIST,
  GALLERY_MINERALS,
  GALLERY_SETS,
  GALLERY_TOTAL,
  MINERAL_REWARDS,
  TOTAL_REWARDS,
  canDonate,
  claimRewards,
  claimable,
  donate,
  donatedCount,
  galleryCount,
  placeOnShelf,
  shelf,
  slotOf,
} from "../src/core/gallery";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { hasFlag } from "../src/core/worldflags";
import type { GameState } from "../src/core/save";

/** Give the pack a copy and donate it, as the screen does. */
function give(g: GameState, id: string) {
  g.inventory.add(id);
  return donate(g, id);
}
const donateMany = (g: GameState, ids: string[]) =>
  ids.forEach((id) => expect(give(g, id).ok).toBe(true));

describe("gallery list", () => {
  it("is derived from data: 95 items, 53 minerals and 42 artifacts", () => {
    expect(GALLERY_TOTAL).toBe(95);
    expect(GALLERY_MINERALS).toBe(53);
    expect(GALLERY_ARTIFACTS).toBe(42);
  });
  it("has unique ids that are all real items", () => {
    expect(new Set(GALLERY_IDS).size).toBe(GALLERY_TOTAL);
    for (const id of GALLERY_IDS) expect(itemById(id), id).toBeDefined();
  });
  it("counts partial progress for the completion total, rounded down", () => {
    const g = newGame();
    expect(galleryCount(g)).toMatchObject({ done: 0, total: 95 });
    donateMany(g, GALLERY_IDS.slice(0, 19));
    const cat = ringProgress(g)[0]!.categories.find((c) => c.id === "gallery")!;
    expect(cat.locked).toBe(false);
    expect(cat.done).toBe(19);
    expect(cat.points).toBeCloseTo(1, 5);
    expect(cat.missing).toHaveLength(76);
  });
});

describe("donation", () => {
  it("takes one copy from the pack, once", () => {
    const g = newGame();
    const id = GALLERY_IDS[0]!;
    g.inventory.add(id, 2);
    expect(canDonate(g, id)).toBe(true);
    expect(donate(g, id).ok).toBe(true);
    expect(g.inventory.count(id)).toBe(1);
    expect(canDonate(g, id)).toBe(false);
    expect(donate(g, id).ok).toBe(false);
    expect(g.inventory.count(id)).toBe(1);
    expect(donatedCount(g)).toBe(1);
  });
  it("refuses an item that is not held or not on the list", () => {
    const g = newGame();
    expect(donate(g, GALLERY_IDS[3]!).ok).toBe(false);
    g.inventory.add("parsnip");
    expect(donate(g, "parsnip").ok).toBe(false);
    expect(donatedCount(g)).toBe(0);
  });
  it("takes a copy of any quality", () => {
    const g = newGame();
    const id = GALLERY_IDS[1]!;
    g.inventory.add(`${id}@gold`);
    expect(donate(g, id).ok).toBe(true);
    expect(g.inventory.count(`${id}@gold`)).toBe(0);
  });
});

describe("shelf arrangement", () => {
  it("defaults to list order and lets a donated item move to any slot", () => {
    const g = newGame();
    const [a, b] = [GALLERY_IDS[0]!, GALLERY_IDS[1]!];
    donateMany(g, [a, b]);
    expect(slotOf(g, a)).toBe(0);
    expect(shelf(g)[2]!.ghost).toBe(GALLERY_IDS[2]);
    expect(placeOnShelf(g, a, 50).ok).toBe(true);
    expect(shelf(g)[50]!.id).toBe(a);
    expect(shelf(g)[0]!.id).toBeUndefined();
    // Moving onto an occupied slot swaps.
    expect(placeOnShelf(g, b, 50).ok).toBe(true);
    expect(shelf(g)[50]!.id).toBe(b);
    expect(shelf(g)[1]!.id).toBe(a);
  });
  it("refuses undonated items and bad slots", () => {
    const g = newGame();
    expect(placeOnShelf(g, GALLERY_IDS[0]!, 3).ok).toBe(false);
    donateMany(g, [GALLERY_IDS[0]!]);
    expect(placeOnShelf(g, GALLERY_IDS[0]!, 95).ok).toBe(false);
    expect(placeOnShelf(g, GALLERY_IDS[0]!, -1).ok).toBe(false);
  });
});

describe("rewards", () => {
  it("every reward item exists", () => {
    for (const r of [
      ...TOTAL_REWARDS,
      ...MINERAL_REWARDS,
      ...ARTIFACT_REWARDS,
      ...GALLERY_SETS.map((s) => s.reward),
    ])
      if (r.item) expect(itemById(r.item), r.item).toBeDefined();
  });
  it("pays a threshold once", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 5));
    const before = g.inventory.count("parsnip-seed");
    expect(claimRewards(g).paid).toContain("A packet of seeds");
    expect(g.inventory.count("parsnip-seed")).toBe(before + 5);
    expect(claimRewards(g).paid).toEqual([]);
    expect(g.inventory.count("parsnip-seed")).toBe(before + 5);
  });
  it("counts mineral and artifact tiers by group", () => {
    const g = newGame();
    const arts = GALLERY_LIST.filter((e) => e.group === "artifact").map(
      (e) => e.id,
    );
    donateMany(g, arts.slice(0, 5));
    const keys = claimable(g).map((r) => r.key);
    expect(keys).toContain("artifact:5");
    expect(keys).toContain("all:5");
    expect(keys).not.toContain("mineral:11");
  });
  it("awards a set when every piece is donated", () => {
    const g = newGame();
    const set = GALLERY_SETS[0]!;
    donateMany(g, set.items);
    expect(claimable(g).map((r) => r.key)).toContain(`set:${set.id}`);
  });
  it("holds a reward while the pack is full, then pays it", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 5));
    // Fill every free slot with a different undonated gallery item.
    for (const id of GALLERY_IDS.slice(5)) if (!g.inventory.add(id)) break;
    const res = claimRewards(g);
    expect(res.held).toContain("A packet of seeds");
    expect(g.galleryClaimed ?? []).not.toContain("all:5");
    // Make room and collect it.
    const first = g.inventory.slot(0)!;
    g.inventory.remove(first.id, first.count);
    expect(claimRewards(g).paid).toContain("A packet of seeds");
    expect(g.galleryClaimed).toContain("all:5");
  });
});

describe("wiring", () => {
  it("fires the donate 40 achievement at 40 and the full one at 95", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 39));
    expect(checkAchievements(g).map((a) => a.kind)).not.toContain("donate");
    donateMany(g, GALLERY_IDS.slice(39, 40));
    expect(checkAchievements(g).map((a) => a.kind)).toContain("donate");
    donateMany(g, GALLERY_IDS.slice(40));
    expect(checkAchievements(g).map((a) => a.kind)).toContain("donateAll");
    expect(
      ACHIEVEMENTS.filter((a) => a.kind === "donate" || a.kind === "donateAll"),
    ).toHaveLength(2);
  });
  it("pays elderfruit source 7 once, at the full list", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 94));
    expect(g.elderfruit).toBe(0);
    expect(hasFlag(g, SOURCE_FLAGS.gallery)).toBe(false);
    expect(give(g, GALLERY_IDS[94]!)).toMatchObject({ ok: true, fruit: true });
    expect(g.elderfruit).toBe(1);
    expect(hasFlag(g, SOURCE_FLAGS.gallery)).toBe(true);
    expect(give(g, GALLERY_IDS[94]!).ok).toBe(false);
    expect(g.elderfruit).toBe(1);
  });
});

describe("save", () => {
  it("round trips donations, placements and claims", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 12));
    placeOnShelf(g, GALLERY_IDS[0]!, 70);
    claimRewards(g);
    const back = deserialize(serialize(g, { kind: "night" }))!;
    expect(back.gallery).toEqual(g.gallery);
    expect(back.galleryPlaced).toEqual(g.galleryPlaced);
    expect(back.galleryClaimed).toEqual(g.galleryClaimed);
    expect(back.galleryClaimed?.length).toBeGreaterThan(0);
  });
  it("loads an old save with none of the fields", () => {
    const g = newGame();
    const raw = JSON.parse(serialize(g, { kind: "night" }));
    expect(raw.gallery).toBeUndefined();
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.gallery).toBeUndefined();
    expect(donatedCount(back)).toBe(0);
  });
  it("drops unknown ids and bad slots on load", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS.slice(0, 2));
    const raw = JSON.parse(serialize(g, { kind: "night" }));
    raw.gallery.push("not-an-item", 4);
    raw.galleryPlaced = { [GALLERY_IDS[0]!]: 9999, junk: 3 };
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.gallery).toEqual(GALLERY_IDS.slice(0, 2));
    expect(back.galleryPlaced).toBeUndefined();
  });
  it("keeps the elderfruit flag and count across a round trip", () => {
    const g = newGame();
    donateMany(g, GALLERY_IDS);
    const back = deserialize(serialize(g, { kind: "night" }))!;
    expect(back.elderfruit).toBe(1);
    expect(hasFlag(back, SOURCE_FLAGS.gallery)).toBe(true);
  });
});
