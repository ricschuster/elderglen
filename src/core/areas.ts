import { dateOf } from "./calendar";
import { returnDebris, Twigs } from "./debris";
import { ForageField, type Spot } from "./forage";
import { ArtifactSpots, ARTIFACT_AREAS, rollAreaSpots } from "./artifacts";
import { Farm } from "./farm";
import { isFarmMap } from "./farmtypes";
import type { Creature } from "./creatures";
import { creatureSpawnsOf, placeMapCreatures } from "./mapcreatures";
import { FruitTrees } from "./fruittrees";
import { GroundItems } from "./ground";
import { Machines } from "./machines";
import type { FarmMap, TreeSpot } from "./map";
import { Rocks, ROCK_KINDS, type RockKind } from "./rocks";
import { nightlySpawns, spawnTableOf, type Spawn } from "./spawns";
import { Sprinklers } from "./sprinklers";
import type { GameState } from "./save";
import { SEED_STAGE, Trees } from "./trees";
import { Weeds } from "./weeds";
import { maps } from "../content/maps";

/**
 * Area worlds (`docs/design/72_forest.md`). The farm keeps its trees, rocks,
 * weeds, twigs, forage and goods on the ground in the game state. Every other
 * outdoor map that has things you chop, break and gather (the Forest, later the
 * Secret Woods and the rest) keeps its own set, by map id, in `areas`. While the
 * player is on one, `enterArea` swaps its set into the state's fields so every
 * rule that works on `g.trees`, `g.rocks` and the rest works on that map, and
 * `leaveArea` swaps the farm's back. Pure rules, no Phaser.
 */

/** The maps that have their own world: every map with the property `wild`. */
export function areaMaps(): string[] {
  return maps.ids.filter((id) => maps.get(id).wild);
}

/** True for a map with its own world. */
export function isAreaMap(id: string): boolean {
  return maps.ids.includes(id) && maps.get(id).wild;
}

/** Everything standing or lying on the ground of one outdoor map. */
export interface World {
  trees: Trees;
  rocks: Rocks;
  weeds: Weeds;
  twigs: Twigs;
  ground: GroundItems;
  /** Wild goods lying out today. Not saved: it respawns each morning. */
  forage: ForageField;
  /** Artifact spots lying out today. Not saved. */
  spots: ArtifactSpots;
  /**
   * The farm's own soil, sprinklers, fruit trees and machines are kept by tile
   * with no map id, so an area swaps in empty ones: nothing of the farm can be
   * touched from here by a matching coordinate. Never saved for an area.
   */
  farm: Farm;
  sprinklers: Sprinklers;
  fruitTrees: FruitTrees;
  machines: Machines;
  /** Creatures placed today on a map with a creature spawn table (note 73), and the day they were placed. */
  creatures?: Creature[];
  creaturesDay?: number;
}

/** The world of a map at the start of a new game: the trees, rocks, weeds and twigs it places. */
export function newWorld(map: FarmMap): World {
  const w: World = {
    trees: new Trees(map.trees),
    rocks: new Rocks(map.rocks),
    weeds: new Weeds(),
    twigs: new Twigs(),
    ground: new GroundItems(),
    forage: new ForageField(),
    spots: new ArtifactSpots(),
    farm: new Farm(),
    sprinklers: new Sprinklers(),
    fruitTrees: new FruitTrees(),
    machines: new Machines(),
  };
  for (const s of map.litter.weeds) w.weeds.add(s.x, s.y);
  for (const s of map.litter.twigs) w.twigs.add(s.x, s.y);
  return w;
}

/** A world for every area map, as a new game starts. */
export function newAreas(): Record<string, World> {
  return Object.fromEntries(
    areaMaps().map((id) => [id, newWorld(maps.get(id))]),
  );
}

/** The set of fields the state holds right now, whichever map they belong to. */
function current(g: GameState): World {
  return {
    trees: g.trees,
    rocks: g.rocks,
    weeds: g.weeds,
    twigs: g.twigs,
    ground: g.ground,
    forage: g.forage,
    spots: g.spots,
    farm: g.farm,
    sprinklers: g.sprinklers,
    fruitTrees: g.fruitTrees,
    machines: g.machines,
  };
}

