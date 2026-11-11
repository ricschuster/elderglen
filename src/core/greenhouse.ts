import type { Hall } from "./bundles";

/**
 * The greenhouse (`docs/design/31_farm_growth.md`, issue #602): the Larder
 * room's reward. A walled plot indoors where crops grow in any season. It is
 * its own map, and its soil is a second `Farm` in the game state (`greenhouse`),
 * since the farm's plots are saved by tile and the two maps share tile numbers.
 */
export const GREENHOUSE_MAP = "greenhouse";

/** The room whose bundles repair the greenhouse. */
export const GREENHOUSE_ROOM = "larder";

/** The gate on the farm's greenhouse door: it opens once the Larder is done. */
export const GREENHOUSE_OPEN = "greenhouse-open";

/** True once every Larder bundle is handed in, so the ruin is repaired. */
export function greenhouseRepaired(g: { hall: Hall }): boolean {
  return g.hall.roomComplete(GREENHOUSE_ROOM);
}

/** The conditions the greenhouse gives for gated exits. */
export function greenhouseHolds(g: { hall: Hall }): string[] {
  return greenhouseRepaired(g) ? [GREENHOUSE_OPEN] : [];
}

/** Footprint of the greenhouse on the Standard farm, in tiles, with the door on the bottom row. The size is the same on every farm type. */
export const GREENHOUSE_SITE = { x: 24, y: 10, w: 6, h: 4 } as const;

/** The ruin site of a farm type with its own map layout; every other type uses `GREENHOUSE_SITE`. */
const RUIN_SITES: Record<string, { x: number; y: number }> = {
  woodland: { x: 13, y: 2 },
};

/** The spot the greenhouse ruin stands on at the start of a farm of this type. */
export function greenhouseRuinSite(farmType?: string): {
  x: number;
  y: number;
} {
  const s = (farmType && RUIN_SITES[farmType]) || GREENHOUSE_SITE;
  return { x: s.x, y: s.y };
}

/** The footprint of the greenhouse, and the door tile's offset from its top left on the bottom row. */
export const GREENHOUSE_FOOTPRINT = {
  w: GREENHOUSE_SITE.w,
  h: GREENHOUSE_SITE.h,
  doorX: 2,
} as const;

/**
 * Where the greenhouse stands: the spot the player moved it to at the carpenter
 * (`docs/design/60_building_placement.md`), else the ruin site every farm
 * starts with. What is inside it never moves with it.
 */
export function greenhouseSite(g: {
  greenhouseSite?: { x: number; y: number };
  farmType?: string;
}): { x: number; y: number } {
  return g.greenhouseSite ?? greenhouseRuinSite(g.farmType);
}

/** True if a tile is under the greenhouse's walls, other than its door tile. */
export function greenhouseBlocks(
  g: { greenhouseSite?: { x: number; y: number }; farmType?: string },
  x: number,
  y: number,
): boolean {
  const s = greenhouseSite(g);
  const { w, h, doorX } = GREENHOUSE_FOOTPRINT;
  if (x === s.x + doorX && y === s.y + h - 1) return false;
  return x >= s.x && x < s.x + w && y >= s.y && y < s.y + h;
}
