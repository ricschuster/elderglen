import campChest from "../content/camp-chest.json";
import type { Spot } from "./forage";
import bandData from "../content/mine-bands.json";
import { GEODE_SHARE } from "./geodes";
import { gemShare } from "./gems";
import type { TiledMapJson } from "./map";
import { Rocks, type Rock, type RockKind } from "./rocks";
import {
  loadCreature,
  saveCreature,
  spawnCreatures,
  type Creature,
  type CreatureSave,
} from "./creatures";

/**
 * The mine (`docs/design/22_mines.md`, build slice 1). Pure rules: a floor is
 * made fresh each day from a seed of the day and the floor, so a reload gives
 * the same floor. Rocks and the ladder are saved with the game, so a half dug
 * floor comes back as it was.
 */

/** Spring day 5, as in Stardew (decided). Day numbers start at 1 on spring 1. */
export const MINES_OPEN_DAY = 5;
/**
 * The bottom floor, 120 (note 22). Floors 11 to 120 are built as digging only:
 * creatures, special floors and dangerous mode wait for later slices.
 */
export const BUILT_FLOORS = bandData.topFloor;

export const FLOOR_WIDTH = 20;
export const FLOOR_HEIGHT = 14;

/** Chance a floor shows its way down at once, about 1 in 4 (placeholder). */
export const FREE_LADDER_CHANCE = 0.25;
/** Dry streak odds for the ladder under a rock (placeholders, note 22). */
export const LADDER_BASE = 0.01;
export const LADDER_STEP = 0.005;
export const LADDER_CAP = 0.25;

/** Rocks on a floor, 12 to 16 (placeholder). */
export const MIN_ROCKS = 12;
export const MAX_ROCKS = 16;
/** Share of rocks that are coal rocks on every floor (placeholder). */
export const COAL_SHARE = bandData.coalShare;
/** Share of rocks that are quartz clusters (placeholder, note 07). */
export const QUARTZ_SHARE = 0.06;

/** The three bands of 40 floors and the ore nodes each one shows (placeholders, `mine-bands.json`). */
export const BANDS = bandData.bands as {
  name: string;
  floors: [number, number];
  ores: { kind: RockKind; share: number; fromFloor?: number }[];
}[];

/** The band a floor is in. Floors past the last band stay in it. */
export function bandOf(floor: number): (typeof BANDS)[number] {
  return BANDS.find((b) => floor <= b.floors[1]) ?? BANDS[BANDS.length - 1]!;
}

/** Hearthsilver nodes on a floor: a fixed handful from floor 100 on, none above (note 22, placeholder). */
export function hearthsilverNodes(floor: number): number {
  return floor >= bandData.hearthsilver.fromFloor
    ? bandData.hearthsilver.nodes
    : 0;
}

/** The kind a plain roll in 0..1 gives on a floor: its band's ores, coal, quartz, a geode, else stone. */
export function rockKindAt(floor: number, r: number): RockKind {
  const table: [RockKind, number][] = [
    ...bandOf(floor)
      .ores.filter((o) => floor >= (o.fromFloor ?? 0))
      .map((o): [RockKind, number] => [o.kind, o.share]),
    ["coal", COAL_SHARE],
    ["quartz", QUARTZ_SHARE],
    ["geode", GEODE_SHARE],
    ["gem", gemShare(floor)],
  ];
  let edge = 0;
  for (const [kind, share] of table) {
    edge += share;
    if (r < edge) return kind;
  }
  return "stone";
}

export const minesOpen = (day: number): boolean => day >= MINES_OPEN_DAY;

/** A rest camp every 10th floor (note 22). No healing: a chest and a cozy beat. */
export const CAMP_EVERY = 10;
export const isCampFloor = (floor: number): boolean =>
  floor >= CAMP_EVERY && floor % CAMP_EVERY === 0 && floor <= BUILT_FLOORS;

/**
 * The one item a camp chest gives, once, in Stardew's pattern (owner, 2026-11-11,
 * note 22). `undefined` for floor 30, which holds nothing. Ids are in
 * `boots.json`, `weapons.json` and the kept items of `items.ts`.
 */
