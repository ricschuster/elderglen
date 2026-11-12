import data from "../content/festival-spots.json";
import { festivalDayToday, festivalToday, type Festival } from "./festivals";
import {
  parseTime,
  resolvePlace,
  whereAt,
  type DayContext,
  type Villager,
} from "./villagers";

/**
 * The festival route layer (note 82, note 79 "festival" spot). Pure: where a
 * person is on a festival day is a function of the festival, the time and, for
 * the Hat Parade, when the player joined. Content lives in
 * `src/content/festival-spots.json`. Every tile and number is a placeholder.
 */

export type Tile = readonly [number, number];

/** One festival's layout on its map (a variant of the map through a `when` condition, note 81). */
export interface FestivalLayout {
  /** The festival id, with `@hall` for the Midwinter Feast in the hall. */
  key: string;
  map: string;
  /** The map layer condition that shows this layout, or null when the map is only the festival's. */
  hold: string | null;
  /** The eight player start tiles (note 81 decision 12). */
  starts: readonly Tile[];
  /** One standing tile per person (the note 79 festival spot). */
  spots: Readonly<Record<string, Tile>>;
  /** People who sit on a prop (a bench) rather than stand on free ground. */
  seated: readonly string[];
  /** Hedge niches cut for Hollow Eve, odd year. */
  niches: readonly Tile[];
  /** Tiles kept clear of props and people (doors, hand-in spots, the launch line). */
  keepClear: readonly Tile[];
  holes: readonly Tile[];
  hunt?: SeedHunt;
}

/** The Seedswap hunt (Stardew's egg hunt): packet tiles by year parity. */
export interface SeedHunt {
  seconds: number;
  /** Packets that win, for one player. */
  win: number;
  /** Latest minute to start, so it ends before closing. */
  lastStart: number;
  odd: readonly Tile[];
  even: readonly Tile[];
}

interface RawLayout {
  map: string;
  hold: string | null;
  starts: number[][];
  spots: Record<string, number[]>;
  seated?: string[];
  niches?: number[][];
  keepClear?: number[][];
  holes?: number[][];
  hunt?: {
    seconds: number;
    win: number;
    lastStart: number;
    odd: number[][];
    even: number[][];
  };
}

const tiles = (a: number[][] | undefined): Tile[] =>
  (a ?? []).map((t) => [t[0]!, t[1]!] as const);

export const LAYOUTS: readonly FestivalLayout[] = Object.entries(
  data.festivals as Record<string, RawLayout>,
).map(([key, r]) => ({
  key,
  map: r.map,
  hold: r.hold,
  starts: tiles(r.starts),
  spots: Object.fromEntries(
    Object.entries(r.spots).map(([id, t]) => [id, [t[0]!, t[1]!] as const]),
  ),
  seated: r.seated ?? [],
  niches: tiles(r.niches),
  keepClear: tiles(r.keepClear),
  holes: tiles(r.holes),
  ...(r.hunt
    ? {
        hunt: {
          seconds: r.hunt.seconds,
          win: r.hunt.win,
          lastStart: r.hunt.lastStart,
          odd: tiles(r.hunt.odd),
          even: tiles(r.hunt.even),
        },
      }
    : {}),
}));

/** The layout a festival uses, given whether the hall is restored (the Midwinter Feast moves into it). */
export function festivalLayout(
  f: Festival,
  hallRestored = false,
): FestivalLayout | undefined {
  const key = f.placeUpgrade && hallRestored ? `${f.id}@hall` : f.id;
  return LAYOUTS.find((l) => l.key === key);
}

/** The map conditions to hold on a game day so today's festival layout shows. Empty on other days. */
export function festivalHolds(day: number, hallRestored = false): string[] {
  const f = festivalDayToday(day);
  const hold = f && festivalLayout(f, hallRestored)?.hold;
  return hold ? [hold] : [];
}

/** Everyone who goes to the festival, in the order of the layout. */
export const attendees = (l: FestivalLayout): string[] => Object.keys(l.spots);

/** Minutes since midnight when a person goes home from every festival (Hester, bedtime, decision 6). */
export const LEAVES: Readonly<Record<string, number>> = {
  hester: parseTime(data.hesterLeaves),
};

/** The rival who wins when the player fails the contest (decided 2026-11-12). */
export const RIVALS: Readonly<Record<string, string>> = {
  "seedswap-fair": "linnet",
  frostday: "rushie",
};

/** Festivals that end, and send the player home, after their main event (decided 2026-11-12). */
export const ENDS_AFTER_MAIN_EVENT: readonly string[] = [
  "seedswap-fair",
  "frostday",
];

export const endsAfterMainEvent = (f: Festival): boolean =>
  ENDS_AFTER_MAIN_EVENT.includes(f.id);

// ---- the Hat Parade march (note 82, auto-play)

/** The line, from the head: Cuthbert, the four children, then the other 17. */
export const PARADE_LINE: readonly string[] = [
  "cuthbert",
  "fitch",
  "wren",
  "pim",
  "toby",
  "hattie",
  "podge",
  "linnet",
  "thistle",
  "odette",
  "dorrie",
  "alder",
  "tilda",
  "rufus",
  "bramwell",
  "aurelle",
  "dunmar",
  "cordelia",
  "barnaby",
  "walter",
  "aldreth",
  "hester",
];

/** The player marches at the tail, behind the last villager. */
export const PARADE_TAIL = PARADE_LINE.length;

/** The out lane west to the turn, across, and the back lane east (Hearthwell street). */
export const PARADE_PATH: readonly Tile[] = [
  [64, 61],
  [48, 61],
  [48, 63],
  [64, 63],
];

