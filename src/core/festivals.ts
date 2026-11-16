import festivalData from "../content/festivals.json";
import { DAYS_PER_SEASON, SEASONS, dateOf, type Season } from "./calendar";
import { hatById } from "./hats";
import { absorbElderfruit } from "./elderfruit";
import { ELDERFRUIT, itemById } from "./items";
import { mazeForYear } from "./maze";
import type { GameState } from "./save";
import { showTokens, spendTokens } from "./showing";
import { hasFlag, setFlag } from "./worldflags";

/** One line of a festival's counter: an item or a hat, at a price. */
export interface CounterEntry {
  item?: string;
  hat?: string;
  /** A crafting recipe id, taught on purchase (raises `recipeFlag`) and sold out after. */
  recipe?: string;
  /** How many of the item one purchase gives. Defaults to 1. */
  count?: number;
  /** Paid in show tokens (Harvest Showing) instead of gold. */
  tokens?: boolean;
  /** A world flag that is raised on purchase, after which the line is sold out (the elderfruit, note 39). */
  once?: string;
  price: number;
}

/** What a festival offers besides its counter. */
export type FestivalActivity = "showing" | "maze" | "sights";

/** A thing to look at or someone to talk to, with a line. */
export interface Sight {
  name: string;
  line: string;
}

/** A rectangle of map tiles. */
export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A map id and the zone of it the festival uses. */
export interface FestivalPlace {
  map: string;
  zone: Zone;
}

/** A dated village event. Content lives in `src/content/festivals.json`. */
export interface Festival {
  id: string;
  name: string;
  season: Season;
  /** Day of the season, 1 to DAYS_PER_SEASON (the first day, for a span). */
  day: number;
  /** The last day of a multi-day festival (the Night Market). Defaults to `day`. */
  lastDay?: number;
  /**
   * An evening festival that does not take over the day (the Night Market):
   * shops and homes keep their hours, the clock runs and the green stays quiet.
   */
  evening?: boolean;
  /** Where the festival is held (note 82). Not the same as `map`, the built screen. */
  place: FestivalPlace;
  /** A better place used once its requirement is met (Midwinter Feast in the hall). */
  placeUpgrade?: FestivalPlace & { requires: "hall-restored" };
  /** Minutes since midnight when the festival opens and closes. */
  opens: number;
  closes: number;
  /** Time of day when the player is back outside after leaving (10 pm). */
  ends: number;
  blurb: string;
  /** A free hat given the first time the player goes, if any. */
  gift?: { hat: string };
  /** A festival activity: the Harvest Showing table, the Hollow Eve maze, or things to look at. */
  activity?: FestivalActivity;
  /** Things to look at, for the `sights` activity, or the villagers on the festival's map. */
  sights?: Sight[];
  /**
   * A map the festival is played on, in place of the screen (note 66). Its
   * door leads there, every other door on it is shut, and time stands still.
   */
  map?: string;
  /** The map and zone used in even years instead (the larger Hollow Eve maze, note 82). */
  evenYear?: { map: string; zone: Zone };
  /** What the festival's counter sells. Hats sell once, items without limit. */
  counter: CounterEntry[];
  /**
   * Lines that rotate by year (Harvest Showing, note 66): `perYear` of the `pool`
   * join the counter, taken in order from where the last year stopped, so the
   * pool cycles and a year always shows the same ones.
   */
  rotation?: { perYear: number; pool: CounterEntry[] };
  /** Id of the festival game, or null for none (see `11_minigames.md`). */
  minigame: string | null;
}

export const FESTIVALS = festivalData as Festival[];

/** The counter lines of a festival in a game year (1 based): the fixed ones, then the year's rotation. */
export function counterOf(f: Festival, year: number): CounterEntry[] {
  const r = f.rotation;
  if (!r || r.pool.length === 0) return f.counter;
  const picks: CounterEntry[] = [];
  for (let i = 0; i < Math.min(r.perYear, r.pool.length); i++)
    picks.push(
      r.pool[((Math.max(1, year) - 1) * r.perYear + i) % r.pool.length]!,
    );
  return [...f.counter, ...picks];
}

/** The festival on a calendar day, if there is one. */
export function festivalOn(
  season: Season,
  dayOfSeason: number,
): Festival | undefined {
  return FESTIVALS.find(
    (f) =>
      f.season === season &&
      dayOfSeason >= f.day &&
      dayOfSeason <= (f.lastDay ?? f.day),
  );
}

/** The festival on a game day (1 based, as in `Clock.day`), if any. */
export function festivalToday(day: number): Festival | undefined {
  const { season, dayOfSeason } = dateOf(day);
  return festivalOn(season, dayOfSeason);
}

/**
 * The festival that takes over today (shops shut, clock stands still), if any.
 * The Night Market is an evening festival and does not.
 */
export function festivalDayToday(day: number): Festival | undefined {
  const f = festivalToday(day);
  return f && !f.evening ? f : undefined;
}

