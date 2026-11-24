import { describe, expect, it } from "vitest";
import { DEEPMARK_KEY, HOMEWARD_PIN } from "../src/core/items";
import {
  animalRows,
  birthdayText,
  childRows,
  giftLogRows,
  guestMayOpen,
  hiddenTabs,
  skillExtras,
  playerRows,
  socialRows,
  socialTip,
  specialItems,
  unmetCount,
} from "../src/core/menupages";
import { HEART } from "../src/core/friendship";
import { newGame } from "../src/core/save";
import { VILLAGERS } from "../src/core/villagers";

const first = VILLAGERS[0]!.id;

describe("socialRows", () => {
  it("puts the spouse first and keeps the rest in roster order", () => {
    const g = newGame();
    const cands = VILLAGERS.filter((v) => v.candidate);
    const last = cands[cands.length - 1]!.id;
    g.friendship.meet(last);
    g.marriage.stage = "married";
    g.marriage.spouse = last;
    const rows = socialRows(g);
    expect(VILLAGERS[0]!.id).not.toBe(last);
    expect(rows[0]!.id).toBe(last);
    expect(rows[0]!.spouse).toBe(true);
    expect(rows.slice(1).map((r) => r.id)).toEqual(
      VILLAGERS.filter((v) => v.id !== last).map((v) => v.id),
    );
  });
  it("lists the whole roster in order, unmet as ???", () => {
    const g = newGame();
    const rows = socialRows(g);
    expect(rows.map((r) => r.id)).toEqual(VILLAGERS.map((v) => v.id));
    expect(rows.every((r) => !r.met && r.name === "???")).toBe(true);
    expect(rows.every((r) => r.hearts === 0 && r.maxHearts === 0)).toBe(true);
    expect(unmetCount(g)).toBe(VILLAGERS.length);
  });
  it("fills in a person once met, with today's doings", () => {
    const g = newGame();
    const day = g.day.clock.day;
    g.friendship.talk(first, day);
    const rows = socialRows(g);
    expect(rows).toHaveLength(VILLAGERS.length);
    expect(rows[0]!.met).toBe(true);
    expect(rows[0]!.name).toBe(VILLAGERS[0]!.name);
    expect(rows[0]!.talkedToday).toBe(true);
    expect(rows[0]!.giftedToday).toBe(false);
    expect(rows[0]!.relationship).toBe("friend");
    expect(rows[0]!.spouse).toBe(false);
    expect(rows[1]!.met).toBe(false);
    expect(unmetCount(g)).toBe(VILLAGERS.length - 1);
  });
  it("counts this week's gifts against the weekly rule", () => {
    const g = newGame();
    const day = g.day.clock.day;
    g.friendship.meet(first);
    expect(socialRows(g)[0]!.weekGifts).toBe(0);
    expect(socialRows(g)[0]!.weekGiftLimit).toBe(2);
    g.inventory.add("turnip", 1);
    g.friendship.gift(first, "turnip", day);
    expect(socialRows(g)[0]!.weekGifts).toBe(1);
    expect(socialRows(g)[0]!.giftedToday).toBe(true);
  });
  it("marks a spouse and a courted person", () => {
    const g = newGame();
    const cand = VILLAGERS.find((v) => v.candidate)!.id;
    g.friendship.meet(cand);
    g.marriage.stage = "courting";
    g.marriage.spouse = cand;
    const row = () => socialRows(g).find((r) => r.id === cand)!;
    expect(row().relationship).toBe("dating");
    expect(row().spouse).toBe(false);
    g.marriage.stage = "married";
    expect(row().relationship).toBe("spouse");
    expect(row().spouse).toBe(true);
  });
});

describe("childRows", () => {
  it("is empty without children and lists hearts when there are some", () => {
    const g = newGame();
    expect(childRows(g)).toEqual([]);
    g.marriage.kids.push({
      id: "child-1",
      name: "Pip",
      born: 1,
      points: 4 * HEART,
      talkDay: 0,
    });
    expect(childRows(g)).toEqual([{ id: "child-1", name: "Pip", hearts: 4 }]);
  });
});

