// The headless player: the real core rules, plus the two things the scene
// supplies, a position on a map and the passing of game time (note 46).
import { holdsOf } from "../../src/core/worldflags";
import { maps } from "../../src/content/maps";
import { HOUSE_MAP, houseVisibleTier, isHouseMap } from "../../src/core/house";
import { FarmMap } from "../../src/core/map";
import {
  floorLayout,
  floorMapJson,
  mineFloorOf,
  mineMapId,
} from "../../src/core/mines";
import type { GameState } from "../../src/core/save";

export interface Spot {
  x: number;
  y: number;
}

/** The scene's walking speed, in pixels per real second (`SPEED` in FarmScene). */
const SPEED = 80;
/** Game minutes per real second: a 7 s tick is 10 game minutes in FarmScene. */
const MINUTES_PER_SECOND = 10 / 7;

/**
 * Tunable time model. Walking is counted in four-way tiles, but the player
 * moves diagonally, so a tile costs less than its straight-line time.
 * `action` is the real time of one key press, turn and swing included. Screens
 * (shop, hall, bin) pause the farm, so they cost nothing.
 */
export const TIME = {
  diagonal: 0.9,
  action: 0.5,
  transition: 0.5,
};

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

interface Dist {
  width: number;
  height: number;
  d: Int32Array;
}

/** Steps to a tile, or undefined if it is off the map or unreachable. */
function steps(dist: Dist, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= dist.width || y >= dist.height) return undefined;
  const v = dist.d[y * dist.width + x] as number;
  return v < 0 ? undefined : v;
}

/** Where the player is: a map, and a tile on it. */
export class Walker {
  mapId: string;
  pos: Spot;
  /** Whole game minutes still to pass; the clock moves in whole minutes. */
  private owed = 0;
  minutesWalked = 0;

  constructor(private readonly g: GameState) {
    this.mapId = HOUSE_MAP;
    this.pos = this.adjacentTo(this.map, bed(this.map));
  }

  private floorMaps = new Map<string, FarmMap>();

  get map(): FarmMap {
    const floor = mineFloorOf(this.mapId);
    if (floor === undefined)
      return maps.getWith(
        this.mapId,
        holdsOf(this.g),
        isHouseMap(this.mapId) ? houseVisibleTier(this.g.houseTier) : 0,
      );
    // A mine floor is made from the day and the floor, as the scene does.
    const day = this.g.day.clock.day;
    const key = `${floor}@${day}`;
    let m = this.floorMaps.get(key);
    if (!m) {
      m = FarmMap.fromTiled(floorMapJson(floorLayout(floor, day)));
      this.floorMaps.set(key, m);
    }
    return m;
  }

  /** The mine floor the player is on, if any. */
  get floor(): number | undefined {
    return mineFloorOf(this.mapId);
  }

  /** Walk to the stairs in the mine hall and go down to a floor. */
  descend(floor: number): boolean {
    if (!this.goToService("mine", "stairs")) return false;
    const day = this.g.day.clock.day;
    this.g.mines.visit(floor, day);
    this.spend(TIME.transition);
    this.mapId = mineMapId(floor);
    this.pos = floorLayout(floor, day).arrive;
    return true;
  }

  /** Pass game minutes, as whole minutes on the clock. */
  spend(minutes: number): void {
    this.owed += minutes;
    const whole = Math.floor(this.owed);
    if (whole > 0) {
      this.owed -= whole;
      this.g.day.act(0, whole);
    }
  }

  /** Four-way walking distances from `from`, -1 where it cannot be reached. */
  private distances(map: FarmMap, from: Spot): Dist {
    // A map with no soil has no trees of ours to walk round, so its distances
    // from a tile never change: keep them (the Forest is 14,400 tiles).
    const memo = map.hasSoil ? undefined : this.dists.get(map);
    const key = from.y * map.width + from.x;
    const hit = memo?.get(key);
    if (hit) return hit;
    const d = this.floodFrom(map, from);
    if (!map.hasSoil) {
      const into = memo ?? new Map<number, Dist>();
      into.set(key, d);
      this.dists.set(map, into);
    }
    return d;
  }

  private readonly dists = new WeakMap<FarmMap, Map<number, Dist>>();