export function campItem(floor: number): string | undefined {
  return (
    (campChest as Record<string, string | null>)[String(floor)] ?? undefined
  );
}

/**
 * Special floors (owner, 2026-11-11, note 22): about 1 floor in 15 from floor 10
 * up, never a camp floor. An infested floor hides its ladder until every creature
 * is beaten. A geode floor is all geode nodes and has no creatures.
 */
export type SpecialFloor = "infested" | "geode";
export const SPECIAL_CHANCE = 1 / 15;
export const SPECIAL_FROM = 10;
/** Extra creatures on an infested floor, and the extra slayer count a clear earns (placeholders, note 07). */
export const INFESTED_EXTRA_CREATURES = 4;
export const INFESTED_SLAYER_BONUS = 0.25;

export function specialFloor(
  floor: number,
  day: number,
): SpecialFloor | undefined {
  if (floor < SPECIAL_FROM || isCampFloor(floor) || floor > BUILT_FLOORS)
    return undefined;
  const random = seeded(day * 4513 + floor * 3571 + 5);
  if (random() >= SPECIAL_CHANCE) return undefined;
  return random() < 0.5 ? "infested" : "geode";
}

export const mineMapId = (floor: number): string => `mine-${floor}`;

/** The floor a map id names, or undefined for any other map. */
export function mineFloorOf(mapId: string): number | undefined {
  const m = /^mine-(\d+)$/.exec(mapId);
  return m ? Number(m[1]) : undefined;
}

/** The chance the next rock hides the ladder, after `misses` rocks that did not. */
export function ladderChance(misses: number): number {
  return Math.min(LADDER_BASE + LADDER_STEP * misses, LADDER_CAP);
}

/** A small seeded generator, so a floor is the same all day. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FloorLayout {
  floor: number;
  /** True where the map is wall: the border and a few pillars. */
  walls: boolean[];
  /** The ladder up, an exit tile. */
  up: Spot;
  /** Where the player arrives from above, beside the ladder up. */
  arrive: Spot;
  rocks: Rock[];
  ladder: Spot | undefined;
  /** The camp chest, on a camp floor. */
  camp: Spot | undefined;
  /** An infested or geode floor, if it is one today. */
  special: SpecialFloor | undefined;
}

const UP: Spot = { x: 1, y: 1 };
const ARRIVE: Spot = { x: 2, y: 1 };

const near = (a: Spot, b: Spot, d: number) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= d;

/** Build a floor from the day and the floor number alone. */
export function floorLayout(floor: number, day: number): FloorLayout {
  const random = seeded(day * 1009 + floor * 7919 + 17);
  const walls: boolean[] = new Array(FLOOR_WIDTH * FLOOR_HEIGHT).fill(false);
  const at = (x: number, y: number) => y * FLOOR_WIDTH + x;
  for (let y = 0; y < FLOOR_HEIGHT; y++)
    for (let x = 0; x < FLOOR_WIDTH; x++)
      if (x === 0 || y === 0 || x === FLOOR_WIDTH - 1 || y === FLOOR_HEIGHT - 1)
        walls[at(x, y)] = true;

  // Single pillars, never touching each other or the border, so every open
  // tile stays joined to the rest.
  const pillars: Spot[] = [];
  const pillarCount = 6 + Math.floor(random() * 4);
  for (let tries = 0; pillars.length < pillarCount && tries < 400; tries++) {
    const p = {
      x: 2 + Math.floor(random() * (FLOOR_WIDTH - 4)),
      y: 2 + Math.floor(random() * (FLOOR_HEIGHT - 4)),
    };
    if (near(p, UP, 3) || pillars.some((q) => near(p, q, 1))) continue;
    pillars.push(p);
    walls[at(p.x, p.y)] = true;
  }

  const free = (x: number, y: number) =>
    !walls[at(x, y)] && !near({ x, y }, UP, 2);
  const taken = new Set<string>();
  const pick = (ok: (s: Spot) => boolean): Spot | undefined => {
    for (let tries = 0; tries < 400; tries++) {
      const s = {
        x: 1 + Math.floor(random() * (FLOOR_WIDTH - 2)),
        y: 1 + Math.floor(random() * (FLOOR_HEIGHT - 2)),
      };
      if (!free(s.x, s.y) || taken.has(`${s.x},${s.y}`) || !ok(s)) continue;
      taken.add(`${s.x},${s.y}`);
      return s;
    }
    return undefined;
  };

  const camp = isCampFloor(floor) ? pick((s) => !near(s, UP, 4)) : undefined;
  const special = specialFloor(floor, day);
  const rocks: Rock[] = [];
  const count = MIN_ROCKS + Math.floor(random() * (MAX_ROCKS - MIN_ROCKS + 1));
  const hearth = hearthsilverNodes(floor);
  for (let i = 0; i < count; i++) {
    const s = pick(() => true);
    if (!s) break;
    const kind: RockKind =
      i < hearth
        ? "hearthsilver"
        : special === "geode"
          ? "geode"
          : rockKindAt(floor, random());
    rocks.push({ ...s, kind, hits: 0 });
  }
  // The bottom floor has no way down.
  const ladder =
    floor < BUILT_FLOORS &&
    random() < FREE_LADDER_CHANCE &&
    special !== "infested"
      ? pick((s) => !near(s, UP, 5))
      : undefined;
  return {
    floor,
    walls,
    up: UP,
    arrive: ARRIVE,
    rocks,
    ladder,
    camp,
    special,
  };
}

