import data from "../content/lantern-float.json";
import { dateOf } from "./calendar";
import { FESTIVALS, festivalDayToday, festivalOpen } from "./festivals";
import { attendees, festivalLayout } from "./festivalroutes";
import type { GameState } from "./save";

/**
 * Lamplight Evening lantern floating (note 82): buy a paper lantern at the
 * stall, stand on the launch line and set it afloat. Once a year the launch
 * gives every attendee a small friendship gain, and the first time ever a
 * keepsake lantern (a farm decoration, placed outdoors like the others). The drifting is the scene's. Numbers are placeholders in
 * `src/content/lantern-float.json`.
 */
export const LANTERN = data.lantern;
export const KEEPSAKE = data.keepsake;
export const LANTERN_POINTS = data.points;

const FESTIVAL_ID = "lamplight-evening";
const launchKey = (day: number) => `lantern-launch:${dateOf(day).year}`;
const KEEPSAKE_KEY = "lantern-keepsake";

/** True once this year's lantern has been set afloat. */
export const lanternLaunched = (g: GameState) =>
  g.festivalsJoined.includes(launchKey(g.day.clock.day));

/** Why a lantern cannot be bought at the stall, or undefined if it can. */
export function lanternBuyProblem(g: GameState): string | undefined {
  if (festivalDayToday(g.day.clock.day)?.id !== FESTIVAL_ID)
    return "The stall is shut.";
  if (
    !festivalOpen(
      FESTIVALS.find((f) => f.id === FESTIVAL_ID)!,
      g.day.clock.minutes,
    )
  )
    return "The stall is shut.";
  if (lanternLaunched(g)) return "You have already floated your lantern.";
  if (g.inventory.count(LANTERN.id) > 0) return "You already have a lantern.";
  if (g.money < LANTERN.price) return "You cannot afford a lantern.";
  return undefined;
}

/** Buy a paper lantern. Returns false (nothing changed) when it cannot be bought. */
export function buyLantern(g: GameState): boolean {
  if (lanternBuyProblem(g) !== undefined) return false;
  if (!g.inventory.add(LANTERN.id, 1)) return false;
  g.money -= LANTERN.price;
  return true;
}

/** Why the lantern cannot be set afloat now, or undefined if it can. */
export function launchProblem(g: GameState): string | undefined {
  if (festivalDayToday(g.day.clock.day)?.id !== FESTIVAL_ID)
    return "There is nowhere to float a lantern.";
  if (lanternLaunched(g)) return "You have already floated your lantern.";
  if (g.inventory.count(LANTERN.id) < 1)
    return "Buy a lantern at the stall first.";
  return undefined;
}

export interface LaunchResult {
  /** Friendship points gained per attendee (after the heart cap). */
  gains: Record<string, number>;
  /** True when the keepsake lantern was given (the first launch ever). */
  keepsake: boolean;
}

/** Set the lantern afloat. Returns undefined (nothing changed) when it cannot. */
export function launchLantern(g: GameState): LaunchResult | undefined {
  if (launchProblem(g) !== undefined) return undefined;
  const f = FESTIVALS.find((x) => x.id === FESTIVAL_ID)!;
  const layout = festivalLayout(f);
  g.inventory.remove(LANTERN.id, 1);
  g.festivalsJoined.push(launchKey(g.day.clock.day));
  const gains: Record<string, number> = {};
  for (const id of layout ? attendees(layout) : [])
    gains[id] = g.friendship.award(id, LANTERN_POINTS);
  const keepsake = !g.festivalsJoined.includes(KEEPSAKE_KEY);
  if (keepsake) {
    g.festivalsJoined.push(KEEPSAKE_KEY);
    g.inventory.add(KEEPSAKE.id, 1);
  }
  return { gains, keepsake };
}
