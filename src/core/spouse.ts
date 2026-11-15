import spouseData from "../content/spouse.json";
import { SPOUSE_PERK_HEARTS } from "./marriage";
import { feedAll } from "./animals";
import { dateOf } from "./calendar";
import { absorbElderfruit, SOURCE_FLAGS } from "./elderfruit";
import { festivalDayToday } from "./festivals";
import { HEART } from "./friendship";
import { ELDERFRUIT } from "./items";
import type { GameState } from "./save";
import {
  SHOPS,
  dayContext,
  isRainy,
  parseTime,
  planDay,
  splitPlace,
  villagerById,
  type Stop,
  type Villager,
} from "./villagers";
import { isRaining, type Weather } from "./weather";
import { hasFlag, setFlag } from "./worldflags";

/**
 * Spouse life (note 12 slice 3, #936; notes 79, 80, 84, 85). Pure rules: the
 * spouse route built from the person's own route, the morning chores, the
 * daily kiss, the daily lines, the jealousy line and the 12.5 heart gift.
 * Nothing here is per person: the 14 candidates differ only by their data row
 * (`villagers.json`) and their prop block and idle key (`spouse.json`). Every
 * number and line is a placeholder (note 07).
 */

const T = Object.fromEntries(
  Object.entries(spouseData.times).map(([k, v]) => [k, parseTime(v)]),
) as Record<keyof typeof spouseData.times, number>;

/** The farm spots a spouse uses (places in `villagers.json`, marks in note 85). */
export const SPOUSE_BED = "farm:house/spouse-bed";
export const SPOUSE_KITCHEN = "farm:house/spouse-kitchen";
export const SPOUSE_ROOM = "farm:house/spouse-room";
export const SPOUSE_YARD = "farm:yard";
export const SPOUSE_CORNER = "farm:corner";

/** Energy the first kiss of the day gives (placeholder, note 07). */
export const KISS_ENERGY = spouseData.kiss.energy;
/** Crop tiles the spouse waters on a growing morning, fewest and most. */
export const WATER_MIN = spouseData.chores.waterMin;
export const WATER_MAX = spouseData.chores.waterMax;
/** The spouse waters only crops this near the house door (tiles, straight line). */
export const WATER_RADIUS = spouseData.chores.radius;

// ---- Who is on the spouse route --------------------------------------------

type Married = Pick<GameState, "marriage">;

/** The married person, or null. The spouse route runs from the morning after the wedding. */
export function spouseId(g: Partial<Married>): string | null {
  const m = g.marriage;
  return m?.married && m.spouse ? m.spouse : null;
}

/** True when `id` keeps the spouse route on `day` (married, and the wedding day is behind). */
export function onSpouseRoute(
  g: Partial<Married>,
  id: string,
  day: number,
): boolean {
  return spouseId(g) === id && day > (g.marriage?.weddingDay ?? Infinity);
}

// ---- The spouse route ------------------------------------------------------

const isHomeStop = (v: Villager, s: Stop): boolean =>
  s.place === v.home || splitPlace(s.place).spot === "home";

const areaOf = (place: string): string => place.split(":")[0]!;

const TRAVEL = spouseData.travel as Record<string, number | string>;
const travelMinutes = (area: string): number => {
  const n = TRAVEL[area] ?? TRAVEL.default;
  return typeof n === "number" ? n : 30;
};

/** The person's own work stops: from the work start to the end of work, home stops dropped. */
function workStops(old: readonly Stop[], v: Villager): Stop[] {
  let inForce: Stop | undefined;
  for (const s of old) if (s.time <= T.workFrom) inForce = s;
  const out = old.filter(
    (s) => s.time > T.workFrom && s.time < T.workUntil && !isHomeStop(v, s),
  );
  // Whatever they were doing at the start of work, they are doing again (a counter keeps its hours).
  if (inForce && !isHomeStop(v, inForce))
    out.unshift({
      ...inForce,
      time: inForce.time >= T.leaveFloor ? inForce.time : T.workFrom,
    });
  return out;
}

/** Why the spouse does not go to work today, or "" when they do (note 84, rule 1). */
export function stayHomeReason(
  v: Villager,
  day: number,
  weather: Weather,
): "rain" | "closed" | "festival" | "" {
  if (isRainy(weather)) return "rain";
  if (festivalDayToday(day)) return "festival";
  const shop = v.shop ? SHOPS.find((s) => s.id === v.shop) : undefined;
  const { weekday } = dayContext(day, weather);
  if (shop?.closedDay === weekday) return "closed";
  return "";
}

export interface SpousePlan {
  stops: Stop[];
  bed: number;
  stayedHome: "rain" | "closed" | "festival" | "";
}

/**
 * The spouse's day (note 84 "Spouse routes"): wake in the double bed, chores,
 * breakfast, the walk to the first work stop, the person's own work stops until
 * 17:00, the walk home, the evening at the outside corner in fair weather and
 * in the room otherwise, bed. Rain, a closed counter and festivals keep them at
 * the farm. Pure, a function of the person, the day and the weather.
 */
