import {
  BARN_SITES,
  BUILDINGS,
  COOP_SITES,
  FOOTPRINTS,
  IRON_BAR,
  SILO_FOOTPRINT,
  SILO_SITES,
  isBuilt,
  orderBuilding,
  siteOf,
  tierOf,
  animalsIn,
  buildingProblem,
  type Building,
} from "./animals";
import {
  GREENHOUSE_FOOTPRINT,
  greenhouseRepaired,
  greenhouseSite,
} from "./greenhouse";
import { newHorse } from "./horse";
import { HARDWOOD } from "./items";
import type { FarmMap } from "./map";
import type { GameState } from "./save";

/**
 * Placing, moving and removing farm buildings
 * (`docs/design/60_building_placement.md`). Rules only, free of Phaser and the
 * DOM. The carpenter's placement screen asks these and shows the answers. The
 * coop and the barn can be placed today; the stable, silo and well follow.
 */

/**
 * Everything the carpenter can stand somewhere: the three animal buildings and
 * the greenhouse. The greenhouse is not built or removed, only moved, and it is
 * the one that is not in the animals state.
 */
export type Placeable = Building | "greenhouse";

const PLACEABLES: readonly Placeable[] = [
  ...(Object.keys(BUILDINGS) as Building[]),
  "greenhouse",
];

/** The footprint of a placeable, and its door tile's offset from the top left. */
function footprintOf(b: Placeable): {
  w: number;
  h: number;
  doorX: number;
  door: boolean;
} {
  return b === "greenhouse"
    ? { ...GREENHOUSE_FOOTPRINT, door: true }
    : FOOTPRINTS[b];
}

