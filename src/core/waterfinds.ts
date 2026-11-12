import findData from "../content/waterfinds.json";
import type { Season } from "./calendar";
import type { WaterKind } from "./map";
import type { GameState } from "./save";

/**
 * The six water finds (`docs/design/93_fish_pond_and_water_finds.md`): three
 * water plants and three jellies, lifted with the rod like trash. No bar, no
 * quality, fishing XP, and never a fish for the fish bundles or the fish log.
 * Plants are common and jellies rare, one season each (placeholders). A find
 * cannot be put in a pond. Pale lichen and Glow jelly belong to cave water,
 * which is not a water kind yet, so their `waters` list is empty and they do not
 * bite anywhere (a gap in note 93). Content is `src/content/waterfinds.json`.
 * Pure rules, no Phaser.
 */
export interface WaterFindDef {
  id: string;
  name: string;
  kind: "plant" | "jelly";
  sellPrice: number;
  /** The waters it can be lifted from. */
  waters: WaterKind[];
  /** The seasons it bites in. Absent means any. */
  seasons?: Season[];
}

export const WATER_FINDS = findData.finds as WaterFindDef[];
export const PLANT_CHANCE = findData.plantChance;
export const JELLY_CHANCE = findData.jellyChance;
export const FIND_XP = findData.xp;

export const waterFindById = (id: string | undefined) =>
  WATER_FINDS.find((f) => f.id === id);

export const isWaterFind = (id: string): boolean =>
  waterFindById(id) !== undefined;

/** The finds that can bite in a water in a season. */
export function findsAvailable(
  water: WaterKind,
  season: Season,
): WaterFindDef[] {
  return WATER_FINDS.filter(
    (f) =>
      f.waters.includes(water) &&
      (f.seasons === undefined || f.seasons.includes(season)),
  );
}

/**
 * Roll a find for a bite in this water: each find that can bite takes its own
 * share (plants 12 in 100, jellies 8 in 100, placeholders), in table order.
 * Returns the first that hits.
 */
export function rollFind(
  water: WaterKind,
  season: Season,
  random: () => number,
): WaterFindDef | undefined {
  for (const f of findsAvailable(water, season))
    if (random() < (f.kind === "jelly" ? JELLY_CHANCE : PLANT_CHANCE)) return f;
  return undefined;
}

/**
 * Lift a find: it goes in the pack (or lies at the player's feet when full) and
 * gives a little fishing XP. Not a fish: the fish log is untouched.
 */
export function landFind(
  g: GameState,
  at: { x: number; y: number },
  item: string,
): { dropped: boolean; levelUp?: number } {
  let dropped = false;
  if (!g.inventory.add(item)) {
    g.ground.drop(at.x, at.y, item, 1);
    dropped = true;
  }
  return { dropped, levelUp: g.skills.gain("fishing", FIND_XP) };
}
