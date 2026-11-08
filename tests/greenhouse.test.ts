import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { act, useHeld } from "../src/core/tools";
import { CROPS, cropById } from "../src/core/crops";
import { DAYS_PER_SEASON } from "../src/core/calendar";
import { Farm } from "../src/core/farm";
import {
  GREENHOUSE_MAP,
  GREENHOUSE_OPEN,
  GREENHOUSE_SITE,
  greenhouseHolds,
  greenhouseRepaired,
} from "../src/core/greenhouse";
import { exitOpen } from "../src/core/map";
import { seedId } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { fillBundle } from "./hall-helpers";

const spring = CROPS.find(
  (c) =>
    c.seasons.length === 1 &&
    c.seasons[0] === "spring" &&
    c.regrowDays === undefined,
)!;
const regrower = CROPS.find((c) => c.regrowDays !== undefined)!;
const WINTER_DAY = 3 * DAYS_PER_SEASON + 5;
const house = () => maps.get(GREENHOUSE_MAP);

describe("the greenhouse map", () => {
  it("is an indoor map with a 12 by 10 soil plot and a door to the farm", () => {
    const m = house();
    expect(m.indoors).toBe(true);
    expect(m.tillableTiles()).toHaveLength(120);
    expect(m.exits.find((e) => e.id === "door")).toMatchObject({
      map: "farm",
      entry: "from_greenhouse",
    });
    expect(maps.problems()).toEqual([]);
  });

  it("has a gated door on both farm types, under the ruin footprint", () => {
    for (const id of ["farm", "farm-woodland"]) {
      const m = maps.get(id);
      const e = m.exits.find((x) => x.id === "greenhouse")!;
      expect(e).toMatchObject({
        map: GREENHOUSE_MAP,
        requires: GREENHOUSE_OPEN,
      });
      expect(e.x).toBeGreaterThanOrEqual(GREENHOUSE_SITE.x);
      expect(e.x).toBeLessThan(GREENHOUSE_SITE.x + GREENHOUSE_SITE.w);
      expect(e.y).toBe(GREENHOUSE_SITE.y + GREENHOUSE_SITE.h - 1);
      expect(m.isBlocked(GREENHOUSE_SITE.x + 1, GREENHOUSE_SITE.y + 1)).toBe(
        true,
      );
      expect(m.isTillable(GREENHOUSE_SITE.x + 1, GREENHOUSE_SITE.y + 1)).toBe(
        false,
      );
      expect(exitOpen(e, new Set())).toBe(false);
      expect(exitOpen(e, new Set([GREENHOUSE_OPEN]))).toBe(true);
    }
  });
});

describe("the Larder reward", () => {
  it("repairs the greenhouse once every Larder bundle is done", () => {
    const g = newGame();
    expect(greenhouseRepaired(g)).toBe(false);
    expect(greenhouseHolds(g)).toEqual([]);
    const wallet = {
      get money() {
        return g.money;
      },
      set money(v: number) {
        g.money = v;
      },
    };
    for (let pass = 0; pass < 3; pass++)
      for (const b of g.hall.bundles)
        fillBundle(g.hall, g.inventory, wallet, b);
    expect(greenhouseRepaired(g)).toBe(true);
    expect(greenhouseHolds(g)).toEqual([GREENHOUSE_OPEN]);
  });
});

describe("indoor soil", () => {
  it("plants any crop in any season and never withers it", () => {
    const f = new Farm(true);
    f.till(1, 1);
    expect(f.plant(1, 1, spring.id, "winter")).toBe(true);
    f.water(1, 1);
    f.endDay("winter");
    expect(f.plotAt(1, 1)?.crop?.daysGrown).toBe(1);
    f.endDay("summer", 1, Math.random, true);
    expect(f.plotAt(1, 1)?.crop).toBeDefined();
  });

  it("keeps the outdoor rules for the farm", () => {
    const f = new Farm();
    f.till(1, 1);
    expect(f.plant(1, 1, spring.id, "winter")).toBe(false);
    expect(f.plant(1, 1, spring.id, "spring")).toBe(true);
    f.endDay("summer");
    expect(f.plotAt(1, 1)?.crop).toBeUndefined();
  });

  it("keeps fertilizer across a season change", () => {
    const f = new Farm(true);
    f.till(2, 2);
    f.fertilize(2, 2, "quality-fertilizer");
    f.endDay("spring", 1, Math.random, true);
    expect(f.plotAt(2, 2)?.fertilizer).toBe("quality-fertilizer");
    const o = new Farm();
    o.till(2, 2);
    o.fertilize(2, 2, "quality-fertilizer");
    o.endDay("spring", 1, Math.random, true);
    expect(o.plotAt(2, 2)?.fertilizer).toBeUndefined();
  });

  it("regrows a multi-harvest crop after picking, with watering", () => {
    const f = new Farm(true);
    f.till(3, 3);
    f.plant(3, 3, regrower.id, "winter");
    const def = cropById(regrower.id)!;
    for (let i = 0; i < def.growDays; i++) {
      f.water(3, 3);
      f.endDay("winter");
    }
    expect(f.isRipe(3, 3)).toBe(true);
    f.harvest(3, 3);
    expect(f.isRipe(3, 3)).toBe(false);
    for (let i = 0; i < (def.regrowDays ?? 0); i++) {
      f.water(3, 3);
      f.endDay("winter");
    }
    expect(f.isRipe(3, 3)).toBe(true);
  });

  it("needs watering: an unwatered crop does not grow", () => {
    const f = new Farm(true);
    f.till(4, 4);
    f.plant(4, 4, spring.id, "winter");
    f.endDay("winter");
    expect(f.plotAt(4, 4)?.crop?.daysGrown).toBe(0);
  });
});

