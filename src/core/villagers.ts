import data from "../content/villagers.json";
import shopData from "../content/shops.json";
import { mapFiles, maps } from "../content/maps";
import { NO_CONDITIONS } from "./map";
import { WEEKDAYS, dateOf, type Season } from "./calendar";
import type { Weather } from "./weather";

/**
 * Villager data and the schedule engine (notes 79 and 80, #599 slice 1).
 * Pure: where a person is is a function of person, day, weather and time.
 * Times are game minutes on the 6:00 to 26:00 day (so 24:00 is 1440).
 */

export type Weekday = (typeof WEEKDAYS)[number];

export interface Stop {
  /** Minutes on the game clock. */
  time: number;
  /** `<area>:<name>[/<spot>]`, or `road:<area>` while walking to town. */
  place: string;
  idle?: string;
}

export interface Override {
  days?: Weekday[];
  season?: Season;
  /** Only on this weather. `sunny` here means any dry day. */
  weather?: "sunny" | "snowy";
  /** The window [from, until) that this override replaces. */
  from: number;
  until: number;
  stops: Stop[];
  bed?: number;
}

export interface Villager {
  id: string;
  name: string;
  /** The name the player knows before a reveal (Old Greencoat, Lane). */
  knownAs?: string;
  role: string;
  ageBand: "child" | "young-adult" | "adult" | "elder";
  birthday: { season: Season; day: number };
  /** Can be courted by any player (note 12, 14 in ring 1). */
  candidate: boolean;
  /** Hearts a married candidate can reach (note 12). Equals the friend cap for everyone else. */
  heartCap: number;
  home: string;
  /** The bed mark this person sleeps at in their home interior (#992). None without an interior map. */
  bedMark?: string;
  shop?: string;
  area?: string;
  /** Minutes. Asleep from here until the first stop. */
  bed: number;
  /** True when the notes give no bedtime (the camp wanderer). */
  bedPlaceholder?: boolean;
  route: Stop[];
  rain: Stop[];
  weekday: Override[];
  season: Override[];
}

export interface ShopHours {
  id: string;
  name: string;
  keeper: string;
  open: number;
  close: number;
  doorClose: number | null;
  closedDay: Weekday | null;
  rainOpen: boolean;
  dailyAfterHall: boolean;
}

export const IDLE_KEYS: readonly string[] = data.idleKeys;

export const parseTime = (s: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`bad time "${s}"`);
  return Number(m[1]) * 60 + Number(m[2]);
};

export const parseStop = (s: string): Stop => {
  const m = /^(\d{1,2}:\d{2}) (\S+?)(?: \(([^)]+)\))?$/.exec(s);
  if (!m) throw new Error(`bad stop "${s}"`);
  const stop: Stop = { time: parseTime(m[1]!), place: m[2]! };
  if (m[3]) stop.idle = m[3];
  return stop;
};

interface RawOverride {
  days?: string[];
  season?: string;
  weather?: string;
  from: string;
  until: string;
  stops: string[];
  bed?: string;
}

const toOverride = (o: RawOverride): Override => ({
  ...(o.days ? { days: o.days as Weekday[] } : {}),
  ...(o.season ? { season: o.season as Season } : {}),
  ...(o.weather ? { weather: o.weather as "sunny" | "snowy" } : {}),
  from: parseTime(o.from),
  until: parseTime(o.until),
  stops: o.stops.map(parseStop),
  ...(o.bed ? { bed: parseTime(o.bed) } : {}),
});

const BEDS = data.beds as Record<string, string>;

