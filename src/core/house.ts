import renoData from "../content/house-renos.json";
import { mapFiles, maps } from "../content/maps";
import { festivalDayToday } from "./festivals";
import { HARDWOOD } from "./items";
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
 * `TIER_2_BAND` (#286). 4 widens the map from 31 to 35 columns, so everything
 * moved right by `TIER_2_WIDEN` (the larger tier 2 kitchen and bedroom, note 68).
 * 5 is the final frame, 74 by 44, so everything moved by `HOUSE_SHIFT` (note 85).
 * See `legacyHouseTile`.
 */
export const HOUSE_LAYOUT = 5;

/** Tiles every house piece moved by in layout 5: right by x and down by y (note 85, "Frame and saves"). */
export const HOUSE_SHIFT = { x: 20, y: 11 } as const;

/** Columns every house tile moved right by in layout 4, to make room for the wider kitchen. */
export const TIER_2_WIDEN = 2;

/** Rows the tier 2 band added above the tier 1 rooms in layout 3. */
export const TIER_2_BAND = 10;

/** Where the start room's corner sits in the merged house map, in tiles. */
export const START_ROOM_AT = {
  x: 9 + TIER_2_WIDEN + HOUSE_SHIFT.x,
  y: 2 + TIER_2_BAND + HOUSE_SHIFT.y,
} as const;

/**
 * Bring a tile saved under an older frame into the current one. `layout` is the
 * save's `houseLayout` (1 when absent). From layout 1, a piece on the old start
 * map moves by the start room's offset, and a piece on the old tier 1 map
 * (`house-1`) moves down by the band and goes to the one house map. From
 * layout 2 the house pieces move down by the band. Every older layout then
 * moves right by the widening (layout 4), and every layout below 5 then moves by `HOUSE_SHIFT` (layout 5, current).
 */
export function legacyHouseTile(
  map: string,
  x: number,
  y: number,
  layout = 1,
): { map: string; x: number; y: number } {
  if (layout >= HOUSE_LAYOUT) return { map, x, y };
  let at = { map, x, y };
  if (layout === 1) {
    at =
      map === HOUSE_MAP
        ? { map, x: x + 9, y: y + 2 + TIER_2_BAND }
        : { map: HOUSE_MAP, x, y: y + TIER_2_BAND };
  } else if (layout === 2) at = { map: HOUSE_MAP, x, y: y + TIER_2_BAND };
  if (layout < 4) at = { ...at, x: at.x + TIER_2_WIDEN };
  return { ...at, x: at.x + HOUSE_SHIFT.x, y: at.y + HOUSE_SHIFT.y };
}

/** True once the house has its cellar stairs: tier 3. */
export function houseHasCellar(tier: number): boolean {
  return tier >= 3;
}

/** The id of the cellar map, its own small map and not a tier of the house. */
export const CELLAR_MAP = "cellar";

/** The gate on the house's stairs exit: it opens when the house reaches tier 3. */
export const CELLAR_OPEN = "cellar-open";

/** The condition under which the spouse room and its hall exist (note 85, from marriage). */
export const SPOUSE_HOLD = "spouse";

/** The condition under which the divorce chest shows in the bedroom (note 85, "Divorce"). */
export const DIVORCE_CHEST_HOLD = "divorce-chest";

/**
 * True while the player is married. Marriage is not built yet (note 84), so
 * the world flag `spouse` stands in for it; the flag is the only thing to
 * swap when the marriage state lands. `holdsOf` (`worldflags.ts`) already carries
 * every flag as a condition, so the map build sees `spouse` through it.
 */
export function houseSpouse(g: { flags?: string[] }): boolean {
  return g.flags?.includes(SPOUSE_HOLD) === true;
}

/** The house tier from which the renovations can be bought and show (note 85, "Renovations"). */
export const RENO_MIN_TIER = 2;

/**
 * The condition of the corner room's stair to the spouse room: the corner room
 * and a spouse together. A layer reads one name, so the combination is its own
 * hold (note 85, `corner-stairs`).
 */
export const CORNER_STAIRS_HOLD = "corner-stairs";

/** One renovation (note 85, "Renovations"). Content is `src/content/house-renos.json`. */
export interface Renovation {
  id: string;
  name: string;
  /** The carpenter's price in coin, a placeholder at Stardew's prices (`07_tuning_numbers.md`). */
  price: number;
  /** Another renovation this one is built on. */
  needs?: string;
}

export const RENOVATIONS = renoData as Renovation[];

export const renovationById = (
  id: string | undefined,
): Renovation | undefined => RENOVATIONS.find((r) => r.id === id);

/** The condition a renovation's layers are shown under. */
export const renoHold = (id: string): string => `reno-${id}`;

/**
 * The renovations a save may keep: known ids once, only from tier 2, and each
 * only if the one it needs is there. In the order of `RENOVATIONS`.
 */
export function validRenos(tier: number, ids: readonly unknown[]): string[] {
  if (tier < RENO_MIN_TIER) return [];
  const have = new Set(ids);
  return RENOVATIONS.filter(
    (r) => have.has(r.id) && (r.needs === undefined || have.has(r.needs)),
  ).map((r) => r.id);
}

/**
 * The conditions the house gives for gated exits and conditional layers at a
 * house tier: the cellar, the spouse room and one `reno-<id>` per renovation
 * built (`houseRenos`, from tier 2).
 */
export function houseHolds(
  tier: number,
  spouse = false,
  renos: readonly string[] = [],
): string[] {
  const built = validRenos(tier, renos);
  return [
    ...(houseHasCellar(tier) ? [CELLAR_OPEN] : []),
    ...(spouse ? [SPOUSE_HOLD] : []),
    ...built.map(renoHold),
    ...(spouse && built.includes("corner") ? [CORNER_STAIRS_HOLD] : []),
  ];
}

/**
 * The tiles a renovation adds, read from its layers on the house map (the
 * ground layer of `reno-<id>`, and for the corner room its stair to the spouse
 * room): `x,y` keys, so the layers stay the one source.
 */
export function renoArea(id: string): Set<string> {
  const json = mapFiles[HOUSE_MAP]!;
  const names =
    id === "corner"
      ? ["ground-reno-corner-t2", "ground-corner-stairs-t2"]
      : [`ground-reno-${id}-t2`];
  const out = new Set<string>();
  for (const l of json.layers)
    if (names.includes(l.name) && l.data)
      l.data.forEach((v, i) => {
        if (v !== 0) out.add(`${i % json.width},${Math.floor(i / json.width)}`);
      });
  return out;
}

type RenoState = Pick<
  GameState,
  "houseTier" | "houseRenos" | "houseBuild" | "money" | "furniture" | "chests"
>;

/** Why a renovation cannot be ordered now, in words, or undefined if it can. */
export function renoOrderProblem(g: RenoState, id: string): string | undefined {
  const r = renovationById(id);
  if (!r) return "There is no such renovation.";
  if (g.houseRenos.includes(id))
    return `The ${r.name.toLowerCase()} is already built.`;
  if (g.houseTier < RENO_MIN_TIER)
    return "The carpenter will renovate once the upper floor is built.";
  if (g.houseBuild) return "The carpenter is already at work on the house.";
  if (r.needs !== undefined && !g.houseRenos.includes(r.needs))
    return `It needs the ${renovationById(r.needs)!.name.toLowerCase()} first.`;
  if (g.money < r.price) return `You need ${r.price - g.money}g more.`;
  return undefined;
}

/** Pay for a renovation. It is done at once, with no building days. False if it cannot. */
export function orderRenovation(g: RenoState, id: string): boolean {
  if (renoOrderProblem(g, id) !== undefined) return false;
  g.money -= renovationById(id)!.price;
  g.houseRenos = [...g.houseRenos, id];
  return true;
}

/** Why a renovation cannot be taken back, in words, or undefined if it can. */
export function renoRefundProblem(
  g: RenoState,
  id: string,
): string | undefined {
  if (!renovationById(id) || !g.houseRenos.includes(id))
    return "That is not built.";
  const on = RENOVATIONS.find(
    (o) => o.needs === id && g.houseRenos.includes(o.id),
  );
  if (on)
    return `Take back the ${on.name.toLowerCase()} first, it is built on this.`;
  const area = renoArea(id);
  const full =
    [...g.furniture.each(HOUSE_MAP)].some((f) => area.has(`${f.x},${f.y}`)) ||
    [...g.chests.each(HOUSE_MAP)].some((c) => area.has(`${c.x},${c.y}`));
  return full
    ? "Clear your furniture and chests out of the new area first."
    : undefined;
}

/** Take a renovation back and pay its price in full. The walls go back up. False if it cannot. */
export function refundRenovation(g: RenoState, id: string): boolean {
  if (renoRefundProblem(g, id) !== undefined) return false;
  g.money += renovationById(id)!.price;
  g.houseRenos = g.houseRenos.filter((x) => x !== id);
  return true;
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
  /** Hardwood, from large stumps (`items.ts`). */
  hardwood: number;
}

/**
 * Tiers 1, 2 and 3 in order. Stardew's prices, placeholders for
 * `07_tuning_numbers.md`. Tier 2 asks for 100 hardwood, as Stardew does.
 */
export const HOUSE_UPGRADES: HouseUpgrade[] = [
  { coin: 10000, wood: 450, hardwood: 0 },
  { coin: 65000, wood: 0, hardwood: 100 },
  { coin: 100000, wood: 0, hardwood: 0 },
];

/** What each upgrade adds, for the carpenter's list. Index is the tier reached minus one. */
export const HOUSE_UPGRADE_NAMES = [
  "Kitchen and bedroom",
  "Upper floor",
  "Cellar stairs",
] as const;

/**
 * The line that says the empty room is for later (note 41), shown when tier 2
 * is ordered and again when it lands. The spare room only: the nursery has its
 * crib and child beds from tier 2 (note 85, #837).
 */
export const WAITING_ROOMS_LINE =
  "The carpenter says the spare room will be bare and tidy, for later.";

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
  if (g.animals.build)
    return `The carpenter is busy building your ${g.animals.build.building}.`;
  if (g.animals.siloDays > 0)
    return "The carpenter is busy building your silo.";
  const cost = nextUpgrade(g.houseTier);
  if (!cost) return "There is no further upgrade yet.";
  const missing: string[] = [];
  if (g.money < cost.coin) missing.push(`${cost.coin - g.money}g more`);
  const have = g.inventory.count(WOOD);
  if (cost.wood > 0 && have < cost.wood)
    missing.push(`${cost.wood - have} more wood`);
  const hard = g.inventory.count(HARDWOOD);
  if (cost.hardwood > 0 && hard < cost.hardwood)
    missing.push(`${cost.hardwood - hard} more hardwood`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the next upgrade and start the build. Returns false if it cannot. */
export function orderUpgrade(g: GameState): boolean {
  if (orderProblem(g) !== undefined) return false;
  const cost = nextUpgrade(g.houseTier)!;
  g.money -= cost.coin;
  if (cost.wood > 0) g.inventory.remove(WOOD, cost.wood);
  if (cost.hardwood > 0) g.inventory.remove(HARDWOOD, cost.hardwood);
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
  if (!build || festivalDayToday(g.day.clock.day)) return false;
  build.daysLeft -= 1;
  if (build.daysLeft > 0) return false;
  g.houseTier = build.tier;
  g.houseBuild = undefined;
  return true;
}
