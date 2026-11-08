import { maps } from "../content/maps";
import { festivalToday } from "./festivals";
import { visibleTier } from "./map";
import type { GameState } from "./save";

/**
 * The house grows in tiers: 0 is the start room, 1 adds a kitchen and a
 * bedroom, 2 the upper band (spare room and nursery), 3 the cellar stairs.
 */
export const MAX_HOUSE_TIER = 3;

/** The id of the start map, and the target of the farm's house door. */
export const HOUSE_MAP = "house";

/**
 * The tier of the house the player sees: the rooms built so far, kept to the
 * tiers the house map has. The house is one map that grows
 * (`docs/design/68_growing_interiors.md`), so this picks layers, not a map.
 * Tier 2 adds the upper band. Tier 3 has no layers of its own yet: it shows
 * tier 2 and only flags the cellar stairs (`houseHasCellar`, #282).
 */
export function houseVisibleTier(tier: number): number {
  return visibleTier(tier, maps.maxTier(HOUSE_MAP));
}

/**
 * The version of the house map's tile frame, written to every save as
 * `houseLayout`. 1 (no field) is the old frame, where the start room sat at the
 * corner of its own map. 2 is the merged map of 12 rows (tier 1, #421). 3 is
 * the map with the tier 2 band above, 22 rows, so everything moved down by
 * `TIER_2_BAND` (#286). See `legacyHouseTile`.
 */
export const HOUSE_LAYOUT = 3;

/** Rows the tier 2 band added above the tier 1 rooms in layout 3. */
export const TIER_2_BAND = 10;

/** Where the start room's corner sits in the merged house map, in tiles. */
export const START_ROOM_AT = { x: 9, y: 2 + TIER_2_BAND } as const;

/**
 * Bring a tile saved under an older frame into the current one. `layout` is the
 * save's `houseLayout` (1 when absent). From layout 1, a piece on the old start
 * map moves by the start room's offset, and a piece on the old tier 1 map
 * (`house-1`) moves down by the band and goes to the one house map. From
 * layout 2 the house pieces move down by the band. Layout 3 is current.
 */
export function legacyHouseTile(
  map: string,
  x: number,
  y: number,
  layout = 1,
): { map: string; x: number; y: number } {
  if (layout >= HOUSE_LAYOUT) return { map, x, y };
  if (layout === 2) return { map: HOUSE_MAP, x, y: y + TIER_2_BAND };
  if (map === HOUSE_MAP)
    return { map, x: x + START_ROOM_AT.x, y: y + START_ROOM_AT.y };
  return { map: HOUSE_MAP, x, y: y + TIER_2_BAND };
}

/** True once the house has its cellar stairs: tier 3. */
export function houseHasCellar(tier: number): boolean {
  return tier >= 3;
}

/** The id of the cellar map, its own small map and not a tier of the house. */
export const CELLAR_MAP = "cellar";

/** The gate on the house's stairs exit: it opens when the house reaches tier 3. */
export const CELLAR_OPEN = "cellar-open";

/** The conditions the house gives for gated exits at a house tier. */
export function houseHolds(tier: number): string[] {
  return houseHasCellar(tier) ? [CELLAR_OPEN] : [];
}

/**
 * Where a loaded game puts the player: the cellar if the save was made down
 * there and the stairs are still open, else the farm's start (saves keep the
 * map only for the cellar, since everywhere else a new morning starts at home).
 */
export function resumeAt(g: {
  resumeMap?: string;
  houseTier: number;
}): { map: string; entry: string } | undefined {
  return g.resumeMap === CELLAR_MAP && houseHasCellar(g.houseTier)
    ? { map: CELLAR_MAP, entry: "from_above" }
    : undefined;
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
 * Tiers 1, 2 and 3 in order. Stardew's prices, placeholders for
 * `07_tuning_numbers.md`. Tier 2 asks for 100 hardwood in Stardew; hardwood is
 * not an item yet (see `actions.ts`), so wood stands in for it.
 */
export const HOUSE_UPGRADES: HouseUpgrade[] = [
  { coin: 10000, wood: 450 },
  { coin: 65000, wood: 100 },
  { coin: 100000, wood: 0 },
];

/** What each upgrade adds, for the carpenter's list. Index is the tier reached minus one. */
export const HOUSE_UPGRADE_NAMES = [
  "Kitchen and bedroom",
  "Upper floor",
  "Cellar stairs",
] as const;

/**
 * The line that says the empty rooms are for later (note 41), shown when tier 2
 * is ordered and again when it lands.
 */
export const WAITING_ROOMS_LINE =
  "The carpenter says the spare room and the nursery will be bare and tidy, for later.";

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
  if (cost.wood > 0 && have < cost.wood)
    missing.push(`${cost.wood - have} more wood`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the next upgrade and start the build. Returns false if it cannot. */
export function orderUpgrade(g: GameState): boolean {
  if (orderProblem(g) !== undefined) return false;
  const cost = nextUpgrade(g.houseTier)!;
  g.money -= cost.coin;
  if (cost.wood > 0) g.inventory.remove(WOOD, cost.wood);
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
