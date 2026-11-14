import { dateOf } from "./calendar";
import { festivalDayToday, inZone, type Zone } from "./festivals";
import {
  PARADE_JOIN_CUTOFF,
  PARADE_LINE,
  PARADE_START,
  PARADE_TAIL,
  along,
  paradeLaps,
  paradeSteps,
  type Tile,
} from "./festivalroutes";
import type { GameState } from "./save";

/**
 * The player's part in the Hat Parade march (`docs/design/82_festival_locations.md`,
 * "Hat Parade on the Hearthwell street"). The march is auto-play: a player on the
 * square in a hat between 14:00 and 14:30 falls in at the tail of the line, input
 * off, and the script walks them out to the turn and back with the villagers. A late
 * player (after 14:00) makes the villagers do one extra lap. Once a year the march
 * earns +20 friendship with each villager who marched (a placeholder to tune).
 * Pure rules; the scene only moves the farmer along `playerMarchAt`.
 */

export const PARADE_FESTIVAL = "hat-parade";
export const PARADE_MAP = "hearthwell";
/** The square, where the crowd stands and the line forms (x 64 to 80, y 54 to 70). */
export const PARADE_SQUARE: Zone = { x: 64, y: 54, w: 17, h: 17 };
/** Friendship with each marcher for marching, once a year (placeholder). */
export const PARADE_FRIENDSHIP = 20;

const JOIN = "hat-parade-march";
const PAID = "hat-parade-friends";

const year = (g: Pick<GameState, "day">): number =>
  dateOf(g.day.clock.day).year;

/** Where and when the player fell into this year's line: the minute and the tile they stood on. */
export interface Joined {
  at: number;
  stand: Tile;
}

/** This year's join, if the player marched (or is marching). */
export function paradeJoin(
  g: Pick<GameState, "day" | "festivalsJoined">,
): Joined | undefined {
  const prefix = `${JOIN}:${year(g)}:`;
  const key = g.festivalsJoined.find((k) => k.startsWith(prefix));
  if (!key) return undefined;
  const [at, x, y] = key.slice(prefix.length).split(":").map(Number);
  return { at: at!, stand: [x!, y!] };
}

/** The minute the player joined, for `FestivalOpts.paradeJoinedAt` (the extra lap). */
export const paradeJoinedAt = (
  g: Pick<GameState, "day" | "festivalsJoined">,
): number | undefined => paradeJoin(g)?.at;

/** Why the player cannot fall into the line here and now, or undefined when they can. */
export function paradeJoinProblem(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): string | undefined {
  if (festivalDayToday(g.day.clock.day)?.id !== PARADE_FESTIVAL)
    return "There is no march today.";
  if (mapId !== PARADE_MAP || !inZone(PARADE_SQUARE, x, y))
    return "The march forms on the square.";
  if (paradeJoin(g)) return "You have marched today.";
  if (g.day.clock.minutes < PARADE_START)
    return "The march forms at two o'clock.";
  if (g.day.clock.minutes > PARADE_JOIN_CUTOFF)
    return "The march has gone by. You watch it from the square.";
  if (g.wardrobe.wornOf("hat") === undefined)
    return "Wear a hat to join the march.";
  return undefined;
}

/** Fall in at the tail from a tile. Returns the problem, or undefined once joined. */
export function joinParade(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): string | undefined {
  const problem = paradeJoinProblem(g, mapId, x, y);
  if (problem) return problem;
  g.festivalsJoined.push(`${JOIN}:${year(g)}:${g.day.clock.minutes}:${x}:${y}`);
  return undefined;
}

/** The player's timed path: tail of the last lap, walking in from where they stood and back. */
function steps(j: Joined) {
  const laps = paradeLaps(j.at);
  return paradeSteps(j.stand, PARADE_TAIL, laps[laps.length - 1]!);
}

/** The game minute the player's march is over and control returns. */
export const paradeEnd = (j: Joined): number => {
  const s = steps(j);
  return s[s.length - 1]!.t;
};

/**
 * Where the scripted player is at a game minute: `held` while they wait for the
 * line at the tile they joined on, `tile` on the march, `done` once it is over.
 */
export function playerMarchAt(
  j: Joined,
  minutes: number,
): { state: "waiting" | "marching" | "done"; tile: Tile } {
  const s = steps(j);
  if (minutes < s[0]!.t) return { state: "waiting", tile: j.stand };
  if (minutes > s[s.length - 1]!.t) return { state: "done", tile: j.stand };
  return { state: "marching", tile: along(s, minutes) ?? j.stand };
}

/**
 * The march is over: +20 friendship with each marcher, once a year. Returns the
 * line to show (Cuthbert's closing words).
 */
export function finishParade(g: GameState): string {
  const key = `${PAID}:${year(g)}`;
  if (g.festivalsJoined.includes(key))
    return "Cuthbert: Well marched. The square is yours again.";
  g.festivalsJoined.push(key);
  for (const id of PARADE_LINE) g.friendship.award(id, PARADE_FRIENDSHIP);
  return "Cuthbert: Well marched, everyone. The whole village cheered you home.";
}
