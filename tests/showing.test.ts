import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS, dateOf } from "../src/core/calendar";
import { festivalLayout } from "../src/core/festivalroutes";
import {
  buyAtCounter,
  counterProblem,
  enterFestival,
  festivalOn,
  FESTIVALS,
} from "../src/core/festivals";
import {
  MAZE,
  MAZE_EVEN,
  mazeForYear,
  nicheLine,
  atChest,
  cellAt,
  chestOpened,
  lineAt,
  mazeChest,
  mazeHeight,
  mazeStart,
  mazeWidth,
  openChest,
  sackValue,
  step,
  walkable,
  type Cell,
} from "../src/core/maze";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  PLACES,
  ROSETTE_HAT,
  TABLE_SIZE,
  groupOf,
  judge,
  judgeProblem,
  placeOf,
  scoreTable,
  showTokens,
  valuePoints,
  MAX_ITEM_VALUE,
  SHOW_GROUPS,
} from "../src/core/showing";
import { FISH } from "../src/core/fishing";
import { dailyStock } from "../src/core/furniture";

const fishId = FISH[0]!.id;
const dayOf = (season: string, d: number) =>
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON + d;

describe("fall and winter festival data", () => {
  it("has the four festivals on the dates in note 14", () => {
    expect(festivalOn("fall", 9)?.id).toBe("harvest-showing");
    expect(festivalOn("fall", 21)?.id).toBe("hollow-eve");
    expect(festivalOn("winter", 8)?.id).toBe("frostday");
    expect(festivalOn("winter", 25)?.id).toBe("midwinter-feast");
  });

  it("opens Hollow Eve at 8 pm and sends the player home at midnight", () => {
    const f = festivalOn("fall", 21)!;
    expect([f.opens, f.closes, f.ends]).toEqual([1200, 1410, 1440]);
  });

  it("keeps festival furniture out of the carpenter's stock", () => {
    for (let d = 1; d < 60; d++)
      for (const f of dailyStock(d)) expect(f.festival, f.id).toBeUndefined();
  });

  it("gives every festival with an activity what it needs", () => {
    for (const f of FESTIVALS) {
      if (f.activity === "sights") expect(f.sights?.length).toBeGreaterThan(0);
    }
  });
});