function apply(g: GameState, w: World): void {
  g.trees = w.trees;
  g.rocks = w.rocks;
  g.weeds = w.weeds;
  g.twigs = w.twigs;
  g.ground = w.ground;
  g.forage = w.forage;
  g.spots = w.spots;
  g.farm = w.farm;
  g.sprinklers = w.sprinklers;
  g.fruitTrees = w.fruitTrees;
  g.machines = w.machines;
}

/** The farm's world: the state's fields, or the ones set aside while the player is in an area. */
export function homeWorld(g: GameState): World {
  return g.away ? g.away.home : current(g);
}

/** Put a map's world in the state's fields. A map without a world leaves the farm's. */
export function enterArea(g: GameState, mapId: string): void {
  leaveArea(g);
  const w = g.areas[mapId];
  if (!w) return;
  g.away = { mapId, home: current(g) };
  apply(g, w);
}

/**
 * Run `fn` with `w` in the state's fields, as the world of the area `away` (undefined for a world that is
 * not an area's: the farm's, or a mine floor's), then put back what was there. This is how the host
 * works on a map a guest stands on while its own player is somewhere else (note 109, "One world for
 * everyone"). The fields swapped are objects changed in place, so the changes stay in `w`.
 */
export function withWorld<T>(
  g: GameState,
  w: World,
  away: string | undefined,
  fn: () => T,
): T {
  const keptAway = g.away;
  const kept = current(g);
  const home = homeWorld(g);
  apply(g, w);
  g.away = away === undefined ? undefined : { mapId: away, home };
  try {
    return fn();
  } finally {
    apply(g, kept);
    g.away = keptAway;
  }
}

/** The world of an outdoor map the state holds: the farm's, or an area's. Undefined for any other map. */
export function worldOfMap(
  g: GameState,
  mapId: string,
): { w: World; away: string | undefined } | undefined {
  if (isFarmMap(mapId)) return { w: homeWorld(g), away: undefined };
  const w = g.areas[mapId];
  return w ? { w, away: mapId } : undefined;
}

/** Put the farm's world back in the state's fields. Safe to call when already home. */
export function leaveArea(g: GameState): void {
  if (!g.away) return;
  apply(g, g.away.home);
  g.away = undefined;
}

/** The map the state's fields belong to: an area's id, or undefined for the farm. */
export function areaOf(g: GameState): string | undefined {
  return g.away?.mapId;
}

/** Chance a night that an empty grove spot sprouts a seed. SC-30: 20 percent a night once the stump is gone. */
export const GROVE_REGROW_CHANCE = 0.2;

/** A regrown tree comes back as a stage 3 seedling, as Stardew (SC-09). */
export const GROVE_REGROW_STAGE = 3;

/**
 * Grove regrowth (note 36): any spot where the map placed a tree (an original
 * tree, never one the player planted), and that now holds nothing (felled and
 * its stump uprooted), may return tonight as a stage 3 seedling of the same
 * kind, in any season. A stump left standing stops it. It then grows by the
 * normal stages (`Trees.endDay`). Only area maps call this, never the farm.
 */
export function regrowGroves(
  trees: Trees,
  spots: readonly TreeSpot[],
  random: () => number,
  free: (x: number, y: number) => boolean,
): number {
  let sprouted = 0;
  for (const s of spots) {
    if (s.large || s.cosmetic || trees.at(s.x, s.y) || !free(s.x, s.y))
      continue;
    if (random() >= GROVE_REGROW_CHANCE) continue;
    if (!trees.add(s.x, s.y, GROVE_REGROW_STAGE)) continue;
    const t = trees.at(s.x, s.y);
    if (t && s.kind) t.kind = s.kind;
    sprouted += 1;
  }
  return sprouted;
}

const openCache = new WeakMap<FarmMap, Spot[]>();

/** Every tile of a map where something may lie or grow: open, off the paths, not water, exit, entry or service. */
function openTiles(map: FarmMap): Spot[] {
  let out = openCache.get(map);
  if (!out) {
    out = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (map.canPlantTree(x, y)) out.push({ x, y });
    openCache.set(map, out);
  }
  return out;
}

/** Whether a tile of an area can take something new tonight. */
function emptyAt(w: World, x: number, y: number): boolean {
  return (
    !w.trees.at(x, y) &&
    !w.rocks.at(x, y) &&
    !w.weeds.at(x, y) &&
    !w.twigs.at(x, y) &&
    !w.forage.itemAt(x, y) &&
    w.ground.at(x, y).length === 0
  );
}