export const VILLAGERS: readonly Villager[] = data.villagers.map((v) => {
  const raw = v as typeof v & { shop?: string; area?: string };
  return {
    id: v.id,
    name: v.name,
    ...("knownAs" in v ? { knownAs: (v as { knownAs: string }).knownAs } : {}),
    role: v.role,
    ageBand: v.ageBand as Villager["ageBand"],
    birthday: { season: v.birthday.season as Season, day: v.birthday.day },
    candidate: "candidate" in v && v.candidate === true,
    heartCap: "heartCap" in v ? (v.heartCap as number) : 10,
    home: v.home,
    ...(BEDS[v.id] ? { bedMark: BEDS[v.id]! } : {}),
    ...(raw.shop ? { shop: raw.shop } : {}),
    ...(raw.area ? { area: raw.area } : {}),
    bed: parseTime(v.bed),
    ...("bedPlaceholder" in v ? { bedPlaceholder: true } : {}),
    route: v.route.map(parseStop),
    rain: v.rain.map(parseStop),
    weekday: (v.weekday as RawOverride[]).map(toOverride),
    season: (v.season as RawOverride[]).map(toOverride),
  };
});

export const SHOPS: readonly ShopHours[] = shopData.shops.map((s) => ({
  id: s.id,
  name: s.name,
  keeper: s.keeper,
  open: parseTime(s.open),
  close: parseTime(s.close),
  doorClose: s.doorClose === null ? null : parseTime(s.doorClose),
  closedDay: s.closedDay as Weekday | null,
  rainOpen: s.rainOpen,
  dailyAfterHall: s.dailyAfterHall,
}));

export const villagerById = (id: string): Villager | undefined =>
  VILLAGERS.find((v) => v.id === id);

export const isRainy = (w: Weather): boolean => w === "rainy" || w === "stormy";

/** What the engine needs to know about a day. */
export interface DayContext {
  season: Season;
  weekday: Weekday;
  weather: Weather;
}

/** The context for a game day number (1 based, as Clock.day). */
export function dayContext(day: number, weather: Weather): DayContext {
  const { season, dayOfSeason } = dateOf(day);
  return {
    season,
    weekday: WEEKDAYS[(dayOfSeason - 1) % WEEKDAYS.length] as Weekday,
    weather,
  };
}

/** The stop in force at a time, or undefined before the first stop. */
const stopAt = (route: readonly Stop[], t: number): Stop | undefined => {
  let found: Stop | undefined;
  for (const s of route) if (s.time <= t) found = s;
  return found;
};

/**
 * Replace the window [from, until) of a route with the override's stops. The
 * stop that was in force at `until` is put back at `until` if no stop starts
 * there, so a person returns to what they would have been doing (note 80: "an
 * entry replaces only the stops it lists").
 */
export function applyOverride(route: readonly Stop[], o: Override): Stop[] {
  const resume = stopAt(route, o.until);
  const out = route.filter((s) => s.time < o.from || s.time >= o.until);
  out.push(...o.stops);
  if (resume && !route.some((s) => s.time === o.until))
    out.push({ ...resume, time: o.until });
  return out.sort((a, b) => a.time - b.time);
}

const matches = (o: Override, ctx: DayContext): boolean => {
  if (o.days && !o.days.includes(ctx.weekday)) return false;
  if (o.season && o.season !== ctx.season) return false;
  if (o.weather === "snowy" && ctx.weather !== "snowy") return false;
  if (o.weather === "sunny" && ctx.weather === "snowy") return false;
  return true;
};

export interface DayPlan {
  stops: Stop[];
  bed: number;
  /** Which layer won, for tests and the Social tab. */
  layer: "rain" | "weekday" | "season" | "default";
}

/**
 * The day's route. Selection order (note 79): rain replaces the whole day;
 * otherwise the default route has season overrides applied, then weekday
 * overrides on top. (Festival and heart-event routes are not built yet.)
 */
export function planDay(v: Villager, ctx: DayContext): DayPlan {
  if (isRainy(ctx.weather))
    return { stops: [...v.rain], bed: v.bed, layer: "rain" };
  let stops = [...v.route];
  let bed = v.bed;
  let layer: DayPlan["layer"] = "default";
  for (const o of v.season) {
    if (!matches(o, ctx)) continue;
    stops = applyOverride(stops, o);
    if (o.bed !== undefined) bed = o.bed;
    layer = "season";
  }
  for (const o of v.weekday) {
    if (!matches(o, ctx)) continue;
    stops = applyOverride(stops, o);
    layer = "weekday";
  }
  return { stops, bed, layer };
}

