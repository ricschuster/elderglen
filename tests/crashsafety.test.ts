import { describe, expect, it } from "vitest";
import { FarmCave } from "../src/core/cave";
import { removeCreature } from "../src/core/creature-defeat";
import type { Creature } from "../src/core/creatures";
import { safeSpawn } from "../src/core/maps";
import { deserialize, newGame, serialize } from "../src/core/save";

/** A saved game with the given fields of its JSON replaced. */
function patched(
  patch: (raw: Record<string, Record<string, unknown>>) => void,
): string {
  const g = newGame();
  g.farm.till(3, 3);
  g.farm.till(4, 3);
  const raw = JSON.parse(serialize(g));
  patch(raw);
  return JSON.stringify(raw);
}

describe("farm plots on load", () => {
  it("keeps good plots", () => {
    const back = deserialize(patched(() => {}))!;
    expect(back.farm.plotAt(3, 3)?.tilled).toBe(true);
    expect(back.farm.plotAt(4, 3)?.tilled).toBe(true);
  });

  it("drops bad plots and keeps the rest", () => {
    const back = deserialize(
      patched((raw) => {
        raw.farm!["x,y"] = { tilled: true, wateredToday: false };
        raw.farm!["5,5"] = null;
        raw.farm!["6,5"] = { tilled: true, wateredToday: "yes" };
        raw.farm!["7,5"] = {
          tilled: true,
          wateredToday: false,
          crop: { id: "no-such-crop", daysGrown: 1, harvests: 0 },
        };
        raw.farm!["8,5"] = {
          tilled: true,
          wateredToday: false,
          crop: { id: "parsnip", daysGrown: -2, harvests: 0 },
        };
        raw.farm!["9,5"] = { tilled: true, wateredToday: false, fertilizer: 4 };
      }),
    )!;
    expect(back).toBeDefined();
    expect([...back.farm.each()].map((p) => `${p.x},${p.y}`).sort()).toEqual([
      "3,3",
      "4,3",
    ]);
  });
});

describe("cave load", () => {
  const load = (data: unknown): FarmCave => {
    const c = new FarmCave();
    c.load(data as never);
    return c;
  };

  it("does not throw on corrupt arrays", () => {
    expect(() =>
      load({ fruit: [null, 7, "x", { id: 3 }, { id: "a", x: "q", y: 1 }] }),
    ).not.toThrow();
    expect(() => load({ fruit: "nope", boxes: [null, 1, "x"] })).not.toThrow();
    expect(() => load("junk")).not.toThrow();
    expect(() => load({ dehydrator: 5 })).not.toThrow();
  });

  it("drops bad fruit and keeps good fruit", () => {
    const c = load({
      fruit: [null, { id: "a", x: "q", y: 1 }, { id: "bat-fruit", x: 2, y: 3 }],
    });
    expect(c.fruitAt(2, 3)).toBe("bat-fruit");
    expect([...c.eachFruit()].length).toBe(1);
  });

  it("survives a full corrupt box list and a bad dehydrator", () => {
    const good = new FarmCave();
    const n = good.boxes.length;
    const c = load({
      boxes: Array.from({ length: n }, () => null),
      dehydrator: { output: 1 },
      earnings: "lots",
    });
    expect(c.boxes.length).toBe(n);
    expect(c.boxes[0]).toEqual({ days: 0, ready: undefined });
    expect(c.dehydrator).toBeUndefined();
    expect(c.earnings).toBe(0);
  });

  it("round-trips a valid save", () => {
    const c = new FarmCave();
    c.dehydrator = { output: "x", count: 2, doneAt: 9 };
    const back = load(c.save());
    expect(back.save()).toEqual(c.save());
  });
});

describe("a map an old save names", () => {
  const exists = (id: string) => id === "farm" || id === "house";

  it("keeps a map that exists", () => {
    const s = { map: "house", entry: "door", x: 2, y: 3 };
    expect(safeSpawn(s, exists, "farm")).toEqual({ spawn: s, replaced: false });
  });

  it("falls back to the farm start for a map that is gone", () => {
    const r = safeSpawn(
      { map: "old-barn", entry: "door", x: 2, y: 3 },
      exists,
      "farm",
    );
    expect(r.replaced).toBe(true);
    expect(r.spawn).toEqual({ map: "farm", entry: "start" });
  });
});

describe("a creature beaten with no floor state", () => {
  const c = { uid: 7 } as Creature;

  it("does nothing when the floor is missing", () => {
    expect(() => removeCreature(undefined, 7)).not.toThrow();
  });

  it("removes it from a floor that has it", () => {
    const floor = { creatures: [c, { uid: 8 } as Creature] };
    removeCreature(floor, 7);
    expect(floor.creatures.map((o) => o.uid)).toEqual([8]);
  });
});