/**
 * Put one night's spawn on a world (note 78). `rock` is plain stone, `hard-rock`
 * is the hard kind that can drop coal, an ore id is that node, and
 * `oak-seed` and `maple-seed` are a seed in the ground of that tree kind.
 */
export function placeSpawn(w: World, s: Spawn): boolean {
  if (s.kind === "oak-seed" || s.kind === "maple-seed") {
    if (!w.trees.add(s.x, s.y, SEED_STAGE)) return false;
    const t = w.trees.at(s.x, s.y);
    if (t) t.kind = s.kind === "oak-seed" ? "oak" : "maple";
    return true;
  }
  const kind: RockKind =
    s.kind === "rock"
      ? "stone"
      : s.kind === "hard-rock"
        ? "hard"
        : (ROCK_KINDS as string[]).includes(s.kind)
          ? (s.kind as RockKind)
          : "stone";
  return w.rocks.add(s.x, s.y, kind);
}

/**
 * Scatter the day's forage on every area (the morning, and a new or loaded game).
 * With `keepLoaded`, a field that came from a save is left as saved.
 */
export function respawnAreaForage(
  g: GameState,
  random: () => number,
  keepLoaded = false,
): void {
  const { season } = dateOf(g.day.clock.day);
  for (const [id, w] of Object.entries(g.areas)) {
    const map = maps.get(id);
    if (!(keepLoaded && w.forage.loaded))
      w.forage.respawnArea(
        id,
        season,
        map.forageSpots.filter(
          (s) =>
            !w.trees.at(s.x, s.y) &&
            !w.rocks.at(s.x, s.y) &&
            !w.weeds.at(s.x, s.y) &&
            !w.twigs.at(s.x, s.y),
        ),
        (s) => map.forageTableAt(s.x, s.y),
        random,
      );
    if (ARTIFACT_AREAS.includes(id) && !(keepLoaded && w.spots.loaded)) {
      const free = (s: Spot) => emptyAt(w, s.x, s.y);
      const open = map.forageSpots.filter(free);
      rollAreaSpots(
        g,
        w.spots,
        open.length > 0 ? open : openTiles(map).filter(free),
        openTiles(map).filter(free),
        random,
      );
    }
  }
}

/**
 * The night on every area, after the farm's: trees grow and groves regrow,
 * weeds spread, rocks and twigs return a few at a time (note 65), and fresh
 * forage lies out. Call it with the new day's date and weather set.
 */
export function areasEndDay(g: GameState, random: () => number): void {
  const { season, dayOfSeason } = dateOf(g.day.clock.day);
  for (const [id, w] of Object.entries(g.areas)) {
    const map = maps.get(id);
    const free = (x: number, y: number) =>
      map.canPlantTree(x, y) && !map.isPad(x, y) && emptyAt(w, x, y);
    // Seeds do not spread on their own here: the groves renew by `regrowGroves`.
    w.trees.endDay(season, random, () => false);
    regrowGroves(w.trees, map.trees, random, free);
    w.weeds.endDay(season, dayOfSeason, g.weather, random, free, () =>
      openTiles(map),
    );
    returnDebris(
      season,
      dayOfSeason,
      w.rocks,
      w.twigs,
      w.trees,
      random,
      free,
      () => openTiles(map),
    );
    // A map with a nightly spawn table (the Quarry) fills its free tiles.
    const table = spawnTableOf(id);
    if (table)
      for (const spawn of nightlySpawns(
        table,
        dateOf(g.day.clock.day).year,
        openTiles(map),
        free,
        random,
        g.skills.level("mining"),
      ))
        placeSpawn(w, spawn);
  }
  respawnAreaForage(g, random);
}

/**
 * The morning's creatures on a map with a creature spawn table (note 73), placed
 * the first time the player is there each day and kept until the next. Returns
 * the day's list, or undefined for a map with no table.
 */
export function ensureMapCreatures(
  g: GameState,
  mapId: string,
  random: () => number,
  arrive: Spot,
): Creature[] | undefined {
  const table = creatureSpawnsOf(mapId);
  const w = g.areas[mapId];
  if (!table || !w) return undefined;
  const day = g.day.clock.day;
  if (w.creaturesDay !== day || !w.creatures) {
    w.creaturesDay = day;
    w.creatures = placeMapCreatures(
      table,
      maps.get(mapId),
      random,
      arrive,
      (x, y) => emptyAt(w, x, y),
    );
  }
  return w.creatures;
}
