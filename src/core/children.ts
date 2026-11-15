import data from "../content/children.json";
import { dateOf } from "./calendar";
import { HEART, TALK_POINTS } from "./friendship";
import { isChildId, MAX_CHILDREN, type Child } from "./marriage";
import type { GameState } from "./save";
import {
  dayContext,
  parseStop,
  parseTime,
  whereAt,
  type Stop,
  type Villager,
} from "./villagers";

/**
 * Children (note 12, slice 5, #938; notes 41, 85, 61, 79, 80). Pure rules.
 * Children are by the player's choice only, never automatic and never pressed.
 * The ask comes from the spouse after bed, once the nursery exists (house tier
 * 2). A child has hearts that grow and a line or two, walks a route like any
 * villager, and has no needs, no neglect and no chores. A child stays with the
 * player after a divorce. Numbers, names and lines are placeholders in
 * `children.json` (note 07). Child sprites are M3d.
 */

export { isChildId, MAX_CHILDREN };

/** The house tier that adds the nursery (note 85). */
export const NURSERY_TIER = 2;
export const ASK_AFTER_WEDDING_DAYS = data.ask.afterWeddingDays;
export const ASK_GAP_DAYS = data.ask.gapDays;
export const ARRIVAL_DAYS = data.ask.arrivalDays;
/** Hearts a child can reach. */
export const CHILD_HEART_CAP = data.heartCap;

export type Stage = "baby" | "toddler" | "child";

const fill = (text: string, name: string): string =>
  text.replace("{name}", name).replace("{child}", name);

// ---- The ask ---------------------------------------------------------------

/**
 * Whether the spouse may ask about a child today: married and not divorcing,
 * the nursery built, a free bed, no child already on the way, a week since the
 * wedding, and a week since the last ask. "Not now" therefore never blocks a
 * later ask and the ask is never pressed.
 */
export function childAskDue(
  g: Pick<GameState, "marriage" | "houseTier" | "day">,
): boolean {
  const m = g.marriage;
  const day = g.day.clock.day;
  if (!m.married || !m.spouse || m.divorcing) return false;
  if (g.houseTier < NURSERY_TIER) return false;
  if (m.children + (m.childDue > 0 ? 1 : 0) >= MAX_CHILDREN) return false;
  if (m.childDue > 0) return false;
  if (day < m.weddingDay + ASK_AFTER_WEDDING_DAYS) return false;
  if (m.askDay > 0 && day < m.askDay + ASK_GAP_DAYS) return false;
  return true;
}

/** The ask's words (placeholder text), with the spouse's name. */
export const askText = (name: string): string => fill(data.ask.text, name);

/**
 * The player's answer. Either answer counts as asked today, so the next ask is
 * a gap away. A yes sets the arrival `ARRIVAL_DAYS` on. Returns the reply line,
 * or "" when no ask was due.
 */
export function answerAsk(
  g: GameState,
  yes: boolean,
  spouseName: string,
): string {
  if (!childAskDue(g)) return "";
  const day = g.day.clock.day;
  g.marriage.askDay = day;
  if (yes) g.marriage.childDue = day + ARRIVAL_DAYS;
  return fill(yes ? data.ask.yes : data.ask.notNow, spouseName);
}

// ---- The morning -----------------------------------------------------------

export interface ChildNews {
  /** The name of the child that arrived this morning. */
  name: string;
}

/** A child due today (or overdue) arrives in the nursery. Returns it, or undefined. */
export function childMorning(g: GameState): ChildNews | undefined {
  const m = g.marriage;
  if (m.childDue === 0 || g.day.clock.day < m.childDue) return undefined;
  m.childDue = 0;
  // A child cannot arrive after a divorce or without the nursery: the ask restarts.
  if (!m.married || g.houseTier < NURSERY_TIER) return undefined;
  const kid = m.addChild(g.day.clock.day);
  return kid ? { name: kid.name } : undefined;
}

/** Report lines for the morning (placeholder text). */
export function childReportLines(n: ChildNews | undefined): string[] {
  return n ? [fill(data.arrival, n.name)] : [];
}

