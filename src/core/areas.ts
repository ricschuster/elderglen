import { dateOf } from "./calendar";
import { returnDebris, Twigs } from "./debris";
import { ForageField, type Spot } from "./forage";
import { Farm } from "./farm";
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
  /**
   * The farm's own soil, sprinklers, fruit trees and machines are kept by tile
   * with no map id, so an area swaps in empty ones: nothing of the farm can be
   * touched from here by a matching coordinate. Never saved for an area.
   */
  farm: Farm;
  sprinklers: Sprinklers;
  fruitTrees: FruitTrees;
  machines: Machines;
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

/**
 * Grove regrowth: any spot where the map placed a tree, and that now holds
 * nothing (felled and its stump uprooted), may sprout a seed of the same kind
 * tonight. The seed then grows by the normal stages (`Trees.endDay`).
 */
export function regrowGroves(
  trees: Trees,
  spots: readonly TreeSpot[],
  random: () => number,
  free: (x: number, y: number) => boolean,
): number {
  let sprouted = 0;
  for (const s of spots) {
    if (s.large || trees.at(s.x, s.y) || !free(s.x, s.y)) continue;
    if (random() >= GROVE_REGROW_CHANCE) continue;
    if (!trees.add(s.x, s.y, SEED_STAGE)) continue;
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
 * Put one night's spawn on a world (note 78). `rock` and `hard-rock` are plain
 * stone (hard rock is not its own kind yet), an ore id is that node, and
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
    s.kind === "rock" || s.kind === "hard-rock"
      ? "stone"
      : (ROCK_KINDS as string[]).includes(s.kind)
        ? (s.kind as RockKind)
        : "stone";
  return w.rocks.add(s.x, s.y, kind);
}

/** Scatter the day's forage on every area (the morning, and a new or loaded game). */
export function respawnAreaForage(g: GameState, random: () => number): void {
  const { season } = dateOf(g.day.clock.day);
  for (const [id, w] of Object.entries(g.areas)) {
    const map = maps.get(id);
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
      ))
        placeSpawn(w, spawn);
  }
  respawnAreaForage(g, random);
}
