import prize from "../content/hunt-prize.json";
import { dateOf } from "./calendar";
import type { Festival } from "./festivals";
import {
  RIVALS,
  endsAfterMainEvent,
  festivalLayout,
  type SeedHunt,
  type Tile,
} from "./festivalroutes";
import { leaveFestival } from "./festivals";
import type { PlayerId } from "./players";
import type { GameState } from "./save";

/**
 * The Seedswap seed hunt (note 82, owner answers 2026-11-11 and decisions
 * 2026-11-12): 50 seconds, find 9 hidden packets to win, packets on one tile
 * set in odd years and another in even years. Cuthbert starts it, up to
 * `lastStart`. If the player fails, the rival (Linnet) wins, and either way
 * the festival ends after the hunt. Pure rules, the scene supplies the clock.
 * The one-player count is `startHunt`; with several players see `HuntContest` below (note 111 decision 4).
 */

const huntOf = (f: Festival): SeedHunt | undefined => festivalLayout(f)?.hunt;

/** The packet tiles for a game day: the odd set in odd years, the even set in even years. */
export function packetTiles(hunt: SeedHunt, day: number): readonly Tile[] {
  return dateOf(day).year % 2 === 1 ? hunt.odd : hunt.even;
}

/** Why the hunt cannot start now (minutes since midnight), or undefined if it can. */
export function huntStartProblem(
  f: Festival,
  minutes: number,
): string | undefined {
  const hunt = huntOf(f);
  if (!hunt) return "There is no seed hunt here.";
  if (minutes < f.opens) return "The fair has not opened yet.";
  if (minutes > hunt.lastStart) return "It is too late to start the hunt.";
  return undefined;
}

export type HuntStatus = "running" | "won" | "lost";

export interface HuntState {
  hunt: SeedHunt;
  packets: Tile[];
  found: number;
  /** Seconds left on the clock. */
  left: number;
  status: HuntStatus;
}

/** Start a hunt on a game day. Returns undefined if it cannot start. */
export function startHunt(
  f: Festival,
  day: number,
  minutes: number,
): HuntState | undefined {
  const hunt = huntOf(f);
  if (!hunt || huntStartProblem(f, minutes) !== undefined) return undefined;
  return {
    hunt,
    packets: packetTiles(hunt, day).map((t) => [...t] as unknown as Tile),
    found: 0,
    left: hunt.seconds,
    status: "running",
  };
}

/** Walk onto a tile: picks up a packet there. Wins at `win` packets. Returns true if one was found. */
export function pickUp(s: HuntState, x: number, y: number): boolean {
  if (s.status !== "running") return false;
  const i = s.packets.findIndex((t) => t[0] === x && t[1] === y);
  if (i < 0) return false;
  s.packets.splice(i, 1);
  s.found += 1;
  if (s.found >= s.hunt.win) s.status = "won";
  return true;
}

/** Run the clock down. Time out before `win` packets is a loss. */
export function tickHunt(s: HuntState, seconds: number): void {
  if (s.status !== "running") return;
  s.left = Math.max(0, s.left - seconds);
  if (s.left === 0) s.status = "lost";
}

/** Who wins: the player, or the festival's rival when the hunt was lost. */
export function huntWinner(f: Festival, s: HuntState): string | undefined {
  if (s.status === "won") return "player";
  if (s.status === "lost") return RIVALS[f.id];
  return undefined;
}

/** After a finished hunt, end the festival at once when it ends after its main event. */
export function finishHunt(g: GameState, f: Festival, s: HuntState): boolean {
  if (s.status === "running" || !endsAfterMainEvent(f)) return false;
  leaveFestival(g);
  return true;
}

const winKey = (day: number) => `seedhunt-win:${dateOf(day).year}`;
const HAT_KEY = "seedhunt-hat";

export interface HuntPrize {
  /** The hat id, given on the first win ever. */
  hat?: string;
  /** True when this year's rare seed packet was given. */
  packet: boolean;
}

/**
 * Pay out a won hunt: the first win ever gives the hat, and each year's first win
 * gives a rare seed packet (kept for the year if the pack is full, so the hunt can
 * be won again). Returns undefined when the hunt was not won or nothing is owed.
 */
export function awardHuntPrize(
  g: GameState,
  s: HuntState,
): HuntPrize | undefined {
  if (s.status !== "won") return undefined;
  return payHuntPrize(g);
}

/** The prize of a won hunt for the acting player (the first win ever the hat, each year's first a rare packet). */
export function payHuntPrize(g: GameState): HuntPrize | undefined {
  const out: HuntPrize = { packet: false };
  if (!g.festivalsJoined.includes(HAT_KEY)) {
    g.festivalsJoined.push(HAT_KEY);
    if (g.wardrobe.add(prize.hat)) out.hat = prize.hat;
  }
  const key = winKey(g.day.clock.day);
  if (!g.festivalsJoined.includes(key) && g.inventory.add(prize.seed, 1)) {
    g.festivalsJoined.push(key);
    out.packet = true;
  }
  return out.hat || out.packet ? out : undefined;
}

