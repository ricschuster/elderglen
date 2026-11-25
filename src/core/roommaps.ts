// The host's view of any map a player stands on (note 109, "One world for everyone"): the farm, an
// area map with its own world, or a mine floor. A guest's world intent names its map; the host runs the
// rule on that map as the sender, whichever map the host's own player is on. Free of Phaser and the DOM.
import { maps } from "../content/maps";
import {
  newWorld,
  withWorld,
  worldOfMap,
  isAreaMap,
  type World,
} from "./areas";
import { farmMapOf, isFarmMap, resolveMapId } from "./farmtypes";
import type { GroundItems } from "./ground";
import { FarmMap } from "./map";
import {
  BUILT_FLOORS,
  floorLayout,
  floorMapJson,
  mineFloorOf,
  type Floor,
} from "./mines";
import type { UseContext } from "./interact";
import type { GameState } from "./save";

export type MapKind = "farm" | "area" | "mine" | "town";

/** One map a player stands on, as the host works it. */
export interface MapView {
  /** The registry id (a farm type's own map for "farm"). */
  id: string;
  kind: MapKind;
  map: FarmMap;
  /** The mine floor number, for a mine. */
  floor?: number;
}

const mineMaps = new Map<string, FarmMap>();

/** The walkable map of a mine floor today, cached by floor and day. */
function mineMap(floor: number, day: number): FarmMap {
  const key = `${floor}:${day}`;
  let m = mineMaps.get(key);
  if (!m) {
    if (mineMaps.size > 64) mineMaps.clear();
    m = FarmMap.fromTiled(floorMapJson(floorLayout(floor, day)));
    mineMaps.set(key, m);
  }
  return m;
}

/** The map a name means for this game (`farm` too), or undefined for a map with no world rules here. */
export function viewOf(g: GameState, name: string): MapView | undefined {
  const id = resolveMapId(name, g.farmType);
  if (isFarmMap(id)) return { id, kind: "farm", map: farmMapOf(g) };
  if (isAreaMap(id)) return { id, kind: "area", map: maps.get(id) };
  const floor = mineFloorOf(id);
  if (floor !== undefined && floor >= 1 && floor <= BUILT_FLOORS)
    return { id, kind: "mine", map: mineMap(floor, g.day.clock.day), floor };
  return undefined;
}

/**
 * A town or festival map (Hearthwell, the green, the hedge maze): it has water and festival rules but no world of
 * its own, so only a cast works there (the Night Market pier, the ice, note 111). Undefined for a map the registry
 * lacks, the farm, an area or a mine floor.
 */
export function townView(g: GameState, name: string): MapView | undefined {
  const id = resolveMapId(name, g.farmType);
  if (viewOf(g, id) || !maps.ids.includes(id)) return undefined;
  return { id, kind: "town", map: maps.get(id) };
}

/** The mine floor as it stands today, made if no one has been there yet. */
export function floorOf(g: GameState, floor: number): Floor {
  return g.mines.visit(floor, g.day.clock.day);
}

/** The ground piles of a map, or undefined for a map with none. */
export function groundOfMap(
  g: GameState,
  name: string,
): GroundItems | undefined {
  const v = viewOf(g, name);
  if (!v) return undefined;
  if (v.kind === "mine") return floorOf(g, v.floor!).ground;
  return worldOfMap(g, v.id)?.w.ground;
}

/**
 * Run `fn` with the map's world in the state's fields: the farm's, an area's, or for a mine floor an
 * empty one whose ground is the floor's (so nothing of the farm can be touched by a matching tile).
 */
export function onMap<T>(g: GameState, v: MapView, fn: () => T): T {
  if (v.kind === "mine") {
    const w: World = newWorld(v.map);
    w.ground = floorOf(g, v.floor!).ground;
    return withWorld(g, w, undefined, fn);
  }
  // A town has no world: an empty one, so nothing of the farm or the host's own map can be touched from it.
  if (v.kind === "town") return withWorld(g, newWorld(v.map), undefined, fn);
  const have = worldOfMap(g, v.id);
  return have ? withWorld(g, have.w, have.away, fn) : fn();
}

/** What the use and action rules need to know about a map the host is not standing on. */
export function contextOf(g: GameState, v: MapView): UseContext {
  const rocks = v.kind === "mine" ? floorOf(g, v.floor!).rocks : undefined;
  return {
    mapId: v.id,
    map: v.map,
    ...(v.floor !== undefined ? { floor: v.floor } : {}),
    facing: "down",
    rockAt: (x, y) => !!rocks?.at(x, y),
    litBombAt: () => false,
    personAt: () => false,
  };
}

/** Where a player stands, in the scene's pixels, on a named map. */
export interface Standing {
  x: number;
  y: number;
  map: string;
}

/** What a refused world intent says when the sender is on another map or too far from the tile. */
export const TOO_FAR = "Too far away.";

/**
 * Whether a player stands on the map the intent names and within reach of its tile (the same reach as
 * a screen, `REACH_TILES`). Returns the refusal, or undefined.
 */
export function reachProblem(
  g: GameState,
  at: Standing,
  v: MapView,
  x: number,
  y: number,
  reach: number,
): string | undefined {
  if (resolveMapId(at.map, g.farmType) !== v.id) return TOO_FAR;
  const ts = v.map.tileSize;
  const dx = Math.abs(Math.floor(at.x / ts) - x);
  const dy = Math.abs(Math.floor(at.y / ts) - y);
  return Math.max(dx, dy) <= reach ? undefined : TOO_FAR;
}

/** The tile a player's feet are on, by the scene's rule (the pixel row just above the feet). */
export function tileUnder(
  at: { x: number; y: number },
  tileSize: number,
): { x: number; y: number } {
  return {
    x: Math.floor(at.x / tileSize),
    y: Math.floor((at.y - 1) / tileSize),
  };
}
