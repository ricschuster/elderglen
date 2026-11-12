import { MAX_HOUSE_TIER } from "./house";
import { itemById } from "./items";
import type { GameState } from "./save";
import type { Skill } from "./skills";
import type { Weather } from "./weather";

/**
 * Edits for the dev-only debug menu and console hooks (`42_debug_menu.md`).
 * They set state directly but keep the game's own limits: stack size, slot
 * count and the skill levels. Nothing here is a game feature.
 */

/** Add or take money. Never goes below zero. */
export function giveMoney(g: GameState, amount: number): void {
  g.money = Math.max(0, g.money + amount);
}

/** Add items to the backpack. Fails for an unknown id or if they do not fit. */
export function giveItem(
  g: GameState,
  id: string,
  n: number,
): "ok" | "unknown" | "full" {
  if (!itemById(id)) return "unknown";
  return g.inventory.add(id, n) ? "ok" : "full";
}

/** Add skill XP. Returns the new level if it rose, so the caller can react. */
export function giveXp(
  g: GameState,
  skill: Skill,
  amount: number,
): number | undefined {
  return g.skills.gain(skill, amount);
}

/** Set today's weather. Tomorrow's forecast is left alone. */
export function setWeather(g: GameState, weather: Weather): void {
  g.weather = weather;
}

/** Move the house tier up or down, within range. Any build is left as is. */
export function stepHouseTier(g: GameState, step: number): void {
  g.houseTier = Math.min(Math.max(g.houseTier + step, 0), MAX_HOUSE_TIER);
}

/** Finish the carpenter's build now. Returns false if none was under way. */
export function finishBuild(g: GameState): boolean {
  if (!g.houseBuild) return false;
  g.houseTier = g.houseBuild.tier;
  g.houseBuild = undefined;
  return true;
}

/** Fill energy to the maximum. */
export function refillEnergy(g: GameState): void {
  g.day.energy.restore(g.day.energy.max);
}
