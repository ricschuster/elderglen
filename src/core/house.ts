import { maps } from "../content/maps";
import { festivalToday } from "./festivals";
import { visibleTier } from "./map";
import type { GameState } from "./save";

/** The house grows in tiers: 0 is the start room, 1 adds a kitchen and a bedroom. */
export const MAX_HOUSE_TIER = 3;

/** The id of the start map, and the target of the farm's house door. */
export const HOUSE_MAP = "house";

/**
 * The tier of the house the player sees: the rooms built so far, kept to the
 * tiers the house map has. The house is one map that grows
 * (`docs/design/68_growing_interiors.md`), so this picks layers, not a map.
 * Tiers 2 and 3 get their layers in M3, so until then they show tier 1.
 */
export function houseVisibleTier(tier: number): number {
  return visibleTier(tier, maps.maxTier(HOUSE_MAP));
}

/**
 * The version of the house map's tile frame. Saves from before the house grew
 * in one map (no `houseLayout`) hold furniture and chests by the old start room
 * frame, which sat at the corner. See `legacyHouseTile`.
 */
export const HOUSE_LAYOUT = 2;

/** Where the start room's corner sits in the merged house map, in tiles. */
export const START_ROOM_AT = { x: 9, y: 2 } as const;

/**
 * Bring a tile saved before the merged house map into its frame. A piece on
 * the old start map moves by the start room's offset. A piece on the old tier 1
 * map (`house-1`) keeps its tile, since the new map reuses that frame, and goes
 * to the one house map.
 */
export function legacyHouseTile(
  map: string,
  x: number,
  y: number,
): { map: string; x: number; y: number } {
  if (map === HOUSE_MAP)
    return { map, x: x + START_ROOM_AT.x, y: y + START_ROOM_AT.y };
  return { map: HOUSE_MAP, x, y };
}

/** True for any of the house interior maps. */
export function isHouseMap(id: string): boolean {
  return id === HOUSE_MAP || id.startsWith(`${HOUSE_MAP}-`);
}

/** What an upgrade costs, to reach the tier at the same index plus one. */
export interface HouseUpgrade {
  coin: number;
  wood: number;
}

/**
 * Tier 1 only for now; tiers 2 and 3 are M3. Stardew's price, a placeholder
 * for `07_tuning_numbers.md`.
 */
export const HOUSE_UPGRADES: HouseUpgrade[] = [{ coin: 10000, wood: 450 }];

/** The item id of wood. Chopping trees and stumps gives it (`docs/design/43_wood_source.md`). */
export const WOOD = "wood";

/** Days the carpenter works on an upgrade. */
export const BUILD_DAYS = 3;

/** An upgrade being built: the tier it will reach and working days left. */
export interface HouseBuild {
  tier: number;
  daysLeft: number;
}

/** The next upgrade's price, or undefined if there is none to buy. */
export function nextUpgrade(tier: number): HouseUpgrade | undefined {
  return HOUSE_UPGRADES[tier];
}

/** Why the upgrade cannot be ordered now, in words, or undefined if it can. */
export function orderProblem(g: GameState): string | undefined {
  if (g.houseBuild) return "The carpenter is already at work on the house.";
  const cost = nextUpgrade(g.houseTier);
  if (!cost) return "There is no further upgrade yet.";
  const missing: string[] = [];
  if (g.money < cost.coin) missing.push(`${cost.coin - g.money}g more`);
  const have = g.inventory.count(WOOD);
  if (have < cost.wood) missing.push(`${cost.wood - have} more wood`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the next upgrade and start the build. Returns false if it cannot. */
export function orderUpgrade(g: GameState): boolean {
  if (orderProblem(g) !== undefined) return false;
  const cost = nextUpgrade(g.houseTier)!;
  g.money -= cost.coin;
  g.inventory.remove(WOOD, cost.wood);
  g.houseBuild = { tier: g.houseTier + 1, daysLeft: BUILD_DAYS };
  return true;
}

/**
 * Run one morning of the build, after the clock has moved to the new day. The
 * carpenter does not work on a festival day, so that morning does not count.
 * Returns true on the morning the new rooms open.
 */
export function advanceBuild(g: GameState): boolean {
  const build = g.houseBuild;
  if (!build || festivalToday(g.day.clock.day)) return false;
  build.daysLeft -= 1;
  if (build.daysLeft > 0) return false;
  g.houseTier = build.tier;
  g.houseBuild = undefined;
  return true;
}