/** One tile that stops a building standing where the player pointed, and why. */
export interface Blocker {
  x: number;
  y: number;
  why: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const inRect = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Refund share of the gold and materials a building cost (note 60, placeholder for note 07). */
export const REFUND_SHARE = 0.5;

/** The names of the two buildings, for the words on the screen. */
const NAME: Record<Placeable, string> = {
  coop: "coop",
  barn: "barn",
  stable: "stable",
  greenhouse: "greenhouse",
};

/** The footprint a building covers with its top left on a tile. */
export function footprintAt(b: Placeable, x: number, y: number): Rect {
  const f = footprintOf(b);
  return { x, y, w: f.w, h: f.h };
}

/** The door tile of a building with its top left on a tile. It can be walked on. */
export function doorAt(b: Placeable, x: number, y: number) {
  const f = footprintOf(b);
  return { x: x + f.doorX, y: y + f.h - 1 };
}

/** True once a building stands or is being built: it holds its spot. */
function holdsSpot(g: GameState, b: Building): boolean {
  return isBuilt(g.animals, b) || g.animals.build?.building === b;
}

/** The footprint of a building that holds a spot on this map, if it does. */
export function placedFootprint(
  g: GameState,
  b: Placeable,
  mapId: string,
): Rect | undefined {
  if (b === "greenhouse") {
    if (!hasSites(mapId)) return undefined;
    const at = greenhouseSite(g);
    return footprintAt(b, at.x, at.y);
  }
  const s = siteOf(g, b, mapId);
  return s && holdsSpot(g, b) ? footprintAt(b, s.x, s.y) : undefined;
}

/** Every door of the map's buildings, so the corridor and clutter rules skip them. */
const BUILDING_EXITS: Record<string, Placeable> = {
  coop: "coop",
  barn: "barn",
  greenhouse: "greenhouse",
};

/**
 * The tiles a building may not cover: the exits of the map and one tile around
 * each (the front of a door), and the entries, counters and bins themselves,
 * so a building can never wall off a way out (note 60). The doors of the coop and barn are not counted: they
 * move with their building.
 */
function reservedTiles(map: FarmMap): Map<string, string> {
  const out = new Map<string, string>();
  const ring = (r: Rect, why: string, margin = 1) => {
    for (let y = r.y - margin; y < r.y + r.h + margin; y++)
      for (let x = r.x - margin; x < r.x + r.w + margin; x++)
        out.set(`${x},${y}`, why);
  };
  for (const e of map.exits)
    if (!(e.id in BUILDING_EXITS)) ring(e, "the way out of the farm");
  for (const e of map.entries)
    if (
      !e.name.startsWith("from_coop") &&
      !e.name.startsWith("from_barn") &&
      !e.name.startsWith("from_greenhouse")
    )
      ring({ x: e.x, y: e.y, w: 1, h: 1 }, "where you arrive", 0);
  for (const s of map.services)
    ring({ x: s.x, y: s.y, w: 1, h: 1 }, "a counter", 0);
  return out;
}

/** The clutter on a tile that the player must clear first, or undefined if it is bare. */
function clutterAt(g: GameState, x: number, y: number): string | undefined {
  if (g.rocks.at(x, y)) return "a rock";
  const t = g.trees.at(x, y);
  if (t) return t.stump ? "a stump" : "a tree";
  if (g.fruitTrees.at(x, y)) return "a fruit tree";
  if (g.weeds.at(x, y)) return "weeds";
  if (g.twigs.at(x, y)) return "a twig";
  if (g.farm.plotAt(x, y)) return "tilled soil";
  if (g.sprinklers.at(x, y)) return "a sprinkler";
  if (g.machines.at(x, y)) return "a machine";
  if (g.ground.at(x, y).length > 0) return "something on the ground";
  for (const f of g.forage.each()) if (f.x === x && f.y === y) return "forage";
  return undefined;
}

/**
 * Every tile that stops `b` with its top left on (x, y), each with a reason.
 * Empty means the spot is free. The tile in front of the door counts too, so a
 * door never opens onto a wall. Moving a building ignores its own old spot.
 */
export function placementBlockers(
  g: GameState,
  map: FarmMap,
  mapId: string,
  b: Placeable,
  x: number,
  y: number,
): Blocker[] {
  const out: Blocker[] = [];
  const foot = footprintAt(b, x, y);
  const door = doorAt(b, x, y);
  const front = { x: door.x, y: door.y + 1 };
  const reserved = reservedTiles(map);
  const others = PLACEABLES.filter((o) => o !== b).map((o) => ({
    o,
    r: placedFootprint(g, o, mapId),
  }));
  const silo = SILO_SITES[mapId];
  const siloRect = silo
    ? { x: silo.x, y: silo.y, w: SILO_FOOTPRINT.w, h: SILO_FOOTPRINT.h }
    : undefined;
  /** What stands on a tile, or undefined if a building may cover it. */
  const reason = (tx: number, ty: number): string | undefined => {
    if (map.isBlocked(tx, ty)) return "water, a cliff or a wall";
    const near = reserved.get(`${tx},${ty}`);
    if (near) return `too close to ${near}`;
    for (const { o, r } of others) {
      if (!r) continue;
      if (inRect(r, tx, ty)) return `your ${NAME[o]}`;
      const d = doorAt(o, r.x, r.y);
      if (tx === d.x && ty === d.y + 1) return `the door of your ${NAME[o]}`;
    }
    if (siloRect && inRect(siloRect, tx, ty)) return "the silo's spot";
    if (g.chests.at(mapId, tx, ty)) return "a chest";
    return clutterAt(g, tx, ty);
  };
  const check = (tx: number, ty: number) => {
    const why = reason(tx, ty);
    if (why) out.push({ x: tx, y: ty, why });
  };
  for (let ty = foot.y; ty < foot.y + foot.h; ty++)
    for (let tx = foot.x; tx < foot.x + foot.w; tx++) check(tx, ty);
  check(front.x, front.y);
  if (out.length === 0) {
    const walled = wallsOffAnExit(g, map, mapId, b, foot);
    if (walled) out.push({ x: foot.x, y: foot.y, why: walled });
  }
  return out;
}

/** The tiles walkers cross: open ground with no building on it. */
function walkable(
  g: GameState,
  map: FarmMap,
  mapId: string,
  except: Placeable,
  extra: Rect | undefined,
) {
  const placed = PLACEABLES.filter((o) => o !== except).flatMap((o) => {
    const r = placedFootprint(g, o, mapId);
    return r
      ? [{ r, d: footprintOf(o).door ? doorAt(o, r.x, r.y) : undefined }]
      : [];
  });
  const silo = SILO_SITES[mapId];
  const siloRect =
    silo && g.animals.silo
      ? { x: silo.x, y: silo.y, w: SILO_FOOTPRINT.w, h: SILO_FOOTPRINT.h }
      : undefined;
  return (x: number, y: number): boolean => {
    if (map.isBlocked(x, y)) return false;
    if (siloRect && inRect(siloRect, x, y)) return false;
    for (const { r, d } of placed)
      if (inRect(r, x, y) && !(d && x === d.x && y === d.y)) return false;
    return !(extra && inRect(extra, x, y));
  };
}

/** Tiles reached by walking from the map's entries, four ways. */
function reach(
  map: FarmMap,
  open: (x: number, y: number) => boolean,
): Set<string> {
  const seen = new Set<string>();
  const queue: { x: number; y: number }[] = [];
  for (const e of map.entries)
    if (open(e.x, e.y) && !seen.has(`${e.x},${e.y}`)) {
      seen.add(`${e.x},${e.y}`);
      queue.push({ x: e.x, y: e.y });
    }
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || !open(nx, ny)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/**
 * The reason a building at this spot would cut the player off from an exit or
 * a counter that can be reached now, or undefined if it cuts nothing off.
 */
function wallsOffAnExit(
  g: GameState,
  map: FarmMap,
  mapId: string,
  b: Placeable,
  foot: Rect,
): string | undefined {
  const door = doorAt(b, foot.x, foot.y);
  const before = reach(map, walkable(g, map, mapId, b, undefined));
  const solid = walkable(g, map, mapId, b, foot);
  const after = reach(map, (x, y) =>
    footprintOf(b).door && x === door.x && y === door.y
      ? !map.isBlocked(x, y)
      : solid(x, y),
  );
  const near = (set: Set<string>, x: number, y: number) =>
    [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => set.has(`${x + dx!},${y + dy!}`));
  for (const e of map.exits) {
    if (e.id in BUILDING_EXITS) continue;
    if (near(before, e.x, e.y) && !near(after, e.x, e.y))
      return "it would wall off a way out of the farm";
  }
  for (const s of map.services)
    if (near(before, s.x, s.y) && !near(after, s.x, s.y))
      return "it would wall off a counter";
  return undefined;
}

/** The first reason a spot is blocked, in words, or undefined if it is free. */
export function placementProblem(
  g: GameState,
  map: FarmMap,
  mapId: string,
  b: Placeable,
  x: number,
  y: number,
): string | undefined {
  if (!hasSites(mapId)) return "Buildings go on the farm.";
  if (x < 0 || y < 0) return "That is off the farm.";
  const found = placementBlockers(g, map, mapId, b, x, y);
  const first = found[0];
  if (!first) return undefined;
  return first.why.startsWith("it would")
    ? `That spot is no good: ${first.why}.`
    : `Something is in the way: ${first.why}.`;
}

/** Order a base building, standing on a chosen spot. False, with nothing paid, if it cannot be done. */
export function orderBuildingAt(
  g: GameState,
  map: FarmMap,
  mapId: string,
  b: Building,
  x: number,
  y: number,
): boolean {
  if (buildingProblem(g, b) !== undefined) return false;
  if (placementProblem(g, map, mapId, b, x, y) !== undefined) return false;
  if (!orderBuilding(g, b)) return false;
  g.animals.sites[b] = { x, y };
  return true;
}

/** Why a built building cannot be moved, or undefined if it can. */
export function moveProblem(g: GameState, b: Placeable): string | undefined {
  if (b === "greenhouse")
    return greenhouseRepaired(g)
      ? undefined
      : "The greenhouse is still a ruin. Finish the Larder bundles at the village hall first.";
  if (!isBuilt(g.animals, b))
    return g.animals.build?.building === b
      ? `The carpenter is still building your ${NAME[b]}.`
      : `You have no ${NAME[b]} to move.`;
  return undefined;
}

/**
 * Move a built building, free and at once. Its animals and contents stay in
 * it. The greenhouse keeps its soil, crops, sprinklers and trees: they are
 * stored by its own map, not by the farm's tiles.
 */
export function moveBuilding(
  g: GameState,
  map: FarmMap,
  mapId: string,
  b: Placeable,
  x: number,
  y: number,
): boolean {
  if (moveProblem(g, b) !== undefined) return false;
  if (placementProblem(g, map, mapId, b, x, y) !== undefined) return false;
  if (b === "greenhouse") g.greenhouseSite = { x, y };
  else g.animals.sites[b] = { x, y };
  return true;
}

/** What the carpenter pays back for a building: half of what it and its upgrades cost, rounded down. */
export function refundOf(
  g: GameState,
  b: Building,
): {
  coin: number;
  wood: number;
  stone: number;
  hardwood: number;
  iron: number;
} {
  const info = BUILDINGS[b];
  const total = { iron: 0, hardwood: 0, ...info.cost };
  for (let t = 2; t <= tierOf(g.animals, b); t++) {
    const up = info.upgrades[t];
    if (!up) continue;
    total.coin += up.coin;
    total.wood += up.wood;
    total.stone += up.stone;
  }
  return {
    coin: Math.floor(total.coin * REFUND_SHARE),
    wood: Math.floor(total.wood * REFUND_SHARE),
    stone: Math.floor(total.stone * REFUND_SHARE),
    hardwood: Math.floor(total.hardwood * REFUND_SHARE),
    iron: Math.floor(total.iron * REFUND_SHARE),
  };
}

/** Why a building cannot be removed now, or undefined if it can. */
export function removeProblem(g: GameState, b: Building): string | undefined {
  const info = BUILDINGS[b];
  if (!isBuilt(g.animals, b)) return `You have no ${info.noun} to remove.`;
  if (g.animals.build?.building === b)
    return `The carpenter is working on your ${info.noun}.`;
  const n = animalsIn(g, b).length;
  if (n > 0)
    return `Your ${info.noun} has ${n} ${n === 1 ? "animal" : "animals"} in it. Sell or move them first.`;
  if (b === "coop" && g.animals.incubator)
    return "There is an egg in the incubator. Wait for it to hatch.";
  const r = refundOf(g, b);
  if (
    g.inventory.room("wood") < r.wood ||
    g.inventory.room(HARDWOOD) < r.hardwood ||
    g.inventory.room("stone") < r.stone ||
    g.inventory.room(IRON_BAR) < r.iron
  )
    return b === "stable"
      ? "Make room in your pack for the hardwood and iron bars."
      : "Make room in your pack for the wood and stone.";
  return undefined;
}

/** Take a building down and pay the refund. False, with nothing changed, if it cannot be removed. */
export function removeBuilding(g: GameState, b: Building): boolean {
  if (removeProblem(g, b) !== undefined) return false;
  const r = refundOf(g, b);
  g.money += r.coin;
  g.inventory.add("wood", r.wood);
  g.inventory.add(HARDWOOD, r.hardwood);
  g.inventory.add("stone", r.stone);
  g.inventory.add(IRON_BAR, r.iron);
  if (b === "coop") {
    g.animals.coopBuilt = false;
    g.animals.tier = 1;
  } else if (b === "stable") {
    // The horse goes with the stable (note 59).
    g.animals.stableBuilt = false;
    g.animals.horse = newHorse();
    g.animals.mounted = false;
  } else {
    g.animals.barnBuilt = false;
    g.animals.barnTier = 1;
  }
  delete g.animals.sites[b];
  return true;
}

/**
 * The farm map with the coop and barn doors moved to where the buildings
 * stand, and the greenhouse walled off where it stands. Every other map comes
 * back as it is.
 */
export function mapWithDoors(
  g: GameState,
  map: FarmMap,
  mapId: string,
): FarmMap {
  let out = map;
  for (const b of ["coop", "barn"] as const) {
    const s = siteOf(g, b, mapId);
    if (!s) continue;
    out = out.withDoor(b, `from_${b}`, doorAt(b, s.x, s.y));
  }
  // The greenhouse always stands, ruin or repaired: it walls off its footprint.
  if (hasSites(mapId)) {
    const at = greenhouseSite(g);
    const door = doorAt("greenhouse", at.x, at.y);
    out = out
      .withDoor("greenhouse", "from_greenhouse", door)
      .withBuilding(footprintAt("greenhouse", at.x, at.y), door);
  }
  return out;
}

/** Whether a map id has a fixed coop or barn site, so the screen can place there. */
export function hasSites(mapId: string): boolean {
  return mapId in COOP_SITES && mapId in BARN_SITES;
}
