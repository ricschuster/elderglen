import data from "../content/ice-fishing.json";
import { dateOf } from "./calendar";
import type { Festival } from "./festivals";
import { leaveFestival } from "./festivals";
import {
  RIVALS,
  endsAfterMainEvent,
  festivalLayout,
  type Tile,
} from "./festivalroutes";
import type { Bite, FishDef } from "./fishing";
import type { GameState } from "./save";
import { parseTime } from "./villagers";

/**
 * The Frostday ice fishing contest (note 82, owner decisions 2026-11-12): catch
 * `win` fish at the twelve ice holes, judged by Cuthbert, else Rushie wins. The
 * Frostfin is a festival fish that bites only at the holes and counts too. Only
 * Forest lake fish cast into a hole tile count (not the river). Pure rules; the
 * scene counts catches and asks for the judging.
 */

export const ICE_FISHING = data;
export const ICE_HOST = "cuthbert";

/** The Frostfin as a fish, kept out of `fish.json` so no other water offers it. */
export const FROSTFIN: FishDef = {
  id: data.frostfin.id,
  name: data.frostfin.name,
  water: "forest-lake",
  seasons: ["winter"],
  time: "any",
  rarity: "rare",
  behaviour: data.frostfin.behaviour as FishDef["behaviour"],
  difficulty: data.frostfin.difficulty,
  sellPrice: data.frostfin.sellPrice,
  length: data.frostfin.length as [number, number],
};

const holesOf = (f: Festival): readonly Tile[] =>
  festivalLayout(f)?.holes ?? [];

export const isHole = (f: Festival, x: number, y: number): boolean =>
  holesOf(f).some((t) => t[0] === x && t[1] === y);

/** The lake is shut before the festival opens (decision 12). */
export const lakeShut = (f: Festival, minutes: number): boolean =>
  minutes < f.opens;

export type IceStatus = "fishing" | "won" | "lost";

export interface IceFishing {
  festival: Festival;
  caught: number;
  win: number;
  status: IceStatus;
}

/** The on-screen count while the contest runs, for the status line. */
export const iceCounter = (s: IceFishing): string =>
  s.status === "fishing" ? `Ice fish ${s.caught}/${s.win}` : "";

/** Begin a contest. Always possible while the festival runs. */
export function startIceFishing(f: Festival): IceFishing | undefined {
  if (f.id !== "frostday") return undefined;
  return { festival: f, caught: 0, win: data.win, status: "fishing" };
}

/**
 * Count a landed fish. It counts only from the Forest lake and only when the cast
 * went into a hole tile. Returns true if it counted.
 */
export function noteHoleCatch(
  s: IceFishing,
  water: string | undefined,
  atHole: boolean,
): boolean {
  if (s.status !== "fishing" || !atHole || water !== "forest-lake")
    return false;
  s.caught += 1;
  return true;
}

/**
 * At a hole the Frostfin sometimes bites in place of a fish. Never on the tutorial
 * cast or in place of trash and finds.
 */
export function iceBite(
  b: Bite,
  tutorial: boolean,
  random: () => number,
): Bite {
  if (tutorial || b.kind !== "fish") return b;
  return random() < data.frostfinChance ? { kind: "fish", fish: FROSTFIN } : b;
}

/** The latest the player may wait: from here a short count loses to the rival. */
export const judgeAt = parseTime(data.judgeAt);

/** The result of being judged at a minute. Reaching `win` wins any time, a short count loses from `judgeAt`. */
export function judge(s: IceFishing, minutes: number): IceStatus {
  if (s.status !== "fishing") return s.status;
  if (s.caught >= s.win) s.status = "won";
  else if (minutes >= judgeAt) s.status = "lost";
  return s.status;
}

/** Who wins: the player, or the festival's rival. */
export function iceWinner(s: IceFishing): string | undefined {
  if (s.status === "won") return "player";
  if (s.status === "lost") return RIVALS[s.festival.id];
  return undefined;
}

/** End the festival at once after the judging (Stardew's contest ends it). */
export function finishIceFishing(g: GameState, s: IceFishing): boolean {
  if (s.status === "fishing" || !endsAfterMainEvent(s.festival)) return false;
  leaveFestival(g);
  return true;
}

const winKey = (day: number) => `icefish-win:${dateOf(day).year}`;
const HAT_KEY = "icefish-hat";

export interface IcePrize {
  hat?: string;
  frostfin: boolean;
}

/**
 * Pay out a won contest: the first win ever gives the hat, each year's first win a
 * Frostfin (kept for the year if the pack is full). Undefined when nothing is owed.
 */
export function awardIcePrize(
  g: GameState,
  s: IceFishing,
): IcePrize | undefined {
  if (s.status !== "won") return undefined;
  const out: IcePrize = { frostfin: false };
  if (!g.festivalsJoined.includes(HAT_KEY)) {
    g.festivalsJoined.push(HAT_KEY);
    if (g.wardrobe.add(data.hat)) out.hat = data.hat;
  }
  const key = winKey(g.day.clock.day);
  if (
    !g.festivalsJoined.includes(key) &&
    g.inventory.add(data.frostfin.id, 1)
  ) {
    g.festivalsJoined.push(key);
    out.frostfin = true;
  }
  return out.hat || out.frostfin ? out : undefined;
}

/** What Cuthbert says and does when talked to. Undefined when it is not the contest. */
export function iceOffer(
  s: IceFishing | undefined,
  who: string,
  minutes: number,
): string | undefined {
  if (!s || who !== ICE_HOST) return undefined;
  if (lakeShut(s.festival, minutes)) return "The lake opens at noon.";
  if (judge(s, minutes) === "fishing")
    return `You have ${s.caught} of ${s.win}. Keep fishing at the holes, then come back.`;
  return iceEndLine(s);
}

export function iceEndLine(s: IceFishing): string | undefined {
  const winner = iceWinner(s);
  if (!winner) return undefined;
  return winner === "player"
    ? `${s.caught} fish at the holes. You win the contest!`
    : `Only ${s.caught} fish. ${winner[0]!.toUpperCase()}${winner.slice(1)} wins the contest.`;
}

/** The counter shown while fishing at the holes. */
export const iceLine = (s: IceFishing): string =>
  `Ice fishing: ${s.caught}/${s.win}`;