export interface Place {
  /** The map file the person is on, or null while in transit or unbuilt. */
  map: string | null;
  x: number;
  y: number;
  /** True when the tile is a stand-in (most are, until the maps place them). */
  placeholder: boolean;
  indoors: boolean;
  transit: boolean;
}

type PlaceDef = {
  interior?: string;
  x?: number;
  y?: number;
  placeholder?: boolean;
  transit?: boolean;
};
const PLACES = data.places as Record<string, PlaceDef>;
const AREAS = data.areas as Record<string, { map: string | null }>;
const SPOTS = data.interiorSpots as Record<string, { x: number; y: number }>;

const SPOT_MARKS = data.spotMarks as unknown as Record<string, string[]>;

/** Open tiles of an interior, reached from its door, read once per map. */
const openTiles = new Map<string, Set<string>>();
const openOf = (mapId: string): Set<string> => {
  let open = openTiles.get(mapId);
  if (!open) {
    const m = maps.get(mapId);
    const from = m.entry("door") ?? m.entries[0];
    open = from ? m.reachable(from) : new Set();
    openTiles.set(mapId, open);
  }
  return open;
};

/**
 * The tile a spot stands on in a map: the first of the spot's marks the map has,
 * or the shared fallback tile, moved to the nearest open tile when it is solid
 * (a wall or a fixture). So nobody is ever drawn inside a wall (note 86).
 */
function interiorTile(
  mapId: string,
  spot: string,
): { x: number; y: number } | undefined {
  const marks = maps.marksWith(mapId, NO_CONDITIONS).marks;
  let want: { x: number; y: number } | undefined;
  for (const name of SPOT_MARKS[spot] ?? []) {
    want = marks.find((m) => m.name === name);
    if (want) break;
  }
  want ??= SPOTS[spot];
  return want && nearestOpen(mapId, want, true);
}

/**
 * `want` if a person can stand there, else the nearest tile they can (ties go to
 * the top row, then the left). Indoors the tile must also be reachable from the
 * door; outdoors, not solid is enough (an area map has pockets).
 */
function nearestOpen(
  mapId: string,
  want: { x: number; y: number },
  indoors: boolean,
): { x: number; y: number } {
  const m = maps.get(mapId);
  const open = indoors ? openOf(mapId) : undefined;
  const ok = (x: number, y: number) =>
    open ? open.has(`${x},${y}`) : !m.isBlocked(x, y);
  if (open?.size === 0 || ok(want.x, want.y)) return want;
  for (let r = 1; r < m.width + m.height; r++)
    for (let dy = -r; dy <= r; dy++) {
      const dx = r - Math.abs(dy);
      for (const x of dx === 0 ? [want.x] : [want.x - dx, want.x + dx])
        if (ok(x, want.y + dy)) return { x, y: want.y + dy };
    }
  return want;
}

/** `hw:inn` with no spot is the inn's common room. */
export const splitPlace = (id: string): { base: string; spot?: string } => {
  const [base, spot] = id.split("/") as [string, string | undefined];
  return spot ? { base, spot } : { base };
};

