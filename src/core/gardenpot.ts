import {
  harvest,
  isClear,
  pickTeaLeaves,
  plant,
  water,
  type Outcome,
} from "./actions";
import { Farm, type Plot } from "./farm";
import type { FarmMap } from "./map";
import { FARM_STORE, GREENHOUSE_STORE } from "./mapstore";
import { mayPlaceOn, placeTag } from "./placeables";
import type { PlacedItem } from "./placedstore";
import type { GameState } from "./save";
import { TEA_SAPLING, TeaBushes, type PlacedTeaBush } from "./teabush";

/**
 * The garden pot (`docs/design/97_tea_bush.md`, "Garden pots"). A crafted pot
 * stands on the farm or in the greenhouse and holds one crop or one tea bush.
 * Stardew's rules: a pot grows any crop in any season indoors and seasonal crops
 * only outdoors, a sprinkler does not water it (the can does, and so does rain
 * outdoors), and a tea bush in a pot grows and bears leaves. The pot is a
 * placed item whose `state` holds a one-tile plot or a tea bush, and the rules
 * of `Farm`, `plant`, `harvest` and `TeaBushes` run on a one-tile copy of it, so
 * there is one set of growing rules. Pure rules.
 */
export const GARDEN_POT = "garden-pot";

/** What a pot holds, kept in the placed item's `state`. */
interface PotState {
  plot?: Plot;
  tea?: PlacedTeaBush;
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** The placed-store key of the map a pot stands on. */
const storeKey = (map: FarmMap): string =>
  map.indoors ? GREENHOUSE_STORE : FARM_STORE;

/** The pot on a tile of this map, if any. */
export function potAt(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): PlacedItem | undefined {
  const p = g.placed.get(storeKey(map), x, y);
  return p?.id === GARDEN_POT ? p : undefined;
}

const stateOf = (p: PlacedItem): PotState => (p.state ?? {}) as PotState;

const keep = (p: PlacedItem, s: PotState): void => {
  p.state = s as Record<string, unknown>;
};

/** True when the pot holds a crop or a bush. */
export const potInUse = (p: PlacedItem): boolean =>
  !!stateOf(p).plot?.crop || !!stateOf(p).tea;

/** Stand a pot from the backpack on a clear tile of the farm or the greenhouse. Free. */
export function placeGardenPot(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (g.inventory.count(GARDEN_POT) < 1) return fail("no garden pot");
  if (!mayPlaceOn(GARDEN_POT, placeTag(map)) || !isClear(g, map, x, y))
    return fail("cannot place here");
  g.inventory.remove(GARDEN_POT);
  g.placed.add(storeKey(map), { x, y, id: GARDEN_POT });
  return { ok: true };
}

/** Lift an empty pot into the backpack. A pot with a plant in it stays. */
export function pickUpGardenPot(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): Outcome {
  const p = potAt(g, map, x, y);
  if (!p) return fail("nothing to act on");
  if (potInUse(p)) return fail("garden pot in use");
  if (g.inventory.room(GARDEN_POT) < 1) return fail("backpack full");
  g.placed.remove(storeKey(map), x, y);
  g.inventory.add(GARDEN_POT);
  return { ok: true, item: GARDEN_POT };
}

/** Run a rule on the pot's one-tile soil, then keep what it left. */
function withSoil<T>(
  map: FarmMap,
  p: PlacedItem,
  run: (soil: Farm) => T,
  dig = false,
): T {
  const soil = new Farm(map.indoors);
  const plot =
    stateOf(p).plot ??
    (dig ? { tilled: true, wateredToday: false } : undefined);
  if (plot) soil.load({ [`${p.x},${p.y}`]: structuredClone(plot) });
  const out = run(soil);
  const next = soil.plotAt(p.x, p.y);
  const state = { ...stateOf(p) };
  if (next?.crop) state.plot = structuredClone(next);
  else if (next && stateOf(p).plot) state.plot = structuredClone(next);
  keep(p, state);
  return out;
}

/** Plant a seed or a tea sapling from the backpack in an empty pot. Out of season outdoors is refused. */
export function plantInPot(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  item: string,
  random: () => number = Math.random,
): Outcome {
  const p = potAt(g, map, x, y);
  if (!p) return fail("nothing to do here");
  if (potInUse(p)) return fail("cannot plant here");
  if (item === TEA_SAPLING) {
    if (g.day.over) return fail("exhausted");
    if (g.inventory.count(TEA_SAPLING) < 1) return fail("no sapling");
    const bush = new TeaBushes();
    bush.add(x, y);
    g.inventory.remove(TEA_SAPLING);
    keep(p, { ...stateOf(p), tea: bush.at(x, y) });
    return { ok: true };
  }
  const result = withSoil(
    map,
    p,
    (soil) => plant(g, x, y, item, random, soil),
    true,
  );
  return result;
}

/** Water the crop in a pot with the can. */
export function waterPot(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): Outcome {
  const p = potAt(g, map, x, y);
  if (!p || stateOf(p).tea || !stateOf(p).plot?.crop)
    return fail("nothing to water");
  return withSoil(map, p, (soil) => water(g, x, y, soil));
}

/** The Action button on a pot: pick tea leaves, or harvest a ripe crop. Undefined when no pot stands there. */
export function actOnPot(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
  random: () => number = Math.random,
): Outcome | undefined {
  const p = potAt(g, map, x, y);
  if (!p) return undefined;
  const tea = stateOf(p).tea;
  if (tea) {
    const bushes = new TeaBushes();
    bushes.load([tea]);
    const out = pickTeaLeaves(g, x, y, bushes);
    keep(p, { ...stateOf(p), tea: bushes.at(x, y) });
    return out;
  }
  return withSoil(map, p, (soil) => harvest(g, x, y, random, soil));
}

/**
 * Overnight: every pot grows. Crops follow `Farm.endDay` (outdoors a crop out of
 * season withers, indoors it never does) and bushes follow `TeaBushes.endDay`.
 * Sprinklers are never asked, so a pot is watered by hand or by rain only.
 */
export function growPots(
  g: GameState,
  growth: number,
  season: Parameters<Farm["endDay"]>[0],
  dayOfSeason: number,
  random: () => number,
  seasonChanged: boolean,
): void {
  for (const indoors of [false, true]) {
    const key = indoors ? GREENHOUSE_STORE : FARM_STORE;
    for (const p of g.placed.each(key)) {
      if (p.id !== GARDEN_POT) continue;
      const st = stateOf(p);
      if (st.plot) {
        const soil = new Farm(indoors);
        soil.load({ [`${p.x},${p.y}`]: st.plot });
        soil.endDay(season, growth, random, seasonChanged);
        st.plot = structuredClone(soil.plotAt(p.x, p.y)!);
      }
      if (st.tea) {
        const bushes = new TeaBushes();
        bushes.load([st.tea]);
        bushes.endDay(season, dayOfSeason, indoors);
        st.tea = bushes.at(p.x, p.y);
      }
      keep(p, st);
    }
  }
}

/** Rain waters the pots outdoors, the morning it falls. Indoor pots stay dry. */
export function rainOnPots(g: GameState): void {
  for (const p of g.placed.each(FARM_STORE)) {
    const plot = stateOf(p).plot;
    if (p.id === GARDEN_POT && plot) plot.wateredToday = true;
  }
}