// ---- The child -------------------------------------------------------------

export const childById = (
  g: Pick<GameState, "marriage">,
  id: string,
): Child | undefined => g.marriage.kids.find((k) => k.id === id);

/** Days since the child arrived. */
export const ageOf = (c: Child, day: number): number =>
  Math.max(0, day - c.born);

/** Baby, toddler or child by age (`children.json`). */
export function stageOf(c: Child, day: number): Stage {
  const age = ageOf(c, day);
  let out = data.stages[0]!.id;
  for (const s of data.stages) if (age >= s.from) out = s.id;
  return out as Stage;
}

export const childHearts = (c: Child): number => Math.floor(c.points / HEART);

const slotOf = (c: Child): string => c.id.slice(6);

const ROUTES = data.routes as Record<Stage, { bed: string; stops: string[] }>;

/**
 * The child as a villager row, so `whereAt` and the scene read it like anyone
 * else (no per-child code beyond the data): the stage's route with the child's
 * slot filled into the bed and the play spot.
 */
export function childVillager(c: Child, day: number): Villager {
  const stage = stageOf(c, day);
  const route = ROUTES[stage];
  const stops: Stop[] = route.stops.map((s) =>
    parseStop(s.replace("{n}", slotOf(c))),
  );
  const crib = stage === "baby";
  const home = crib
    ? "farm:house/child-crib"
    : `farm:house/child-bed-${slotOf(c)}`;
  const born = dateOf(c.born);
  return {
    id: c.id,
    name: c.name,
    role: "child",
    ageBand: "child",
    birthday: { season: born.season, day: born.dayOfSeason },
    candidate: false,
    heartCap: CHILD_HEART_CAP,
    home,
    bed: parseTime(route.bed),
    route: stops,
    rain: stops,
    weekday: [],
    season: [],
  };
}

/** Where a child is at a game-clock minute, with the stage's route. */
export function childWhere(
  g: Pick<GameState, "weather">,
  c: Child,
  day: number,
  minutes: number,
) {
  return whereAt(childVillager(c, day), dayContext(day, g.weather), minutes);
}

/** Every child with their tile on `mapId` now: nobody asleep, none off the map. */
export function childrenOn(
  g: Pick<GameState, "weather" | "marriage" | "houseTier">,
  mapId: string,
  day: number,
  minutes: number,
): { id: string; name: string; x: number; y: number }[] {
  if (g.houseTier < NURSERY_TIER) return [];
  const out: { id: string; name: string; x: number; y: number }[] = [];
  for (const c of g.marriage.kids) {
    const w = childWhere(g, c, day, minutes);
    if (w.asleep || w.where.transit || w.where.map !== mapId) continue;
    out.push({ id: c.id, name: c.name, x: w.where.x, y: w.where.y });
  }
  return out;
}

// ---- Talking ---------------------------------------------------------------

export interface ChildTalk {
  message: string;
  /** True when hearts were gained today. */
  gained: boolean;
}

/**
 * Talk to a child: a line by stage, and a small heart gain once a day (the
 * villager talk points), up to the child's cap. There are no needs and no
 * penalty for staying away.
 */
export function talkToChild(g: GameState, id: string): ChildTalk {
  const c = childById(g, id);
  if (!c) return { message: "", gained: false };
  const day = g.day.clock.day;
  const tail = ` (${childHearts(c)} ${childHearts(c) === 1 ? "heart" : "hearts"})`;
  if (c.talkDay === day)
    return { message: fill(data.already, c.name) + tail, gained: false };
  c.talkDay = day;
  c.points = Math.min(c.points + TALK_POINTS, CHILD_HEART_CAP * HEART);
  const lines = data.lines[stageOf(c, day)];
  return {
    message: fill(lines[day % lines.length]!, c.name) + `${tail}`,
    gained: true,
  };
}

/** The line shown when a divorce takes effect and children stay (placeholder). */
export const childDivorceLine = (spouseName: string): string =>
  fill(data.divorce, spouseName);