/** Resolve a place id to a map and tile. Undefined when the id is unknown. */
export function resolvePlace(id: string): Place | undefined {
  const { base, spot } = splitPlace(id);
  const def = PLACES[base];
  if (!def) return undefined;
  if (def.transit)
    return {
      map: null,
      x: 0,
      y: 0,
      placeholder: true,
      indoors: false,
      transit: true,
    };
  const area = AREAS[base.split(":")[0]!];
  if (!area) return undefined;
  if (spot !== undefined || base === "hw:inn") {
    const s =
      def.interior && mapFiles[def.interior] && SPOT_MARKS[spot ?? "common"]
        ? interiorTile(def.interior, spot ?? "common")
        : SPOTS[spot ?? "common"];
    if (!s) return undefined;
    // An interior map when the building has one, else the area map.
    const mapId = def.interior ?? area.map;
    const t =
      mapId && mapFiles[mapId] && !def.interior
        ? nearestOpen(mapId, s, false)
        : s;
    return {
      map: mapId,
      x: t.x,
      y: t.y,
      placeholder: true,
      indoors: true,
      transit: false,
    };
  }
  const at = { x: def.x ?? 0, y: def.y ?? 0 };
  const t =
    area.map && mapFiles[area.map] ? nearestOpen(area.map, at, false) : at;
  return {
    map: area.map,
    x: t.x,
    y: t.y,
    placeholder: def.placeholder === true,
    indoors: false,
    transit: false,
  };
}

export interface Whereabouts {
  place: string;
  idle?: string;
  where: Place;
  asleep: boolean;
  /** The next stop today, if any (for the walker to head to). */
  next?: Stop;
}

/**
 * The tile of a villager's own bed in their home interior, moved to the nearest open tile when
 * the bed fixture is solid. Undefined when they have no bed mark or the map lacks it. Sleeping
 * villagers are still hidden (owner question open); this is where a bed view would draw them.
 */
export function bedPlace(v: Villager): Place | undefined {
  if (!v.bedMark) return undefined;
  const { base } = splitPlace(v.home);
  const interior = PLACES[base]?.interior;
  if (!interior || !mapFiles[interior]) return undefined;
  const mark = maps
    .marksWith(interior, NO_CONDITIONS)
    .marks.find((m) => m.name === v.bedMark);
  if (!mark) return undefined;
  const t = nearestOpen(interior, mark, true);
  return {
    map: interior,
    x: t.x,
    y: t.y,
    placeholder: true,
    indoors: true,
    transit: false,
  };
}

/** Where a villager is at a game-clock minute. Before the first stop and after bedtime they are home. */
export function whereAt(v: Villager, ctx: DayContext, t: number): Whereabouts {
  const plan = planDay(v, ctx);
  const first = plan.stops[0];
  const home = (asleep: boolean): Whereabouts => ({
    place: v.home,
    where: resolvePlace(v.home)!,
    asleep,
    ...(plan.stops.find((s) => s.time > t)
      ? { next: plan.stops.find((s) => s.time > t) }
      : {}),
  });
  if (t >= plan.bed) return home(true);
  if (!first || t < first.time) return home(false);
  const stop = stopAt(plan.stops, t)!;
  const next = plan.stops.find((s) => s.time > t);
  return {
    place: stop.place,
    ...(stop.idle ? { idle: stop.idle } : {}),
    where: resolvePlace(stop.place)!,
    asleep: false,
    ...(next ? { next } : {}),
  };
}

/** The area a person was in at a time, for the Social tab's "last seen" line (note 79, rule 8). */
export const areaAt = (v: Villager, ctx: DayContext, t: number): string =>
  whereAt(v, ctx, t).place.split(":")[0]!;

export type ShopState = "open" | "door" | "closed";

/**
 * Whether a shop's counter is open, only its door is open, or it is shut
 * (note 79 "Shop hours"). `hallDone` is the last ring 1 hall project;
 * `festival` shuts every shop during festival hours.
 */
export function shopState(
  shop: ShopHours,
  weekday: Weekday,
  weather: Weather,
  t: number,
  opts: { hallDone?: boolean; festival?: boolean } = {},
): ShopState {
  if (opts.festival) return "closed";
  let closedToday = shop.closedDay === weekday;
  if (closedToday && shop.rainOpen && isRainy(weather)) closedToday = false;
  if (closedToday && shop.dailyAfterHall && opts.hallDone) closedToday = false;
  if (closedToday) return "closed";
  if (t >= shop.open && t < shop.close) return "open";
  if (shop.doorClose !== null && t >= shop.open && t < shop.doorClose)
    return "door";
  return "closed";
}