  private floodFrom(map: FarmMap, from: Spot): Dist {
    const { width, height } = map;
    const d = new Int32Array(width * height).fill(-1);
    const solid = (x: number, y: number) =>
      map.isBlocked(x, y) || (map.hasSoil && this.g.trees.blocks(x, y));
    const queue = [from.y * width + from.x];
    d[queue[0] as number] = 0;
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i] as number;
      const x = at % width;
      const y = (at - x) / width;
      for (const [dx, dy] of STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (d[next] !== -1 || solid(nx, ny)) continue;
        d[next] = (d[at] as number) + 1;
        queue.push(next);
      }
    }
    return { width, height, d };
  }

  private walkMinutes(tiles: number): number {
    return (
      ((tiles * this.map.tileSize * TIME.diagonal) / SPEED) * MINUTES_PER_SECOND
    );
  }

  /** A walkable tile next to `target`, only used to place the player. */
  private adjacentTo(map: FarmMap, target: Spot): Spot {
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ] as const) {
      const s = { x: target.x + dx, y: target.y + dy };
      if (!map.isBlocked(s.x, s.y)) return s;
    }
    return target;
  }

  /** Walk cost in minutes to stand beside each target, Infinity where there is no way. */
  costsNextTo(targets: Spot[]): number[] {
    const dist = this.distances(this.map, this.pos);
    return targets.map((t) =>
      this.walkMinutes(this.tilesNextTo(t, dist)?.tiles ?? Infinity),
    );
  }

  private tilesNextTo(
    target: Spot,
    dist: Dist = this.distances(this.map, this.pos),
  ): { tiles: number; at: Spot } | undefined {
    let best: { tiles: number; at: Spot } | undefined;
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const at = { x: target.x + dx, y: target.y + dy };
      const tiles = steps(dist, at.x, at.y);
      if (tiles !== undefined && (!best || tiles < best.tiles))
        best = { tiles, at };
    }
    return best;
  }

  /** Walk to stand beside a tile on this map. False if it cannot be reached. */
  goNextTo(target: Spot): boolean {
    const way = this.tilesNextTo(target);
    if (!way) return false;
    this.minutesWalked += this.walkMinutes(way.tiles);
    this.spend(this.walkMinutes(way.tiles));
    this.pos = way.at;
    return true;
  }

  /** Walk onto the nearest tile of an exit, then arrive at its entry. */
  private through(exitId: string): void {
    const exit = this.map.exits.find((e) => e.id === exitId);
    if (!exit) throw new Error(`no exit ${exitId} on ${this.mapId}`);
    const dist = this.distances(this.map, this.pos);
    let best: { tiles: number; at: Spot } | undefined;
    for (let x = exit.x; x < exit.x + exit.w; x++)
      for (let y = exit.y; y < exit.y + exit.h; y++) {
        const tiles = steps(dist, x, y);
        if (tiles !== undefined && (!best || tiles < best.tiles))
          best = { tiles, at: { x, y } };
      }
    if (!best) throw new Error(`exit ${exitId} unreachable on ${this.mapId}`);
    this.minutesWalked += this.walkMinutes(best.tiles);
    this.spend(this.walkMinutes(best.tiles) + TIME.transition);
    const entry = maps
      .get(
        exit.map,
        isHouseMap(exit.map) ? houseVisibleTier(this.g.houseTier) : 0,
      )
      .entry(exit.entry);
    if (!entry) throw new Error(`no entry ${exit.entry} on ${exit.map}`);
    this.mapId = exit.map;
    this.pos = { x: entry.x, y: entry.y };
  }

  /**
   * Change to another map by the fewest doors, over the map graph: the farm
   * joins the house and the rest, and the Mines now lie farm, Forest, Mountain,
   * mine hall (note 74).
   */
  enter(dest: string): void {
    if (this.mapId === dest) return;
    // Climb out of the mine one floor at a time, by the ladder up.
    while (this.floor !== undefined) this.through("up");
    if (this.mapId === dest) return;
    const from = new Map<string, { prev: string; exit: string }>();
    const queue = [this.mapId];
    for (let i = 0; i < queue.length && !from.has(dest); i++) {
      const at = queue[i] as string;
      for (const e of maps.get(at).exits) {
        if (e.map === "" || !maps.ids.includes(e.map)) continue;
        if (e.map === this.mapId || from.has(e.map)) continue;
        from.set(e.map, { prev: at, exit: e.id });
        queue.push(e.map);
      }
    }
    if (!from.has(dest))
      throw new Error(`no way from ${this.mapId} to ${dest}`);
    const route: string[] = [];
    for (let at = dest; at !== this.mapId;) {
      const step = from.get(at) as { prev: string; exit: string };
      route.unshift(step.exit);
      at = step.prev;
    }
    for (const exit of route) this.through(exit);
  }

  /** Walk to a service tile (the shop counter, the bin, a bed) and face it. */
  goToService(mapId: string, id: string): boolean {
    try {
      this.enter(mapId);
    } catch {
      // A door grown over with trees cannot be reached today.
      return false;
    }
    const s = this.map.services.find((x) => x.id === id);
    return !!s && this.goNextTo(s);
  }

  /** Where the player wakes: beside the bed. Called when a day ends. */
  wake(): void {
    this.mapId = HOUSE_MAP;
    this.pos = this.adjacentTo(this.map, bed(this.map));
  }
}

function bed(map: FarmMap): Spot {
  const s = map.services.find((x) => x.kind === "bed");
  if (!s) throw new Error("the house has no bed");
  return s;
}