export function spousePlan(
  v: Villager,
  day: number,
  weather: Weather,
): SpousePlan {
  const ctx = dayContext(day, weather);
  const stayedHome = stayHomeReason(v, day, weather);
  const idle =
    spouseData.spouses[v.id as keyof typeof spouseData.spouses]?.idle ??
    spouseData.idleDefault;
  const growing = dateOf(day).season !== "winter";
  const fair = !isRainy(weather) && weather !== "snowy" && growing;
  const stops: Stop[] = [{ time: T.wake, place: SPOUSE_BED }];
  // Chores: outside in dry weather, in the kitchen when it rains.
  stops.push(
    isRainy(weather)
      ? { time: T.chores, place: SPOUSE_KITCHEN, idle: "kitchen" }
      : {
          time: T.chores,
          place: SPOUSE_YARD,
          idle: growing ? "water" : "feed",
        },
  );
  let leave = T.workFrom;
  if (stayedHome) {
    stops.push({ time: T.breakfast, place: SPOUSE_KITCHEN, idle: "eat" });
    stops.push({ time: T.breakfast + 30, place: SPOUSE_ROOM, idle });
  } else {
    // The old route is read on a dry day, so a rain route never leaks in.
    const old = planDay(v, { ...ctx, weather: "sunny" }).stops;
    const work = workStops(old, v);
    const first = work[0];
    if (!first) {
      stops.push({ time: T.breakfast, place: SPOUSE_KITCHEN, idle: "eat" });
      stops.push({ time: T.breakfast + 30, place: SPOUSE_ROOM, idle });
    } else {
      // Arrive on time when the walk allows it, else as soon as the walk ends.
      const walk = travelMinutes(areaOf(first.place));
      first.time = Math.max(first.time, T.leaveFloor + walk);
      leave = first.time - walk;
      stops.push({ time: T.breakfast, place: SPOUSE_KITCHEN, idle: "eat" });
      stops.push({ time: leave, place: `road:${areaOf(first.place)}` });
      stops.push(...work.map((s) => ({ ...s, time: Math.max(s.time, leave) })));
      const last = work[work.length - 1]!;
      stops.push({ time: T.workUntil, place: `road:${areaOf(last.place)}` });
    }
  }
  stops.push(
    fair
      ? { time: T.home, place: SPOUSE_CORNER, idle }
      : { time: T.home, place: SPOUSE_ROOM, idle },
  );
  if (fair) stops.push({ time: T.indoors, place: SPOUSE_ROOM, idle });
  const ordered = stops.sort((a, b) => a.time - b.time);
  return { stops: ordered, bed: T.bed, stayedHome };
}

/**
 * The person as a villager on the spouse route: the same row with the route,
 * rain route and overrides replaced, and the farm bed as home. The scene and
 * `whereAt` read it like any villager (no special case downstream).
 */
export function spouseVillager(
  v: Villager,
  day: number,
  weather: Weather,
): Villager {
  const plan = spousePlan(v, day, weather);
  return {
    ...v,
    home: SPOUSE_BED,
    bed: plan.bed,
    route: plan.stops,
    rain: plan.stops,
    weekday: [],
    season: [],
  };
}

/** The villager row to read on `day`: the spouse-route one when it applies, else the row itself. */
export function villagerForDay(
  g: Partial<Married>,
  v: Villager,
  day: number,
  weather: Weather,
): Villager {
  return onSpouseRoute(g, v.id, day) ? spouseVillager(v, day, weather) : v;
}

// ---- The prop block --------------------------------------------------------

export interface Prop {
  name: string;
  dx: number;
  dy: number;
  w: number;
  h: number;
}

/** The mark that places the 4 by 4 block (back right corner of the spouse room, note 85). */
export const PROPS_MARK = "spouse-props";
export const PROPS_SIZE = 4;

/** The placeholder props of a spouse, inside the 4 by 4 block. */
export function propsOf(id: string): Prop[] {
  const own = (spouseData.spouses as Record<string, { props?: unknown[][] }>)[
    id
  ]?.props;
  const rows = (own ?? spouseData.props.default) as [
    string,
    number,
    number,
    number,
    number,
  ][];
  return rows.map(([name, dx, dy, w, h]) => ({ name, dx, dy, w, h }));
}

// ---- The morning -----------------------------------------------------------

export interface SpouseNews {
  /** Crop tiles the spouse watered. */
  watered: number;
  /** Animals the spouse fed. */
  fed: number;
  /** Animals left unfed for want of hay in the silo. */
  short: number;
  /** True on the morning the 12.5 heart gift was left. */
  gift: boolean;
  /** The spouse's name, for the report. */
  name: string;
}

const dist2 = (x: number, y: number): number =>
  (x - spouseData.chores.door.x) ** 2 + (y - spouseData.chores.door.y) ** 2;