/** Where the festival is held, given whether the hall is fully restored. */
export function festivalPlace(
  f: Festival,
  hallRestored: boolean,
  year = 1,
): FestivalPlace {
  if (f.evenYear && year % 2 === 0) return f.evenYear;
  return f.placeUpgrade && hallRestored ? f.placeUpgrade : f.place;
}

/** The built map a festival is played on in a year (the even-year maze differs), if it has one. */
export const festivalMapFor = (f: Festival, year = 1): string | undefined =>
  f.evenYear && year % 2 === 0 ? f.evenYear.map : f.map;

export const inZone = (z: Zone, x: number, y: number): boolean =>
  x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;

/**
 * Note 82 decision 12: a festival's place cannot be entered before it opens.
 * True when `tile` on `mapId` is in today's festival place and it is earlier
 * than the opening time. Only the festival zone is shut, not the whole map,
 * because the Forest and the delta are also roads (the note leaves this open;
 * this is the placeholder choice). Evening festivals never shut.
 */
export function festivalAreaShut(
  day: number,
  minutes: number,
  mapId: string,
  x: number,
  y: number,
  hallRestored = false,
): boolean {
  const f = festivalDayToday(day);
  if (!f || minutes >= f.opens) return false;
  const p = festivalPlace(f, hallRestored, dateOf(day).year);
  return p.map === mapId && inZone(p.zone, x, y);
}

/** Where the player stands: a map and a tile. */
export interface MapTile {
  map: string;
  x: number;
  y: number;
}

/**
 * Whether the player may not step from `from` to `to` because `to` is in a
 * festival place that is not open yet (note 82 decision 12). A player already
 * inside the shut zone is never blocked, so nobody is stranded, and moving
 * within the zone stays allowed. A missing `from` counts as outside.
 */
export function festivalStepShut(
  day: number,
  minutes: number,
  from: MapTile | undefined,
  to: MapTile,
  hallRestored = false,
): boolean {
  if (!festivalAreaShut(day, minutes, to.map, to.x, to.y, hallRestored))
    return false;
  const inside =
    from !== undefined &&
    festivalAreaShut(day, minutes, from.map, from.x, from.y, hallRestored);
  return !inside;
}