describe("the Harvest Showing", () => {
  it("scores a full table of top goods in five groups (no dishes yet)", () => {
    // Artisan, forage, fruit, vegetable, mineral, plus filler at gold quality.
    const table = [
      "melon-wine@gold",
      "hazelnut@gold",
      "melon@gold",
      "pumpkin@gold",
      "gold-bar@gold",
      "melon@gold",
      "pumpkin@gold",
      "pumpkin@gold",
      "pumpkin@gold",
    ];
    const s = scoreTable(table);
    expect(s.items).toBe(9);
    expect(s.categories).toBe(25); // five groups here (no dish yet)
    expect(s.total).toBe(14 + 9 + 25 + s.value);
    expect(s.value).toBeLessThanOrEqual(54);
  });

  it("gives an empty table minus 9 items points and a full table 9", () => {
    expect(scoreTable([]).items).toBe(-9);
    expect(scoreTable(Array(TABLE_SIZE).fill("parsnip")).items).toBe(9);
  });

  it("scores value by price band and quality, up to 6 an item", () => {
    expect(valuePoints("no-such-item")).toBe(0);
    expect(valuePoints("parsnip")).toBe(2); // 35g, band 20+, normal
    expect(valuePoints("parsnip@gold")).toBe(4); // 52g, band 20+, gold
    expect(valuePoints("melon")).toBe(4); // 250g, band 200+, normal
    expect(valuePoints("pumpkin@gold")).toBe(6); // 480g, band 400+
    for (const id of ["gold-bar@gold", "melon-wine@gold", "pumpkin@silver"])
      expect(valuePoints(id)).toBeLessThanOrEqual(MAX_ITEM_VALUE);
  });

  it("has eight groups and fills the mark at six", () => {
    expect(SHOW_GROUPS.length).toBe(8);
    const six = [
      "melon-wine",
      "hazelnut",
      "apple",
      "parsnip",
      "iron-bar",
      "egg",
    ];
    expect(scoreTable(six).categories).toBe(30);
    expect(scoreTable([...six, "wood"]).categories).toBe(30);
  });

  it("sorts goods into the groups, fish and animal goods included", () => {
    expect(groupOf("egg")).toBe("animal");
    expect(groupOf("wool@silver")).toBe("animal");
    expect(groupOf("milk")).toBe("animal");
    expect(groupOf(fishId)).toBe("fish");
    expect(groupOf("arctic-char-roe")).toBeUndefined(); // roe is not shown

    expect(groupOf("melon-wine")).toBe("artisan");
    expect(groupOf("hazelnut")).toBe("forage");
    expect(groupOf("apple")).toBe("fruit");
    expect(groupOf("tomato")).toBe("fruit");
    expect(groupOf("parsnip@silver")).toBe("vegetable");
    expect(groupOf("iron-bar")).toBe("mineral");
    expect(groupOf("wood")).toBeUndefined();
  });

  it("places by points", () => {
    expect(placeOf(77).place).toBe(1);
    expect(placeOf(76).place).toBe(2);
    expect(placeOf(64).place).toBe(2);
    expect(placeOf(51).place).toBe(3);
    expect(placeOf(-9).place).toBe(4);
    expect(PLACES.map((p) => p.tokens)).toEqual([1000, 500, 250, 50]);
  });

  it("judges only goods in the pack, once a year, and keeps the goods", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 9);
    expect(judgeProblem(g, [])).toMatch(/table first/);
    expect(judgeProblem(g, ["parsnip"])).toMatch(/do not have/);
    expect(judgeProblem(g, ["wood"])).toMatch(/cannot be shown/);
    g.inventory.add("parsnip", 2);
    const r = judge(g, ["parsnip", "parsnip"]);
    expect(r?.place.place).toBe(4);
    expect(showTokens(g)).toBe(50);
    expect(g.inventory.count("parsnip")).toBe(2);
    expect(judgeProblem(g, ["parsnip"])).toMatch(/already/);
    expect(judge(g, ["parsnip"])).toBeUndefined();
  });

  it("gives the rosette hat for first place", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 9);
    const goods = [
      "pumpkin@gold",
      "pumpkin@gold",
      "pumpkin@gold",
      "cave-mushroom@gold",
      "gold-bar@gold",
      "melon-wine@gold",
      "melon@gold",
      "apple@gold",
      "melon@gold",
    ];
    for (const id of goods) g.inventory.add(id);
    const r = judge(g, goods);
    expect(r?.place.place).toBe(1);
    expect(g.wardrobe.has(ROSETTE_HAT)).toBe(true);
    expect(g.inventory.count("blue-ribbon-melon")).toBe(1);
    expect(showTokens(g)).toBe(1000);
  });

  it("loses tokens when the year turns, and saves them", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 9);
    g.inventory.add("parsnip");
    judge(g, ["parsnip"]);
    expect(showTokens(deserialize(serialize(g))!)).toBe(50);
    g.day.clock.day = dayOf("fall", 9) + 4 * DAYS_PER_SEASON;
    expect(showTokens(g)).toBe(0);
  });

  it("buys from the prize counter in tokens, not gold", () => {
    const g = newGame();
    const f = festivalOn("fall", 9)!;
    g.day.clock.day = dayOf("fall", 9);
    g.day.clock.minutes = f.opens;
    enterFestival(g);
    const seed = f.counter.find((e) => e.count)!;
    expect(counterProblem(g, f, seed)).toMatch(/show tokens/);
    g.showTokens = { year: 1, count: 1000 };
    g.money = 0;
    expect(buyAtCounter(g, f, seed)).toBe(true);
    expect(g.inventory.count(seed.item!)).toBe(seed.count);
    expect(showTokens(g)).toBe(1000 - seed.price);
    expect(g.money).toBe(0);
  });
});