describe("birthdayText", () => {
  it("names the season and day", () => {
    expect(birthdayText(first)).toMatch(/^(Spring|Summer|Fall|Winter) \d+$/);
    expect(birthdayText("nobody")).toBe("");
  });
});

describe("giftLogRows", () => {
  it("names the items and their tastes, in name order", () => {
    const g = newGame();
    g.friendship.meet(first);
    g.inventory.add("turnip", 1);
    g.friendship.gift(first, "turnip", g.day.clock.day);
    const rows = giftLogRows(g, first);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.item.length).toBeGreaterThan(0);
  });
});

describe("animalRows and tabs", () => {
  it("is empty and hides the tab with no animals or horse", () => {
    const g = newGame();
    expect(animalRows(g)).toEqual([]);
    expect(hiddenTabs(g)).toContain("animals");
  });
  it("shows the horse once the stable stands", () => {
    const g = newGame();
    g.animals.stableBuilt = true;
    expect(animalRows(g)).toEqual([{ name: "Not named yet", kind: "Horse" }]);
    expect(hiddenTabs(g)).not.toContain("animals");
  });
  it("shows hearts and petting for a farm animal", () => {
    const g = newGame();
    g.animals.animals.push({
      id: 1,
      species: "chicken",
      name: "Hen",
      age: 5,
      friendship: 430,
      mood: 128,
      fed: true,
      petted: true,
      outside: false,
      fresh: false,
      lay: 0,
      grazed: false,
    });
    const [row] = animalRows(g);
    expect(row).toMatchObject({
      name: "Hen",
      hearts: 2,
      maxHearts: 5,
      petted: true,
    });
  });
});

describe("specialItems", () => {
  it("is empty at first and hides the tab", () => {
    const g = newGame();
    expect(specialItems(g)).toEqual([]);
    expect(hiddenTabs(g)).toContain("special");
  });
  it("lists keys held and the catalogue", () => {
    const g = newGame();
    g.inventory.add(HOMEWARD_PIN, 1);
    g.inventory.add(DEEPMARK_KEY, 1);
    g.catalogue = true;
    expect(specialItems(g).map((s) => s.id)).toEqual([
      HOMEWARD_PIN,
      DEEPMARK_KEY,
      "catalogue",
    ]);
    expect(hiddenTabs(g)).not.toContain("special");
  });
});

describe("skillExtras", () => {
  it("shows the farmhouse always, and the rest when they exist", () => {
    const g = newGame();
    expect(skillExtras(g)).toEqual(["Farmhouse upgrade: 0 of 3"]);
    g.mines.deepest = 12;
    g.elderfruit = 2;
    expect(skillExtras(g)).toHaveLength(3);
  });
});

describe("socialTip", () => {
  it("only says unmet for a stranger", () => {
    const g = newGame();
    const tip = socialTip(g, socialRows(g)[0]!);
    expect(tip.name).toBe("???");
    expect(tip.text).toContain("not met");
  });
  it("shows hearts, gifts this week, talk and likes learned", () => {
    const g = newGame();
    const day = g.day.clock.day;
    g.friendship.meet(first);
    const row = () => socialRows(g).find((r) => r.id === first)!;
    let tip = socialTip(g, row());
    expect(tip.kind).toBe("Friend");
    expect(tip.text).toContain("Hearts: 0 of");
    expect(tip.text).toContain("Gifts this week: 0 of 2.");
    expect(tip.text).toContain("Talked today: no.");
    expect(tip.text).toContain("No loves or likes learned yet.");
    g.friendship.talk(first, day);
    g.inventory.add("turnip", 1);
    g.friendship.gift(first, "turnip", day);
    tip = socialTip(g, row());
    expect(tip.text).toContain("Talked today: yes.");
    expect(tip.text).toContain("Gifts this week: 1 of 2 (one today).");
    const taste = g.friendship.giftLog(first)["turnip"];
    if (taste === "love" || taste === "like")
      expect(tip.text).toContain("Likes known: Turnip");
    else expect(tip.text).toContain("No loves or likes learned yet.");
  });
});