/** The same floor as a Tiled map, so the farm scene can walk it. */
export function floorMapJson(layout: FloorLayout): TiledMapJson & {
  tilesets: unknown[];
} {
  const { walls, floor } = layout;
  // Tile 7 is wall and tile 3 is path in the placeholder tileset.
  const ground = walls.map((w) => (w ? 7 : 3));
  const collision = walls.map((w) => (w ? 1 : 0));
  const point = (cls: string, name: string, s: Spot) => ({
    name,
    class: cls,
    x: s.x * 16 + 8,
    y: s.y * 16 + 8,
    width: 0,
    height: 0,
    point: true,
  });
  const layer = (id: number, name: string, data: number[], visible = true) => ({
    id,
    name,
    type: "tilelayer",
    width: FLOOR_WIDTH,
    height: FLOOR_HEIGHT,
    x: 0,
    y: 0,
    opacity: 1,
    visible,
    data,
  });
  const json = {
    type: "map",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width: FLOOR_WIDTH,
    height: FLOOR_HEIGHT,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer(1, "ground", ground),
      layer(2, "collision", collision, false),
      {
        id: 3,
        name: "markers",
        type: "objectgroup",
        draworder: "topdown",
        opacity: 1,
        visible: true,
        x: 0,
        y: 0,
        objects: [
          point("entry", "from_above", layout.arrive),
          point("entry", "from_below", layout.arrive),
          ...(layout.camp
            ? [
                {
                  ...point("service", "camp-chest", layout.camp),
                  properties: <{ name: string; value: unknown }[]>[
                    { name: "kind", value: "camp-chest" },
                  ],
                },
              ]
            : []),
          {
            ...point("exit", "up", layout.up),
            x: layout.up.x * 16,
            y: layout.up.y * 16,
            width: 16,
            height: 16,
            properties: <{ name: string; value: unknown }[]>[
              {
                name: "map",
                value: floor > 1 ? mineMapId(floor - 1) : "mine",
              },
              {
                name: "entry",
                value: floor > 1 ? "from_below" : "from_stairs",
              },
            ],
          },
        ],
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: "placeholder",
        tilewidth: 16,
        tileheight: 16,
        tilecount: 12,
        columns: 10,
        image: "placeholder-tiles.png",
        imagewidth: 192,
        imageheight: 16,
      },
    ],
  };
  return json as unknown as TiledMapJson & { tilesets: unknown[] };
}

/**
 * The creatures a floor starts the day with (note 22): on open tiles, never on
 * a rock, the way up or a ladder, and well away from where the player arrives.
 * Seeded by the day and the floor, so a reload does not change them.
 */