describe("working the greenhouse with tools", () => {
  const held = (id: string) => ({ kind: "item", id }) as never;
  const tool = (t: string) => ({ kind: "tool", tool: t }) as never;

  it("digs, plants and harvests the greenhouse soil, in winter, apart from the farm", () => {
    const g = newGame();
    g.day.clock.day = WINTER_DAY;
    const m = house();
    g.inventory.add(seedId(spring.id), 2);
    expect(useHeld(g, m, tool("hoe"), 6, 6)).toMatchObject({ ok: true });
    expect(g.greenhouse.plotAt(6, 6)).toBeDefined();
    expect(g.farm.plotAt(6, 6)).toBeUndefined();
    expect(useHeld(g, m, held(seedId(spring.id)), 6, 6)).toMatchObject({
      ok: true,
    });
    expect(useHeld(g, m, tool("can"), 6, 6)).toMatchObject({ ok: true });
    expect(g.greenhouse.plotAt(6, 6)?.crop?.id).toBe(spring.id);
    // The hoe cannot dig the border or the margin.
    expect(useHeld(g, m, tool("hoe"), 1, 1)).toMatchObject({ ok: false });
    // A farm tree or weed on the same tile numbers does not get in the way.
    g.weeds.add(7, 7);
    expect(useHeld(g, m, tool("hoe"), 7, 7)).toMatchObject({ ok: true });
    // Overnight in winter, then it is ripe after its days.
    const def = cropById(spring.id)!;
    for (let i = 0; i < def.growDays; i++) {
      g.greenhouse.water(6, 6);
      g.greenhouse.endDay("winter");
    }
    expect(act(g, m, 6, 6)).toMatchObject({
      ok: true,
      item: expect.stringContaining(spring.id),
    });
    expect(g.greenhouse.plotAt(6, 6)?.crop).toBeUndefined();
  });

  it("is not watered by rain, and sleep grows it in winter", () => {
    const g = newGame();
    g.day.clock.day = WINTER_DAY;
    g.greenhouse.till(5, 5);
    g.greenhouse.plant(5, 5, spring.id, "winter");
    g.greenhouse.water(5, 5);
    g.weather = "rain" as never;
    g.tomorrow = "rain" as never;
    sleep(g, [], () => 0.99, undefined);
    expect(g.greenhouse.plotAt(5, 5)?.crop?.daysGrown).toBe(1);
    expect(g.greenhouse.plotAt(5, 5)?.wateredToday).toBe(false);
  });
});

describe("greenhouse saves", () => {
  it("round-trips the plots and crops", () => {
    const g = newGame();
    g.greenhouse.till(5, 5);
    g.greenhouse.plant(5, 5, spring.id, "winter");
    const back = deserialize(serialize(g))!;
    expect(back.greenhouse.indoors).toBe(true);
    expect(back.greenhouse.plotAt(5, 5)?.crop?.id).toBe(spring.id);
    expect(back.farm.plotAt(5, 5)).toBeUndefined();
  });

  it("loads an old save with no greenhouse as an empty one", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.greenhouse;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.greenhouse.indoors).toBe(true);
    expect([...back.greenhouse.each()]).toHaveLength(0);
  });

  it("drops damaged greenhouse plots instead of failing", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.greenhouse = {
      "1,1": { tilled: true, wateredToday: false },
      "2,2": {
        tilled: true,
        wateredToday: false,
        crop: { id: "no-such", daysGrown: 0, harvests: 0 },
      },
      nonsense: 4,
    };
    const back = deserialize(JSON.stringify(raw))!;
    expect([...back.greenhouse.each()].map((p) => `${p.x},${p.y}`)).toEqual([
      "1,1",
    ]);
  });
});