describe("guest read-only menus", () => {
  it("hides tabs that change state and allows only read-only and intent screens", () => {
    const g = newGame();
    const hidden = hiddenTabs(g, true);
    for (const t of ["pack", "animals", "special"]) expect(hidden).toContain(t);
    // Crafting sends craft intents (note 108 group 2), so its tab is open to a guest.
    expect(hidden).not.toContain("crafting");
    expect(hiddenTabs(g)).not.toContain("pack");
    expect(guestMayOpen("menu")).toBe(true);
    expect(guestMayOpen("shop")).toBe(true);
    expect(guestMayOpen("bin")).toBe(true);
    for (const k of ["crafting", "cooking", "furnace"])
      expect(guestMayOpen(k)).toBe(true);
    for (const k of ["keeper", "coop-bench", "barn-bench", "pond"])
      expect(guestMayOpen(k)).toBe(true);
    for (const k of ["hall", "orders", "requests"])
      expect(guestMayOpen(k)).toBe(true);
    for (const k of ["carpenter", "tailor", "smith", "smithy", "gallery"])
      expect(guestMayOpen(k)).toBe(true);
    expect(guestMayOpen("shrine")).toBe(true);
    // Still host only: combat, the mine hall, travel, mail and the hat box.
    for (const k of ["trainer", "walllist", "cart", "mailbox", "hats"])
      expect(guestMayOpen(k)).toBe(false);
  });
});

import { newPlayerMarriageBook } from "../src/core/playermarriage";

describe("playerRows", () => {
  it("lists the other players in order and skips the local one", () => {
    const rows = playerRows(
      [
        { id: "p1", name: "Host" },
        { id: "p2", name: "Ana" },
        { id: "p3", name: "Bo" },
      ],
      "p1",
    );
    expect(rows).toEqual([
      { id: "p2", name: "Ana", slot: 2 },
      { id: "p3", name: "Bo", slot: 3 },
    ]);
  });
  const who = [
    { id: "p1", name: "Host" },
    { id: "p2", name: "Ana" },
    { id: "p3", name: "Bo" },
  ];
  it("tags a player married to a villager", () => {
    const rows = playerRows(who, "p1", {
      villagerOf: (id) =>
        id === "p2" ? { stage: "married", name: "Mara" } : undefined,
    });
    expect(rows[0]!.tag).toBe("Married to Mara");
    expect(rows[1]!.tag).toBeUndefined();
  });
  it("tags an engaged and a married player pair", () => {
    const book = newPlayerMarriageBook();
    book.bonds.push({
      proposer: "p2",
      other: "p3",
      stage: "engaged",
      weddingDay: 9,
    });
    let rows = playerRows(who, "p1", { book });
    expect(rows.map((r) => r.tag)).toEqual(["Engaged to Bo", "Engaged to Ana"]);
    book.bonds[0]!.stage = "married";
    rows = playerRows(who, "p1", { book });
    expect(rows.map((r) => r.tag)).toEqual(["Married to Bo", "Married to Ana"]);
  });
  it("names the viewer as you, and ignores a bare proposal", () => {
    const book = newPlayerMarriageBook();
    book.bonds.push({
      proposer: "p1",
      other: "p2",
      stage: "married",
      weddingDay: 3,
    });
    book.bonds.push({
      proposer: "p3",
      other: "p4",
      stage: "proposed",
      weddingDay: 0,
    });
    const rows = playerRows([...who, { id: "p4", name: "Cy" }], "p1", { book });
    expect(rows.map((r) => r.id)).toEqual(["p2", "p3", "p4"]);
    expect(rows[0]!.tag).toBe("Married to you");
    expect(rows[1]!.tag).toBeUndefined();
  });
  it("is empty alone", () => {
    expect(playerRows([], "p1")).toEqual([]);
  });
});
