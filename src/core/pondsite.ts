import pondData from "../content/pond.json";
import { isFarmMap } from "./farmtypes";
import { FARM_STORE } from "./mapstore";
import type { GameState } from "./save";

/**
 * Where ponds stand, kept apart from `pond.ts` so the placing rules
 * (`placement.ts`) and the carpenter's job checks (`animals.ts`, `house.ts`)
 * can see ponds without importing the pond rules, which import them.
 */

export const FISH_POND = "fish-pond";
export const POND_FOOTPRINT = {
  w: pondData.build.footprint[0]!,
  h: pondData.build.footprint[1]!,
} as const;

/** The footprint of every pond on the farm, built or building. */
export function pondRects(
  g: GameState,
  mapId: string,
): { x: number; y: number; w: number; h: number }[] {
  if (!isFarmMap(mapId)) return [];
  return [...g.placed.each(FARM_STORE)]
    .filter((p) => p.id === FISH_POND)
    .map((p) => ({ x: p.x, y: p.y, ...POND_FOOTPRINT }));
}

/** True while the carpenter is still digging a pond: the one job at a time. */
export function pondDigging(g: GameState): boolean {
  return [...g.placed.each(FARM_STORE)].some(
    (p) =>
      p.id === FISH_POND &&
      typeof p.state?.building === "number" &&
      p.state.building > 0,
  );
}
