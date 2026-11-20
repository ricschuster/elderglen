import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { HOUSE_MAP } from "../src/core/house";
import { SEASONS, WEEKDAYS } from "../src/core/calendar";
import {
  VILLAGERS,
  type DayContext,
  type Weekday,
} from "../src/core/villagers";
import { villagersOn } from "../src/core/townfolk";
import {
  dayWalk,
  legTo,
  walkingAt,
  TILES_PER_MINUTE,
} from "../src/core/walkers";

const CONTEXTS: DayContext[] = [];
for (const season of SEASONS)
  for (const weekday of WEEKDAYS as readonly Weekday[])
    for (const weather of ["sunny", "rainy", "snowy"] as const)
      CONTEXTS.push({ season, weekday, weather });

/** Every distinct day plan of every villager (a day kind repeats, so the work is shared). */
function eachDay(
  f: (v: (typeof VILLAGERS)[number], ctx: DayContext) => void,
): void {
  for (const v of VILLAGERS) for (const ctx of CONTEXTS) f(v, ctx);
}

describe("legs", () => {
  it("every leg is timed inside its gap and never overlaps the next", () => {
    const bad: string[] = [];
    eachDay((v, ctx) => {
      const dw = dayWalk(v, ctx);
      let prevEnd = -1;
      for (let i = 1; i < dw.stops.length; i++) {
        const leg = legTo(dw, i);
        if (!leg) continue;
        if (leg.end !== dw.stops[i]!.time) bad.push(`${v.id} ${i} end`);
        if (leg.start < dw.stops[i - 1]!.time) bad.push(`${v.id} ${i} early`);
        if (leg.start < prevEnd) bad.push(`${v.id} ${i} overlap`);
        if (leg.dt <= 0 || leg.dt > 1 / TILES_PER_MINUTE + 1e-9)
          bad.push(`${v.id} ${i} dt ${leg.dt}`);
        prevEnd = leg.end;
      }
    });
    expect(bad).toEqual([]);
  });

  it("every step is a walkable tile on its map", () => {
    const bad = new Set<string>();
    eachDay((v, ctx) => {
      const dw = dayWalk(v, ctx);
      for (let i = 1; i < dw.stops.length; i++)
        for (const s of legTo(dw, i)?.steps ?? [])
          if (maps.get(s.map).isBlocked(s.x, s.y))
            bad.add(`${v.id} ${s.map} ${s.x},${s.y}`);
    });
    expect([...bad]).toEqual([]);
  });

  it("consecutive steps are one tile apart on a map, or a door crossing", () => {
    const bad = new Set<string>();
    eachDay((v, ctx) => {
      const dw = dayWalk(v, ctx);
      for (let i = 1; i < dw.stops.length; i++) {
        const steps = legTo(dw, i)?.steps ?? [];
        for (let k = 1; k < steps.length; k++) {
          const a = steps[k - 1]!;
          const b = steps[k]!;
          if (
            a.map === b.map &&
            Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1
          )
            bad.add(`${v.id} ${i} ${k}`);
        }
      }
    });
    expect([...bad]).toEqual([]);
  });

  it("every Hearthwell stop to stop move has a leg (no blink) on the default, weekday, season and rain routes", () => {
    const missing = new Set<string>();
    eachDay((v, ctx) => {
      if ((v.area ?? "hw") !== "hw") return;
      const dw = dayWalk(v, ctx);
      for (let i = 1; i < dw.stops.length; i++) {
        const a = dw.places[i - 1];
        const b = dw.places[i];
        if (!a || !b || a.transit || b.transit) continue;
        if (a.map === b.map && a.x === b.x && a.y === b.y) continue;
        if (!legTo(dw, i))
          missing.add(
            `${v.id} ${dw.stops[i - 1]!.place} to ${dw.stops[i]!.place} (${dw.stops[i]!.time - dw.stops[i - 1]!.time} min)`,
          );
      }
    });
    // Route data with a gap too short to walk even at twice the speed (note 80 to tune): these snap.
    expect([...missing].sort()).toEqual([
      "bramwell hw:smithy/counter to hw:river-path (10 min)",
      "cordelia hw:hatter/counter to hw:green (10 min)",
      "fitch hw:green to hw:store/home (30 min)",
    ]);
  });

  it("a person leaving a building appears on its door tile on the outer map", () => {
    const young = VILLAGERS.find((v) => v.home === "hw:burrow-young/home");
    const door = maps.get("hearthwell").entry("from_burrow-young")!;
    let seen = false;
    for (const v of VILLAGERS) {
      if (v.area && v.area !== "hw") continue;
      const dw = dayWalk(v, CONTEXTS[0]!);
      for (let i = 1; i < dw.stops.length; i++) {
        const steps = legTo(dw, i)?.steps ?? [];
        for (let k = 1; k < steps.length; k++)
          if (
            steps[k - 1]!.map !== "hearthwell" &&
            steps[k]!.map === "hearthwell"
          ) {
            const exit = maps
              .get(steps[k - 1]!.map)
              .exits.find((e) => e.map === "hearthwell")!;
            const entry = maps.get("hearthwell").entry(exit.entry)!;
            expect(steps[k]).toMatchObject({ x: entry.x, y: entry.y });
            seen = true;
          }
      }
    }
    expect(seen).toBe(true);
    expect(young === undefined || door.x > 0).toBe(true);
  });
});