/** The villager who starts the hunt. */
export const HUNT_HOST = "cuthbert";

/** The hunt, or the reason it cannot start, when the player talks to the host. */
export function huntOffer(
  f: Festival | undefined,
  mapId: string,
  who: string,
  day: number,
  minutes: number,
): { state?: HuntState; message?: string } | undefined {
  if (!f || who !== HUNT_HOST || f.id !== "seedswap-fair") return undefined;
  if (festivalLayout(f)?.map !== mapId) return undefined;
  const state = startHunt(f, day, minutes);
  if (state)
    return {
      state,
      message: `Find ${state.hunt.win} seed packets in ${state.hunt.seconds} seconds. Go!`,
    };
  return { message: huntStartProblem(f, minutes) };
}

/** The countdown line shown while the hunt runs. */
export const huntLine = (s: HuntState): string =>
  `Seed hunt: ${Math.ceil(s.left)}s  ${s.found}/${s.hunt.win}`;

/** The line when the hunt ends, or undefined while it runs. */
export function huntEndLine(f: Festival, s: HuntState): string | undefined {
  const winner = huntWinner(f, s);
  if (!winner) return undefined;
  return winner === "player"
    ? `You found ${s.found} packets. You win the hunt!`
    : `Time is up with ${s.found} found. ${winner[0]!.toUpperCase()}${winner.slice(1)} wins the hunt.`;
}

// ---- several players (note 111 decision 4): a lower target, the top player wins

/**
 * The packets that win by players present (placeholder, decision 4): the one-player target for one, then 7, 6
 * and 5 for four or more. Never above the hunt's own `win`.
 */
export const HUNT_TARGETS: readonly number[] = [9, 7, 6, 5];

export const huntTarget = (hunt: SeedHunt, players: number): number =>
  Math.min(
    hunt.win,
    HUNT_TARGETS[Math.min(Math.max(players, 1), HUNT_TARGETS.length) - 1]!,
  );

/** One run of the hunt for everyone who is in: the packets lie on the map and the first player on a tile takes it. */
export interface HuntContest {
  hunt: SeedHunt;
  packets: Tile[];
  /** Packets found, by player; every contestant has a row. */
  counts: Record<PlayerId, number>;
  target: number;
  left: number;
  status: "running" | "done";
}

/** Start a hunt for these players. Undefined if it cannot start (note `huntStartProblem`). */
export function startHuntContest(
  f: Festival,
  day: number,
  minutes: number,
  players: PlayerId[],
): HuntContest | undefined {
  const hunt = huntOf(f);
  if (
    !hunt ||
    players.length === 0 ||
    huntStartProblem(f, minutes) !== undefined
  )
    return undefined;
  return {
    hunt,
    packets: packetTiles(hunt, day).map((t) => [...t] as unknown as Tile),
    counts: Object.fromEntries(players.map((p) => [p, 0])),
    target: huntTarget(hunt, players.length),
    left: hunt.seconds,
    status: "running",
  };
}

/** The players who reached the target with the most packets; a tie for the most gives each tied player the win. */
export function huntWinners(c: HuntContest): PlayerId[] {
  const reached = Object.entries(c.counts).filter(([, n]) => n >= c.target);
  const top = Math.max(0, ...reached.map(([, n]) => n));
  return reached.filter(([, n]) => n === top).map(([id]) => id);
}

/** True when no one else can still reach the target, so a leader who has is the winner now. */
function decided(c: HuntContest): boolean {
  const left = c.packets.length;
  const entries = Object.entries(c.counts);
  const leader = Math.max(0, ...entries.map(([, n]) => n));
  if (leader < c.target) return left === 0;
  return entries.every(([, n]) => n >= c.target || n + left < c.target);
}

/** A player steps on a tile: takes the packet there, if one lies. Returns true if found. */
export function pickPacket(
  c: HuntContest,
  id: PlayerId,
  x: number,
  y: number,
): boolean {
  if (c.status !== "running" || c.counts[id] === undefined) return false;
  const i = c.packets.findIndex((t) => t[0] === x && t[1] === y);
  if (i < 0) return false;
  c.packets.splice(i, 1);
  c.counts[id]! += 1;
  if (decided(c)) c.status = "done";
  return true;
}

/** Run the clock down; the hunt is done at zero. */
export function tickContest(c: HuntContest, seconds: number): void {
  if (c.status !== "running") return;
  c.left = Math.max(0, c.left - seconds);
  if (c.left === 0) c.status = "done";
}

/** The rival when no one reached the target, once the hunt is done. */
export function contestRival(f: Festival, c: HuntContest): string | undefined {
  return c.status === "done" && huntWinners(c).length === 0
    ? RIVALS[f.id]
    : undefined;
}