export function floorCreatures(floor: number, day: number): Creature[] {
  const layout = floorLayout(floor, day);
  if (layout.special === "geode") return [];
  const random = seeded(day * 2003 + floor * 6173 + 29);
  const taken = new Set(layout.rocks.map((r) => `${r.x},${r.y}`));
  if (layout.ladder) taken.add(`${layout.ladder.x},${layout.ladder.y}`);
  if (layout.camp) taken.add(`${layout.camp.x},${layout.camp.y}`);
  return spawnCreatures(
    floor,
    random,
    (x, y) =>
      !layout.walls[y * FLOOR_WIDTH + x] &&
      !taken.has(`${x},${y}`) &&
      !near({ x, y }, UP, 1),
    FLOOR_WIDTH,
    FLOOR_HEIGHT,
    ARRIVE,
    16,
    6,
    layout.special === "infested" ? INFESTED_EXTRA_CREATURES : 0,
  );
}

/** One floor as the player has dug it today. */
export class Floor {
  constructor(
    readonly day: number,
    readonly rocks: Rocks,
    public ladder: Spot | undefined,
    /** The creatures still on the floor today. A beaten one is gone until tomorrow. */
    public creatures: Creature[] = [],
  ) {}

  /** Kills made on the floor today, for the infested slayer bonus. Not saved. */
  kills = 0;
}

export interface FloorSave {
  day: number;
  rocks: Rock[];
  ladder?: Spot;
  /** Absent in saves from before creatures: the floor is given its day's creatures on load. */
  creatures?: CreatureSave[];
}

export interface MinesSave {
  /** True once Old Greencoat has come to the door (note 22). */
  greeted?: boolean;
  /** The day the camp chest was last emptied, kept for saves from before the deeper camps (floor 10). */
  campTaken?: number;
  /** The day each camp chest was last emptied, by floor. */
  campDays?: Record<number, number>;
  /** Camp floors whose one item has been taken. */
  campOpened?: number[];
  deepest: number;
  misses: number;
  copperHandedIn: boolean;
  floors: Record<number, FloorSave>;
}

/** The mine's progress: the deepest floor, the dry streak and the floors dug today. */
export class Mines {
  /** The deepest floor reached, 0 before the first visit. The lift stops at every floor up to it. */
  deepest = 0;
  /** Rocks broken without a ladder under them. Resets when one is found. */
  misses = 0;
  /** True once the smith has been given copper ore (note 22, decision 11). */
  copperHandedIn = false;
  /** True once Old Greencoat has brought the news at the farm door. */
  greeted = false;
  /** The day each camp chest was last emptied, by floor. */
  private campDays = new Map<number, number>();
  private floors = new Map<number, Floor>();

  /** The day a camp's chest was last emptied, 0 if never. */
  campTakenOn(floor: number): number {
    return this.campDays.get(floor) ?? 0;
  }

  /** Floors whose camp chest has given its one item (note 22, 2026-11-11). */
  private campOpened = new Set<number>();

  campOpenedOn(floor: number): boolean {
    return this.campOpened.has(floor);
  }

  openCamp(floor: number): void {
    this.campOpened.add(floor);
  }

  takeCamp(floor: number, day: number): void {
    this.campDays.set(floor, day);
  }

  /**
   * The floor as dug today, made fresh if it is a new day. Visiting it counts
   * as reaching it, so the lift stops there from now on.
   */
  visit(floor: number, day: number): Floor {
    this.deepest = Math.max(this.deepest, floor);
    const have = this.floors.get(floor);
    if (have && have.day === day) return have;
    const layout = floorLayout(floor, day);
    const rocks = new Rocks();
    for (const r of layout.rocks) rocks.add(r.x, r.y, r.kind);
    const made = new Floor(
      day,
      rocks,
      layout.ladder,
      floorCreatures(floor, day),
    );
    this.floors.set(floor, made);
    return made;
  }