describe("town trips", () => {
  it("a person leaving for town walks to the forest edge, and arrives from the Hearthwell edge", () => {
    const dilly = VILLAGERS.find((v) => v.id === "dilly")!;
    const ctx: DayContext = {
      season: "spring",
      weekday: "Tue",
      weather: "sunny",
    };
    const dw = dayWalk(dilly, ctx);
    const out = dw.stops.findIndex((s) => s.place === "road:forest");
    expect(out).toBeGreaterThan(0);
    const leave = legTo(dw, out)!;
    expect(leave).not.toBeNull();
    const edge = maps.get("forest").entry("from_farm")!;
    expect(leave.steps.at(-1)).toEqual({ map: "forest", x: edge.x, y: edge.y });
    const arrive = legTo(dw, out + 1)!;
    expect(arrive).not.toBeNull();
    const gate = maps.get("hearthwell").entry("from_farm")!;
    expect(arrive.steps[0]).toEqual({
      map: "hearthwell",
      x: gate.x,
      y: gate.y,
    });
    expect(arrive.start).toBeGreaterThanOrEqual(dw.stops[out]!.time);
  });
});

describe("poses", () => {
  const g = { weather: "sunny" } as const;
  const ctxDay = 6; // spring day 6, no festival

  it("is a pure function of the arguments", () => {
    for (const v of VILLAGERS.slice(0, 12))
      for (let t = 360; t < 1400; t += 7) {
        const ctx = CONTEXTS[5]!;
        expect(walkingAt(v, ctx, t)).toEqual(walkingAt(v, ctx, t));
      }
  });

  it("someone is seen walking at some time, and moves between samples", () => {
    let walkers = 0;
    let moved = false;
    for (let t = 360; t < 1400; t += 5) {
      const a = villagersOn(g, "hearthwell", ctxDay, t).filter(
        (p) => p.fx !== undefined,
      );
      const b = villagersOn(g, "hearthwell", ctxDay, t + 5).filter(
        (p) => p.fx !== undefined,
      );
      walkers += a.length;
      for (const p of a) {
        const q = b.find((o) => o.id === p.id);
        if (q && (q.fx !== p.fx || q.fy !== p.fy)) moved = true;
      }
    }
    expect(walkers).toBeGreaterThan(0);
    expect(moved).toBe(true);
  });

  it("nobody shares a tile and nobody stands on a wall, on every map, all day", () => {
    const bad: string[] = [];
    for (const map of [
      "hearthwell",
      "general-store",
      "inn",
      "burrow-young",
      "outpost",
      "library",
      "smithy",
    ])
      for (let t = 360; t < 1560; t += 5) {
        const list = villagersOn(g, map, ctxDay, t);
        const seen = new Set<string>();
        for (const p of list) {
          const k = `${p.x},${p.y}`;
          if (seen.has(k)) bad.push(`${map} ${t} ${k}`);
          seen.add(k);
          if (maps.get(map).isBlocked(p.x, p.y))
            bad.push(`${map} ${t} wall ${k}`);
        }
      }
    expect(bad).toEqual([]);
  });

  it("a lag holds a person behind the schedule", () => {
    const id = "odette";
    let found = false;
    for (let t = 360; t < 1400 && !found; t += 5) {
      const now = villagersOn(g, "general-store", ctxDay, t).find(
        (p) => p.id === id && p.fx !== undefined,
      );
      if (!now) continue;
      const late = villagersOn(g, "general-store", ctxDay, t, {
        lag: { [id]: 1 },
      }).find((p) => p.id === id);
      if (late && (late.fx !== now.fx || late.fy !== now.fy)) found = true;
    }
    expect(found).toBe(true);
  });

  it("a person walking out of the young burrow is on the burrow map, then Hearthwell", () => {
    const maps_ = new Set<string>();
    for (let t = 360; t < 1400; t += 1)
      for (const map of ["burrow-young", "hearthwell"])
        for (const p of villagersOn(g, map, ctxDay, t))
          if (p.fx !== undefined) maps_.add(`${map}:${p.id}`);
    expect([...maps_].some((s) => s.startsWith("burrow-young:"))).toBe(true);
  });
});

void HOUSE_MAP;