/**
 * Water a few crops near the house, growing seasons only, dry mornings only
 * (rain waters everything and winter has no crops in the open). Nearest first,
 * four to six tiles, never a full watering, never a repair (note 12).
 */
export function waterNearHouse(g: GameState, random: () => number): number {
  if (isRaining(g.weather) || dateOf(g.day.clock.day).season === "winter")
    return 0;
  const n = WATER_MIN + Math.floor(random() * (WATER_MAX - WATER_MIN + 1));
  const dry = [...g.farm.each()]
    .filter(
      (t) =>
        t.plot.crop &&
        !t.plot.wateredToday &&
        dist2(t.x, t.y) <= WATER_RADIUS * WATER_RADIUS,
    )
    .sort((a, b) => dist2(a.x, a.y) - dist2(b.x, b.y) || a.y - b.y || a.x - b.x)
    .slice(0, n);
  for (const t of dry) g.farm.water(t.x, t.y);
  return dry.length;
}

/** The 12.5 heart gift: an elderfruit, once per save (note 39 source 3). True when it was left. */
export function leaveGift(g: GameState): boolean {
  const id = spouseId(g);
  if (!id || hasFlag(g, SOURCE_FLAGS.spouse)) return false;
  if (g.friendship.points(id) < SPOUSE_PERK_HEARTS * HEART) return false;
  if (g.inventory.room(ELDERFRUIT) < 1) return false;
  g.inventory.add(ELDERFRUIT);
  setFlag(g, SOURCE_FLAGS.spouse);
  absorbElderfruit(g);
  return true;
}

/**
 * The spouse's part of the new morning, after the night has run. Only from the
 * morning after the wedding. Feeds hay only (the silo's, never the pack's) and
 * waters a few crops. Returns what was done, or undefined when not married.
 */
export function spouseMorning(
  g: GameState,
  random: () => number,
): SpouseNews | undefined {
  const id = spouseId(g);
  if (!id || g.day.clock.day <= g.marriage.weddingDay) return undefined;
  const fed = feedAll(g, undefined, false);
  return {
    watered: waterNearHouse(g, random),
    fed: fed.fed,
    short: fed.short,
    gift: leaveGift(g),
    name: villagerById(id)?.name ?? id,
  };
}

/** Report lines for the morning (placeholder text). */
export function spouseReportLines(n: SpouseNews | undefined): string[] {
  if (!n) return [];
  const lines: string[] = [];
  const bits: string[] = [];
  if (n.watered > 0)
    bits.push(`watered ${n.watered} ${n.watered === 1 ? "crop" : "crops"}`);
  if (n.fed > 0)
    bits.push(`fed ${n.fed === 1 ? "an animal" : `${n.fed} animals`}`);
  if (bits.length > 0)
    lines.push(`${n.name} ${bits.join(" and ")} this morning.`);
  if (n.short > 0)
    lines.push(
      `${n.name} found no hay for ${n.short === 1 ? "one animal" : `${n.short} animals`}.`,
    );
  if (n.gift) lines.push(spouseData.perk.line.replace("{name}", n.name));
  return lines;
}

// ---- The kiss and the lines ------------------------------------------------

const fill = (text: string, name: string): string =>
  text.replace("{name}", name);

/** The daily line by heart level, placeholder text from data. */
export function spouseLine(
  g: Pick<GameState, "friendship">,
  id: string,
  day: number,
): string {
  const name = villagerById(id)?.name ?? id;
  const hearts = g.friendship.hearts(id);
  let tier = spouseData.lines[0]!;
  for (const t of spouseData.lines) if (hearts >= t.from) tier = t;
  return fill(tier.lines[day % tier.lines.length]!, name);
}

/**
 * The daily kiss: the first one each day gives energy (Stardew, SC-180). Later
 * ones on the same day do nothing. Returns the energy gained, or undefined when
 * the person is not the spouse or has been kissed today.
 */
export function kiss(g: GameState, id: string): number | undefined {
  if (spouseId(g) !== id) return undefined;
  const day = g.day.clock.day;
  if (g.marriage.kissDay === day) return undefined;
  g.marriage.kissDay = day;
  const before = g.day.energy.current;
  g.day.energy.restore(KISS_ENERGY);
  return g.day.energy.current - before;
}

export const kissLine = (id: string): string =>
  fill(spouseData.kissLine, villagerById(id)?.name ?? id);

/**
 * A gentle jealousy line: the player gives a gift that was not hated to another
 * candidate who took a bouquet. One line, no penalty (note 12).
 */
export function jealousyLine(g: GameState, to: string, taste: string): string {
  const spouse = spouseId(g);
  if (!spouse || to === spouse || taste === "hate") return "";
  if (!g.friendship.hasBouquet(to)) return "";
  const name = villagerById(spouse)?.name ?? spouse;
  return spouseData.jealousy.replace("{spouse}", name);
}