  /**
   * The bonus for a kill on an infested floor (note 22, placeholders): a second
   * drop roll, and one extra slayer count in every four kills. Counts kills on
   * the floor today.
   */
  killBonus(
    floor: number,
    day: number,
  ): { extraDrop: boolean; extraKill: boolean } {
    if (!this.infested(floor, day))
      return { extraDrop: false, extraKill: false };
    const f = this.visit(floor, day);
    f.kills += 1;
    return {
      extraDrop: true,
      extraKill: f.kills % Math.round(1 / INFESTED_SLAYER_BONUS) === 0,
    };
  }

  /** True on an infested floor today (note 22, special floors). */
  infested(floor: number, day: number): boolean {
    return specialFloor(floor, day) === "infested";
  }

  /** The floor as dug today, if it has been visited today. */
  today(floor: number, day: number): Floor | undefined {
    const have = this.floors.get(floor);
    return have && have.day === day ? have : undefined;
  }

  /**
   * A rock was broken on a floor. Rolls the dry streak for a ladder under it.
   * The last rock always hides one, so a floor can always be left by digging.
   * Returns true if a ladder now shows. Floors with no way down yet never do.
   */
  rockBroken(
    floor: number,
    day: number,
    x: number,
    y: number,
    random: () => number,
    peaceful = false,
  ): boolean {
    const f = this.visit(floor, day);
    if (f.ladder || floor >= BUILT_FLOORS) return false;
    // An infested floor shows no ladder until every creature is beaten.
    if (!peaceful && this.infested(floor, day) && f.creatures.length > 0)
      return false;
    if (random() < ladderChance(this.misses) || f.rocks.count === 0) {
      f.ladder = { x, y };
      this.misses = 0;
      return true;
    }
    this.misses += 1;
    return false;
  }

  /**
   * A creature was beaten at a tile. It rolls the same dry streak chance as a
   * rock for a ladder, from the same counter (note 22, decision 18). Returns
   * true if a ladder now shows. The bottom floor has no way down.
   */
  creatureBeaten(
    floor: number,
    day: number,
    x: number,
    y: number,
    random: () => number,
  ): boolean {
    const f = this.visit(floor, day);
    if (f.ladder || floor >= BUILT_FLOORS) return false;
    if (this.infested(floor, day)) {
      // The last creature to fall shows the way down.
      if (f.creatures.length > 0) return false;
      f.ladder = { x, y };
      this.misses = 0;
      return true;
    }
    if (random() < ladderChance(this.misses)) {
      f.ladder = { x, y };
      this.misses = 0;
      return true;
    }
    this.misses += 1;
    return false;
  }

  save(): MinesSave {
    const floors: Record<number, FloorSave> = {};
    for (const [n, f] of this.floors)
      floors[n] = {
        day: f.day,
        rocks: f.rocks.save(),
        creatures: f.creatures.map(saveCreature),
        ...(f.ladder ? { ladder: { ...f.ladder } } : {}),
      };
    return {
      greeted: this.greeted,
      campDays: Object.fromEntries(this.campDays),
      campOpened: [...this.campOpened],
      deepest: this.deepest,
      misses: this.misses,
      copperHandedIn: this.copperHandedIn,
      floors,
    };
  }

  load(saved: MinesSave): void {
    this.deepest = saved.deepest;
    this.misses = saved.misses;
    this.copperHandedIn = saved.copperHandedIn;
    // A save from before the door scene that already dug has no need of the news.
    this.greeted = saved.greeted ?? this.deepest > 0;
    this.campDays = new Map(
      Object.entries(saved.campDays ?? {}).map(([n, d]) => [Number(n), d]),
    );
    this.campOpened = new Set(saved.campOpened ?? []);
    if (saved.campTaken && !this.campDays.has(CAMP_EVERY))
      this.campDays.set(CAMP_EVERY, saved.campTaken);
    this.floors = new Map();
    for (const [n, f] of Object.entries(saved.floors)) {
      const rocks = new Rocks();
      rocks.load(f.rocks);
      const creatures = f.creatures
        ? f.creatures.flatMap((c) => loadCreature(c) ?? [])
        : floorCreatures(Number(n), f.day);
      this.floors.set(Number(n), new Floor(f.day, rocks, f.ladder, creatures));
    }
  }
}