/** The march starts at 14:00 (placeholder, note 82). */
export const PARADE_START = 14 * 60;
/** Game minutes between one marcher and the next reaching the square mouth. */
export const PARADE_STAGGER = 1;
/** Game minutes per tile while marching (slow) and while walking to or from the line. */
export const MARCH_MIN_PER_TILE = 1;
export const WALK_MIN_PER_TILE = 0.5;

const manhattan = (a: Tile, b: Tile): number =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/**
 * The start minute of each lap of the march. One lap at 14:00, or, when the
 * player joins late (after 14:00), one extra lap that starts once the player
 * is at the tail and the first lap is over (decided 2026-11-12: the villagers
 * do one extra lap so nobody misses it). The player joins at the tail.
 */
export function paradeLaps(joinedAt?: number, start = PARADE_START): number[] {
  if (joinedAt === undefined || joinedAt <= start) return [start];
  const firstEnd = start + paradeLapMinutes(PARADE_TAIL, PARADE_PATH[0]!);
  return [start, Math.max(joinedAt, firstEnd)];
}

/** Game minutes from the lap start until marcher `index` is back, for a stand tile. */
export function paradeLapMinutes(index: number, stand: Tile): number {
  const steps = paradeSteps(stand, index, 0);
  return steps[steps.length - 1]!.t;
}

interface Step {
  t: number;
  p: Tile;
}

/** The timed waypoints of marcher `index` for the lap that starts at `lapStart`. */
export function paradeSteps(
  stand: Tile,
  index: number,
  lapStart: number,
): Step[] {
  const arrive = lapStart + index * PARADE_STAGGER;
  const depart = arrive - manhattan(stand, PARADE_PATH[0]!) * WALK_MIN_PER_TILE;
  const steps: Step[] = [
    { t: depart, p: stand },
    { t: arrive, p: PARADE_PATH[0]! },
  ];
  for (let i = 1; i < PARADE_PATH.length; i++)
    steps.push({
      t:
        steps[steps.length - 1]!.t +
        manhattan(PARADE_PATH[i - 1]!, PARADE_PATH[i]!) * MARCH_MIN_PER_TILE,
      p: PARADE_PATH[i]!,
    });
  steps.push({
    t:
      steps[steps.length - 1]!.t +
      manhattan(PARADE_PATH[PARADE_PATH.length - 1]!, stand) *
        WALK_MIN_PER_TILE,
    p: stand,
  });
  return steps;
}

/** The tile on a timed path at a minute, or undefined outside it. */
function along(steps: readonly Step[], t: number): Tile | undefined {
  const first = steps[0]!;
  const last = steps[steps.length - 1]!;
  if (t < first.t || t > last.t) return undefined;
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1]!;
    const b = steps[i]!;
    if (t <= b.t) {
      const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      return [
        Math.round(a.p[0] + (b.p[0] - a.p[0]) * k),
        Math.round(a.p[1] + (b.p[1] - a.p[1]) * k),
      ];
    }
  }
  return last.p;
}

/** Where a villager is during a festival, or undefined when their normal day applies. */
export interface FestivalWhere {
  map: string;
  x: number;
  y: number;
  state: "standing" | "marching" | "home";
}

export interface FestivalOpts {
  hallRestored?: boolean;
  /** The minute the player joined the Hat Parade, if they have. A late joiner adds a lap. */
  paradeJoinedAt?: number;
}

/**
 * The festival layer of the route (note 79 selection order: festival first).
 * Before the festival opens and after it ends, undefined: the normal day. From
 * opening to the end a person stands at their spot, except Hester, who goes
 * home at 20:30 (decision 6), and the Hat Parade marchers while the line moves.
 * People who are not in the layout keep their normal day.
 */
export function festivalWhere(
  v: Villager,
  f: Festival,
  t: number,
  opts: FestivalOpts = {},
): FestivalWhere | undefined {
  const layout = festivalLayout(f, opts.hallRestored);
  const stand = layout?.spots[v.id];
  if (!layout || !stand) return undefined;
  if (t < f.opens || t >= f.ends) return undefined;
  const leaves = LEAVES[v.id];
  if (leaves !== undefined && t >= leaves) {
    const home = resolvePlace(v.home)!;
    return { map: home.map ?? "", x: home.x, y: home.y, state: "home" };
  }
  if (f.id === "hat-parade") {
    const index = PARADE_LINE.indexOf(v.id);
    if (index >= 0)
      for (const lap of paradeLaps(opts.paradeJoinedAt)) {
        const at = along(paradeSteps(stand, index, lap), t);
        if (at)
          return { map: layout.map, x: at[0], y: at[1], state: "marching" };
      }
  }
  return { map: layout.map, x: stand[0], y: stand[1], state: "standing" };
}

/**
 * Where a villager is on a game day at a time: the festival layer if a festival
 * is on and they go, else the normal route (`whereAt`). The Night Market is an
 * evening festival with its own spots (note 14) and has no layout here.
 */
export function villagerNow(
  v: Villager,
  day: number,
  ctx: DayContext,
  t: number,
  opts: FestivalOpts = {},
):
  | { festival: FestivalWhere }
  | { festival?: undefined; route: ReturnType<typeof whereAt> } {
  const f = festivalToday(day);
  const fw = f && !f.evening ? festivalWhere(v, f, t, opts) : undefined;
  if (fw) return { festival: fw };
  return { route: whereAt(v, ctx, t) };
}