/** A clock time as "12 pm". */
function clockTextOf(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

/** The placeholder line shown at a shut festival place (opening time of the day's festival). */
export function festivalShutLine(day: number): string {
  const f = festivalDayToday(day);
  if (!f) return "";
  const h = Math.floor(f.opens / 60);
  const m = f.opens % 60;
  const when = `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
  return `Setting up for the ${f.name}. Opens at ${when}.`;
}

/** True while the festival is open at this time on its day. */
export function festivalOpen(f: Festival, minutes: number): boolean {
  return minutes >= f.opens && minutes < f.closes;
}

/** The next festival after `day`, searching a full year ahead. */
export function nextFestival(
  day: number,
): { festival: Festival; day: number } | undefined {
  const year = DAYS_PER_SEASON * SEASONS.length;
  for (let d = day + 1; d <= day + year; d++) {
    const festival = festivalToday(d);
    if (festival) return { festival, day: d };
  }
  return undefined;
}

/**
 * Leave the festival. As in Stardew the player is put back where they went in,
 * and the clock has moved on to the festival's end. The day does not end.
 */
export function leaveFestival(g: GameState): void {
  const f = festivalToday(g.day.clock.day);
  if (f) g.day.clock.advance(Math.max(f.ends - g.day.clock.minutes, 0));
}

/** Key for "went to this festival this year", stored in the save. */
export function joinKey(f: Festival, day: number): string {
  return `${f.id}:${dateOf(day).year}`;
}

/** Why the player cannot go to a festival now, or undefined if they can. */
export function enterProblem(g: GameState): string | undefined {
  const f = festivalDayToday(g.day.clock.day);
  if (!f) return "There is no festival today.";
  if (g.day.clock.minutes < f.opens) return `${f.name} has not started yet.`;
  if (g.day.clock.minutes >= f.closes) return `${f.name} is over for today.`;
  return undefined;
}

/**
 * Go to today's festival and remember it for the year. As in Stardew, time
 * stands still while the player is there; see `leaveFestival`. Returns the festival, or undefined (nothing changed) if
 * the player cannot go.
 */
export function enterFestival(g: GameState): Festival | undefined {
  if (enterProblem(g)) return undefined;
  const day = g.day.clock.day;
  const f = festivalToday(day)!;
  const key = joinKey(f, day);
  if (!g.festivalsJoined.includes(key)) g.festivalsJoined.push(key);
  if (f.gift) g.wardrobe.add(f.gift.hat);
  return f;
}

/** The world flag a bought recipe raises (the recipe's `flag` source names the same one). */
export const recipeFlag = (recipeId: string) => `recipe:${recipeId}`;

/** The counter line's name, for the screen. */
export function counterName(e: CounterEntry): string {
  if (e.recipe) return `${itemById(e.recipe)?.name ?? e.recipe} recipe`;
  if (e.hat) return hatById(e.hat)?.name ?? e.hat;
  const name = (e.item && itemById(e.item)?.name) || e.item || "";
  return e.count && e.count > 1 ? `${e.count} ${name.toLowerCase()}` : name;
}

/** Why the player cannot buy this counter line now, or undefined if they can. */
export function counterProblem(
  g: GameState,
  f: Festival,
  e: CounterEntry,
): string | undefined {
  if (!counterOf(f, dateOf(g.day.clock.day).year).includes(e))
    return "That is not on sale here.";
  if (!g.festivalsJoined.includes(joinKey(f, g.day.clock.day)))
    return "Go to the festival first.";
  if (e.hat && g.wardrobe.has(e.hat)) return "You already have that hat.";
  if (e.recipe && hasFlag(g, recipeFlag(e.recipe)))
    return "You already know that recipe.";
  if (e.once && hasFlag(g, e.once))
    return "Sold out. You have bought one already.";
  if (e.tokens) {
    if (showTokens(g) < e.price)
      return `You need ${e.price - showTokens(g)} more show tokens.`;
  } else if (g.money < e.price) return `You need ${e.price - g.money}g more.`;
  if (e.item && g.inventory.room(e.item) < (e.count ?? 1))
    return "Your pack is full.";
  return undefined;
}

/** Buy a counter line. Returns false (nothing changed) if it cannot be bought. */
export function buyAtCounter(
  g: GameState,
  f: Festival,
  e: CounterEntry,
): boolean {
  if (counterProblem(g, f, e) !== undefined) return false;
  if (e.hat) g.wardrobe.add(e.hat);
  else if (e.recipe) setFlag(g, recipeFlag(e.recipe));
  else if (e.item && !g.inventory.add(e.item, e.count ?? 1)) return false;
  if (e.tokens) spendTokens(g, e.price);
  else g.money -= e.price;
  if (e.once) setFlag(g, e.once);
  if (e.item === ELDERFRUIT) absorbElderfruit(g);
  return true;
}

/** The entry on every farm map where the player stands again after a festival map. */
export const FESTIVAL_RETURN = "from_festival";

/**
 * The plain walk (note 82 decision 11). A festival with its own map is reached
 * by walking: its door in Hearthwell opens only while the festival is today's.
 * The hold name is `festival-gate-<map>`, for the green and the hedge map.
 */
export const festivalGate = (mapId: string): string =>
  `festival-gate-${mapId.replace(/-even$/, "")}`;

/** The gate holds on a game day: one for today's festival map, none on other days. */
export function festivalGateHolds(day: number): string[] {
  const f = festivalDayToday(day);
  const map = f && festivalMapFor(f, dateOf(day).year);
  return map ? [festivalGate(map)] : [];
}

/** Where a festival map is, for the farm sign and the shut door. */
const MAP_WHERE: Readonly<Record<string, string>> = {
  green: "the green, east of the square in Hearthwell",
  hedge: "the hedge maze, at the east end of the green in Hearthwell",
  "hedge-even": "the hedge maze, at the east end of the green in Hearthwell",
};

/**
 * What the farm sign says on a festival day: where to walk and when. The farm
 * no longer sends the player there (decision 11).
 */
export function festivalSignLine(day: number, minutes: number): string {
  const f = festivalDayToday(day);
  if (!f) return "The notice board is quiet today.";
  const map = festivalMapFor(f, dateOf(day).year);
  const where = (map && MAP_WHERE[map]) || "the village";
  if (minutes >= f.closes) return `${f.name} is over for today.`;
  return `${f.name} is today at ${where}. It runs from ${clockTextOf(f.opens)} to ${clockTextOf(f.closes)}. Walk there.`;
}

/** Arriving on a festival map on foot: joins the festival, or says why not (undefined means in). */
export function walkIntoFestival(
  g: GameState,
  mapId: string,
): string | undefined {
  if (festivalOfMap(mapId) === undefined) return undefined;
  const problem = enterProblem(g);
  if (problem) return problem;
  enterFestival(g);
  return undefined;
}

/** The festival whose map this is, if it is a festival map. */
export function festivalOfMap(mapId: string): Festival | undefined {
  return FESTIVALS.find((f) => f.map === mapId || f.evenYear?.map === mapId);
}

/** True for a map that only exists for a festival: the green and the hedge maze. */
export const isFestivalMap = (mapId: string): boolean =>
  festivalOfMap(mapId) !== undefined;

/**
 * The line for a villager or decoration on a festival map, by service id. The
 * green's villagers are `sight-N` (the festival's `sights`), and the hedge's
 * are `scare-x`, `talk-x` and `sign-x` (the maze file). Undefined for any other id.
 */
export function sightLine(
  f: Festival,
  id: string,
  year = 1,
): string | undefined {
  const n = /^sight-(\d+)$/.exec(id);
  if (n) return f.sights?.[Number(n[1])]?.line;
  const m = /^(scare|talk|sign)-(.)$/.exec(id);
  if (m && f.activity === "maze")
    return (
      m[1] === "scare"
        ? mazeForYear(year).scares
        : m[1] === "sign"
          ? mazeForYear(year).signs
          : mazeForYear(year).talkers
    )[m[2]!];
  return undefined;
}
