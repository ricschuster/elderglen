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
import type { GameState } from "./save";

/**
 * The Seedswap seed hunt (note 82, owner answers 2026-11-11 and decisions
 * 2026-11-12): 50 seconds, find 9 hidden packets to win, packets on one tile
 * set in odd years and another in even years. Cuthbert starts it, up to
 * `lastStart`. If the player fails, the rival (Linnet) wins, and either way
 * the festival ends after the hunt. Pure rules, the scene supplies the clock.
 * Multiplayer counts are open (note 82), so this is the one-player count.
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