describe("the Hollow Eve maze", () => {
  const reach = () => {
    const seen = new Set<string>();
    const queue: Cell[] = [mazeStart()];
    while (queue.length > 0) {
      const c = queue.pop()!;
      const k = `${c.x},${c.y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (walkable(n.x, n.y) || atChest(n)) queue.push(n);
      }
    }
    return seen;
  };

  it("has a rectangular layout with a way from the start to the chest", () => {
    for (const row of MAZE.rows) expect(row.length).toBe(mazeWidth());
    expect(MAZE.rows.length).toBe(mazeHeight());
    const e = mazeChest();
    expect(reach().has(`${e.x},${e.y}`)).toBe(true);
  });

  it("is harmless: walls and scares block, scares only speak when near", () => {
    const start = mazeStart();
    expect(step(start, -1, 0)).toBe(start);
    const scare = Object.keys(MAZE.scares)[0]!;
    let near: Cell | undefined;
    for (let y = 0; y < mazeHeight() && !near; y++)
      for (let x = 0; x < mazeWidth(); x++)
        if (walkable(x, y) && lineAt(x, y) === MAZE.scares[scare])
          near = { x, y };
    expect(near).toBeDefined();
    expect(cellAt(0, 0)).toBe("#");
  });

  it("every scare can be walked up to", () => {
    const seen = reach();
    for (const key of [
      ...Object.keys(MAZE.scares),
      ...Object.keys(MAZE.talkers),
    ]) {
      const hasNeighbour = MAZE.rows.some((row, y) =>
        [...row].some(
          (c, x) =>
            c === key &&
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].some(([dx, dy]) => seen.has(`${x + dx!},${y + dy!}`)),
        ),
      );
      expect(hasNeighbour, key).toBe(true);
    }
  });

  it("gives the hat first, then a sack worth about 500g, once a year", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 21);
    expect(openChest(g)).toMatch(/Lantern Hood/);
    expect(g.wardrobe.has(MAZE.chestHat!)).toBe(true);
    expect(chestOpened(g)).toBe(true);
    expect(openChest(g)).toMatch(/empty/);
    g.day.clock.day += 8 * DAYS_PER_SEASON;
    expect(chestOpened(g)).toBe(false);
    expect(openChest(g)).toMatch(/sack/);
    expect(g.inventory.count("hazelnut")).toBe(3);
    expect(sackValue()).toBeGreaterThanOrEqual(450);
    expect(sackValue()).toBeLessThanOrEqual(600);
  });

  it("gives a lantern the first even year, then a sack worth about 800g", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 21) + 4 * DAYS_PER_SEASON;
    expect(dateOf(g.day.clock.day).year).toBe(2);
    expect(openChest(g)).toMatch(/hollow lantern/);
    expect(g.inventory.count("hollow-lantern")).toBe(1);
    expect(g.wardrobe.has("lantern-hood")).toBe(false);
    expect(openChest(g)).toMatch(/empty/);
    g.day.clock.day += 8 * DAYS_PER_SEASON;
    expect(dateOf(g.day.clock.day).year).toBe(4);
    expect(openChest(g)).toMatch(/sack/);
    expect(g.inventory.count("hollow-lantern")).toBe(1);
    expect(g.inventory.count("hazelnut")).toBe(4);
    expect(g.inventory.count("pumpkin")).toBe(1);
    expect(sackValue(MAZE_EVEN)).toBeGreaterThanOrEqual(750);
    expect(sackValue(MAZE_EVEN)).toBeLessThanOrEqual(850);
    expect(sackValue(MAZE_EVEN)).toBeGreaterThan(sackValue() * 1.4);
    expect(mazeForYear(1)).toBe(MAZE);
    expect(mazeForYear(2)).toBe(MAZE_EVEN);
    expect(mazeForYear(3)).toBe(MAZE);
  });

  it("keeps the odd-year hat once and the lantern separate from it", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 21);
    expect(openChest(g)).toMatch(/Lantern Hood/);
    g.day.clock.day += 4 * DAYS_PER_SEASON;
    expect(openChest(g)).toMatch(/hollow lantern/);
    expect(g.inventory.count("hollow-lantern")).toBe(1);
  });

  describe("the even-year maze", () => {
    const M = MAZE_EVEN;
    const at = (x: number, y: number) => M.rows[y]?.[x] ?? "#";
    const find = (ch: string) => {
      const y = M.rows.findIndex((r) => r.includes(ch));
      return { x: M.rows[y]!.indexOf(ch), y };
    };
    const reach = (open: boolean) => {
      const s = find("S");
      const seen = new Map<string, number>([[`${s.x},${s.y}`, 0]]);
      const q = [s];
      for (let i = 0; i < q.length; i++) {
        const c = q[i]!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const n = { x: c.x + dx, y: c.y + dy };
          const ch = at(n.x, n.y);
          const gap = open && n.x === M.gap.x && n.y === M.gap.y;
          const wall =
            (ch === "#" && !gap) || ch in M.scares || ch in M.talkers;
          if (wall || seen.has(`${n.x},${n.y}`)) continue;
          seen.set(`${n.x},${n.y}`, seen.get(`${c.x},${c.y}`)! + 1);
          q.push(n);
        }
      }
      const e = find("E");
      return seen.get(`${e.x},${e.y}`);
    };

    it("is larger than the odd-year maze, rectangular and walled all round", () => {
      expect(M.rows.length).toBeGreaterThan(MAZE.rows.length);
      expect(M.rows[0]!.length).toBeGreaterThan(MAZE.rows[0]!.length);
      for (const r of M.rows) expect(r.length).toBe(M.rows[0]!.length);
      for (let x = 0; x < M.rows[0]!.length; x++) {
        expect(at(x, 0)).toBe("#");
        expect(at(x, M.rows.length - 1)).toBe("#");
      }
      for (let y = 0; y < M.rows.length; y++) {
        expect(at(0, y)).toBe("#");
        expect(at(M.rows[0]!.length - 1, y)).toBe("#");
      }
    });

    it("lets you reach the chest with the scares in place, the gap only a shortcut", () => {
      expect(at(M.gap.x, M.gap.y)).toBe("#");
      expect(reach(false)).toBeDefined();
      expect(reach(true)!).toBeLessThan(reach(false)!);
    });

    it("has every scare and talker once, with a line, and no scare walling anyone off", () => {
      for (const k of [...Object.keys(M.scares), ...Object.keys(M.talkers)]) {
        expect(M.rows.join("").split(k).length - 1, k).toBe(1);
      }
      // Every corridor tile (not a scare) is still reachable from the start.
      const s = find("S");
      const seen = new Set([`${s.x},${s.y}`]);
      const q = [s];
      for (let i = 0; i < q.length; i++) {
        const c = q[i]!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const n = { x: c.x + dx, y: c.y + dy };
          const ch = at(n.x, n.y);
          if (
            ch === "#" ||
            ch in M.scares ||
            ch in M.talkers ||
            seen.has(`${n.x},${n.y}`)
          )
            continue;
          seen.add(`${n.x},${n.y}`);
          q.push(n);
        }
      }
      const open = M.rows.join("").replace(/[#abcdv]/g, "").length;
      expect(seen.size).toBe(open);
    });
  });

  it("has one placeholder line for every villager at Hollow Eve", () => {
    const layout = festivalLayout(
      FESTIVALS.find((f) => f.id === "hollow-eve")!,
    )!;
    for (const id of Object.keys(layout.spots))
      expect(nicheLine(id), id).toMatch(/\S/);
    expect(nicheLine("nobody")).toBeUndefined();
  });

  it("keeps the chest shut while the pack is too full for the sack", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 21);
    g.wardrobe.add(MAZE.chestHat!);
    while (g.inventory.add("wood", 50)) continue;
    while (g.inventory.add("sap", 1)) continue;
    expect(openChest(g)).toMatch(/too full/);
    expect(chestOpened(g)).toBe(false);
  });
});
