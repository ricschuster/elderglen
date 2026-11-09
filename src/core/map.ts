import type { Spot } from "./forage";
import { ROCK_KINDS, type RockKind } from "./rocks";

/**
 * The part of a Tiled JSON map the game reads. The contract is documented in
 * docs/design/05_farm_map_placeholder.md. Nothing here knows any layout.
 */
export interface TiledObject {
  name: string;
  class?: string;
  /** Older Tiled versions call the class "type". */
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Tiled custom properties. A `tier` property puts the object on that tier. */
  properties?: { name: string; value: unknown }[];
}

export interface TiledLayer {
  name: string;
  type: string;
  visible?: boolean;
  data?: number[];
  objects?: TiledObject[];
  /** Tiled custom properties. `when` and `unless` make the layer conditional. */
  properties?: { name: string; value: unknown }[];
}

export interface TiledMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  /** Tiled custom properties of the map, such as the camera `bounds` per tier. */
  properties?: { name: string; value: unknown }[];
}

/** A rectangle of tiles. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Growing buildings keep every tier in one map (`docs/design/68_growing_interiors.md`).
 * A layer named with a `-tN` suffix, such as `ground-t1`, belongs to tier N and
 * is read and drawn only when the building is at tier N or higher. A layer with
 * no suffix is tier 0. Higher tiers are drawn on top of lower ones.
 */
export function layerTier(name: string): number {
  const m = /-t(\d+)$/.exec(name);
  return m ? Number(m[1]) : 0;
}

/** A layer name without its tier suffix: `ground-t1` is `ground`. */
export function layerBase(name: string): string {
  return name.replace(/-t\d+$/, "");
}

/** The highest tier any layer of the map belongs to. Zero for a map that does not grow. */
export function maxTierOf(json: TiledMapJson): number {
  return json.layers.reduce((m, l) => Math.max(m, layerTier(l.name)), 0);
}

/** The tier a building at `tier` shows, kept between 0 and the map's highest. */
export function visibleTier(tier: number, maxTier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.min(Math.max(0, Math.floor(tier)), Math.max(0, maxTier));
}

/** No named condition holds. The default for a map read without a game state. */
export const NO_CONDITIONS: ReadonlySet<string> = new Set();

const layerText = (l: TiledLayer, key: string): string | undefined => {
  const value = l.properties?.find((p) => p.name === key)?.value;
  return typeof value === "string" && value !== "" ? value : undefined;
};

/**
 * Whether a layer is read and drawn, given the conditions that hold. A layer
 * property `when` names a condition that must hold, `unless` one that must not,
 * so ruined and repaired art swap (`docs/design/71_map_areas_overview.md`).
 */
export function layerShows(
  layer: TiledLayer,
  holds: ReadonlySet<string>,
): boolean {
  const when = layerText(layer, "when");
  const unless = layerText(layer, "unless");
  return (
    (when === undefined || holds.has(when)) &&
    (unless === undefined || !holds.has(unless))
  );
}

/** Every condition name any layer of the map uses in `when` or `unless`. */
export function conditionsOf(json: TiledMapJson): string[] {
  const out = new Set<string>();
  for (const l of json.layers)
    for (const key of ["when", "unless"]) {
      const c = layerText(l, key);
      if (c !== undefined) out.add(c);
    }
  return [...out];
}

/**
 * The layers at or below a tier, lowest tier first and in file order within a
 * tier, so a higher tier lands on top.
 */
export function layersAtTier(
  json: TiledMapJson,
  tier: number,
  holds: ReadonlySet<string> = NO_CONDITIONS,
): TiledLayer[] {
  return json.layers
    .map((layer, i) => ({ layer, i, t: layerTier(layer.name) }))
    .filter((e) => e.t <= tier && layerShows(e.layer, holds))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((e) => e.layer);
}

/**
 * In a tier layer a collision tile with this id opens the cell (a doorway cut
 * through a wall of a lower tier). Any other tile blocks it.
 */
export const OPEN_TILE = 2;

/** The tile layer that says which cells are built. Cells it leaves empty are void. */
export const GROUND_LAYER = "ground";

/** A named place where the player can arrive, in tiles. */
export interface Entry extends Spot {
  name: string;
  /**
   * A condition the entry exists under: the Mountain's `from_mine` lies behind
   * the rockfall, so it cannot reach the rest of the map until `mines-open`.
   * The contract check skips such an entry in a reading where it does not hold.
   */
  requires?: string;
}

/**
 * A way out of the map, in tiles: a rectangle that leads to entry `entry` of
 * map `map`. `requires` names a condition that must hold before it opens.
 */
export interface Exit {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  map: string;
  entry: string;
  requires?: string;
}

/**
 * A tile the player faces and uses to open a screen, such as a shop counter or
 * the village hall. `kind` names the screen; the map does not know the kinds.
 */
export interface Service extends Spot {
  id: string;
  kind: string;
}

/** The kinds of tree, by region (SC-30). Tap products stay as note 36. */
export type TreeKind = "oak" | "maple" | "pine";
export const TREE_KINDS: readonly TreeKind[] = ["oak", "maple", "pine"];

/** A tree placed on the map at the start of a new game. `stage` is 1 to 5 (`core/trees.ts`). */
export interface TreeSpot extends Spot {
  stage: number;
  /** Absent means oak, the farm's tree. */
  kind?: TreeKind;
  /** A large stump that regrows after it is chopped (`core/trees.ts`). Stage is 5. */
  large?: boolean;
}

/** Weeds and twigs placed on a map by hand (the object classes `weed` and `twig`). */
export interface Litter {
  weeds: Spot[];
  twigs: Spot[];
}

/** A rock the map places: plain stone unless it names another kind (the Quarry's ore nodes). */
export interface RockSpot extends Spot {
  kind?: RockKind;
}

/** A named rectangle of tiles, such as one room of the hall. */
export interface Region {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The forage table that forage points inside this region use (`forage-areas.json`). */
  forage?: string;
  /** A clear pad (note 78): nothing spawns, spreads or returns here overnight. Machines and chests go here. */
  pad?: boolean;
}

/** The bodies of water, each with its own fish table and pot kind (note 71). */
export type WaterKind =
  | "river"
  | "forest-lake"
  | "mountain-lake"
  | "marsh-lake"
  | "sea"
  | "cove"
  | "woods-pond";
export const WATER_KINDS: readonly WaterKind[] = [
  "river",
  "forest-lake",
  "mountain-lake",
  "marsh-lake",
  "sea",
  "cove",
  "woods-pond",
];

/** A rectangle of water of one kind (the object class `water`). */
export interface WaterZone extends TileRect {
  kind: WaterKind;
}

/**
 * The massive log (the object class `log`): solid until chopped with a steel
 * axe or better. `flag` is the world flag chopping it sets, named by the
 * object's `flag` property.
 */
export interface LogSpot extends Spot {
  flag: string;
}

/** Service kinds the map places for later rewards and boards (notes 16, 50, 57, 65). */
export const CART_KIND = "cart";
export const BOARD_KINDS = [
  "board-help",
  "board-news",
  "board-orders",
] as const;

/** Map-wide properties beyond the tile layers (note 71, Map contract additions). */
export interface MapTraits {
  /** The water kind of a water tile outside every `water` zone. The farm pond is the river. */
  waterKind: WaterKind;
  /** Days a chopped large stump takes to regrow here. Absent: the farm type decides. */
  stumpRegrowDays?: number;
  /** Whether the horse can be ridden here. Default false. */
  rideable: boolean;
  /**
   * The map property `wild`: an outdoor map with no soil that still has its own
   * trees, rocks, weeds, twigs and forage (the Forest). See `core/areas.ts`.
   */
  wild: boolean;
}

const DEFAULT_TRAITS: MapTraits = {
  waterKind: "river",
  rideable: false,
  wild: false,
};

/** Whether the player may use an exit, given the conditions that hold. */
export function exitOpen(exit: Exit, holds: ReadonlySet<string>): boolean {
  return exit.requires === undefined || holds.has(exit.requires);
}

/** The id of the water tile in the ground layer (the tileset's fourth tile). */
export const WATER_TILE = 4;

/** Layers the game reads for rules; they are never drawn. */
export const COLLISION_LAYER = "collision";
/** Optional: a map without it has no tillable soil. */
export const SOIL_LAYER = "soil";
/** Optional: path tiles, where a tree seed cannot be planted or spread. Never drawn. */
export const PATHS_LAYER = "paths";

const objectClass = (o: TiledObject) => o.class ?? o.type ?? "";

const treeKindOf = (o: TiledObject): { kind?: TreeKind } => {
  const kind = text(o, "kind");
  return kind === undefined ? {} : { kind: kind as TreeKind };
};

/** The map properties `waterKind`, `stumpRegrowDays` and `rideable`. */
function traitsOf(json: TiledMapJson): MapTraits {
  const prop = (name: string) =>
    json.properties?.find((p) => p.name === name)?.value;
  const days = prop("stumpRegrowDays");
  const kind = prop("waterKind");
  return {
    waterKind: typeof kind === "string" ? (kind as WaterKind) : "river",
    rideable: prop("rideable") === true,
    wild: prop("wild") === true,
    ...(typeof days === "number" ? { stumpRegrowDays: days } : {}),
  };
}

const num = (o: TiledObject, key: string): number | undefined => {
  const value = o.properties?.find((p) => p.name === key)?.value;
  return typeof value === "number" ? value : undefined;
};

const text = (o: TiledObject, key: string): string | undefined => {
  const value = o.properties?.find((p) => p.name === key)?.value;
  return typeof value === "string" && value !== "" ? value : undefined;
};

/**
 * The camera rectangle at a tier, in tiles: the map property `bounds` for
 * tier 0 and `bounds-tN` for tier N as "x,y,w,h", taking the highest one at or
 * below the tier. Without one it is the bounding box of the built cells.
 */
function boundsAt(
  json: TiledMapJson,
  tier: number,
  built: boolean[],
): TileRect {
  for (let t = tier; t >= 0; t--) {
    const name = t === 0 ? "bounds" : `bounds-t${t}`;
    const v = json.properties?.find((p) => p.name === name)?.value;
    if (typeof v !== "string") continue;
    const [x, y, w, h] = v.split(",").map((n) => Number(n.trim()));
    if ([x, y, w, h].every((n) => Number.isInteger(n)) && w! > 0 && h! > 0)
      return { x: x!, y: y!, w: w!, h: h! };
  }
  let x0 = json.width;
  let y0 = json.height;
  let x1 = -1;
  let y1 = -1;
  built.forEach((b, i) => {
    if (!b) return;
    const x = i % json.width;
    const y = Math.floor(i / json.width);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  });
  return x1 < 0
    ? { x: 0, y: 0, w: json.width, h: json.height }
    : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** What the rules need to know about a map, in tile units. */
export class FarmMap {
  private constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize: number,
    private readonly blocked: boolean[],
    private readonly soil: boolean[],
    readonly entries: Entry[],
    readonly exits: Exit[],
    readonly forageSpots: Spot[],
    readonly services: Service[] = [],
    readonly regions: Region[] = [],
    readonly trees: TreeSpot[] = [],
    private readonly paths: boolean[] = [],
    readonly rocks: RockSpot[] = [],
    /** The building tier this map shows. Zero for a map that does not grow. */
    readonly tier = 0,
    /** The built part of the map, in tiles: what the camera may show. */
    readonly bounds: TileRect = { x: 0, y: 0, w: width, h: height },
    /** Water tiles, by cell index: the ground layer's water tile (`WATER_TILE`). */
    private readonly water: boolean[] = [],
    /** An indoor growing room (the map property `indoors`): its soil is not the farm's. */
    readonly indoors = false,
    /** Rectangles of water with their own kind (the object class `water`). */
    readonly waterZones: WaterZone[] = [],
    /** Massive logs, solid until chopped (the object class `log`). */
    readonly logs: LogSpot[] = [],
    readonly traits: MapTraits = DEFAULT_TRAITS,
    /** Weeds and twigs lying on the map at the start of a new game (`weed` and `twig` objects). */
    readonly litter: Litter = { weeds: [], twigs: [] },
  ) {}

  /** Whether the horse can be ridden on this map (the map property `rideable`). */
  get rideable(): boolean {
    return this.traits.rideable;
  }

  /** Whether this map keeps its own trees, rocks, weeds, twigs and forage (the map property `wild`). */
  get wild(): boolean {
    return this.traits.wild;
  }

  /** The map's own stump regrow days, if it sets them (`stumpRegrowDays`). */
  get stumpRegrowDays(): number | undefined {
    return this.traits.stumpRegrowDays;
  }

  /**
   * The kind of water on a tile: the first `water` zone that holds it, else the
   * map's default `waterKind`. Undefined when the tile is not water.
   */
  waterKindAt(x: number, y: number): WaterKind | undefined {
    if (!this.isWater(x, y)) return undefined;
    const zone = this.waterZones.find(
      (z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h,
    );
    return zone?.kind ?? this.traits.waterKind;
  }

  /** The log standing on this tile, if any. */
  logAt(x: number, y: number): LogSpot | undefined {
    return this.logs.find((l) => l.x === x && l.y === y);
  }

  /** The forage table name for a point: that of the region holding it, else "default". */
  forageTableAt(x: number, y: number): string {
    const region = this.regions.find(
      (r) =>
        r.forage !== undefined &&
        x >= r.x &&
        x < r.x + r.w &&
        y >= r.y &&
        y < r.y + r.h,
    );
    return region?.forage ?? "default";
  }

  /** True on a clear pad (a region with `pad`): nothing is placed there overnight. */
  isPad(x: number, y: number): boolean {
    return this.regions.some(
      (r) =>
        r.pad === true &&
        x >= r.x &&
        x < r.x + r.w &&
        y >= r.y &&
        y < r.y + r.h,
    );
  }

  /** True for a water tile: fishable, and never walkable. */
  isWater(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.water[y * this.width + x] === true;
  }

  /**
   * Read a Tiled map as it stands at a building tier. Layers of a higher tier
   * are ignored, and on a map that grows, cells with no ground are void:
   * blocked, and outside the camera bounds. Throws with a clear message if the
   * map breaks the contract. A layer with `when` or `unless` is read only if
   * the condition holds (or does not), given `holds`.
   */
  static fromTiled(
    json: TiledMapJson,
    tier = 0,
    holds: ReadonlySet<string> = NO_CONDITIONS,
  ): FarmMap {
    const { width, height } = json;
    if (json.tilewidth !== json.tileheight)
      throw new Error("map tiles must be square");
    const size = json.tilewidth;
    const maxTier = maxTierOf(json);
    const at = visibleTier(tier, maxTier);
    const layers = layersAtTier(json, at, holds);
    const cells = width * height;
    /** The base layer must exist; a tier layer of the same name paints over it. */
    const grid = (name: string, optional = false): boolean[] => {
      const found = layers.filter(
        (l) => layerBase(l.name) === name && l.type === "tilelayer",
      );
      if (!found.some((l) => layerTier(l.name) === 0 && l.data)) {
        if (optional && found.length === 0) return new Array(cells).fill(false);
        throw new Error(`map needs a tile layer "${name}"`);
      }
      const out: boolean[] = new Array(cells).fill(false);
      for (const layer of found) {
        if (!layer.data) continue;
        if (layer.data.length !== cells)
          throw new Error(`layer "${name}" is not the size of the map`);
        const over = layerTier(layer.name) > 0;
        layer.data.forEach((id, i) => {
          if (id === 0) return;
          out[i] = !(over && name === COLLISION_LAYER && id === OPEN_TILE);
        });
      }
      return out;
    };
    const tile = (px: number) => Math.floor(px / size);

    const blocked = grid(COLLISION_LAYER);
    let bounds: TileRect = { x: 0, y: 0, w: width, h: height };
    if (maxTier > 0) {
      // Cells with no ground are the black void: never walkable.
      const built = new Array<boolean>(cells).fill(false);
      for (const layer of layers)
        if (layerBase(layer.name) === GROUND_LAYER && layer.data)
          layer.data.forEach((id, i) => {
            if (id !== 0) built[i] = true;
          });
      built.forEach((b, i) => {
        if (!b) blocked[i] = true;
      });
      bounds = boundsAt(json, at, built);
    }

    const water: boolean[] = new Array(cells).fill(false);
    for (const layer of layers)
      if (layerBase(layer.name) === GROUND_LAYER && layer.data)
        layer.data.forEach((id, i) => {
          if (id !== 0) water[i] = id === WATER_TILE;
        });

    const entries: Entry[] = [];
    const exits: Exit[] = [];
    const forageSpots: Spot[] = [];
    const services: Service[] = [];
    const regions: Region[] = [];
    const trees: TreeSpot[] = [];
    const rocks: RockSpot[] = [];
    const litter: Litter = { weeds: [], twigs: [] };
    const waterZones: WaterZone[] = [];
    const logs: LogSpot[] = [];
    // A named entry, exit or service on a higher tier replaces the one of the
    // same name on a lower tier (the barn door moves as the barn grows).
    const kept = new Map<string, { tier: number; at: number }>();
    const put = <T>(
      list: T[],
      kind: string,
      name: string,
      objTier: number,
      item: T,
    ) => {
      const k = `${kind}:${name}`;
      const prev = kept.get(k);
      if (!prev) {
        list.push(item);
        kept.set(k, { tier: objTier, at: list.length - 1 });
      } else if (objTier > prev.tier) {
        list[prev.at] = item;
        prev.tier = objTier;
      } else if (objTier === prev.tier) list.push(item);
    };
    for (const layer of layers) {
      if (layer.type !== "objectgroup") continue;
      for (const o of layer.objects ?? []) {
        const objTier = num(o, "tier") ?? layerTier(layer.name);
        if (objTier > at) continue;
        const cls = objectClass(o);
        const spot = { x: tile(o.x), y: tile(o.y) };
        if (cls === "entry")
          put(entries, "entry", o.name, objTier, {
            name: o.name,
            ...spot,
            ...(text(o, "requires") ? { requires: text(o, "requires") } : {}),
          });
        else if (cls === "forage") forageSpots.push(spot);
        else if (cls === "rock") {
          const kind = text(o, "kind") as RockKind | undefined;
          rocks.push(kind ? { ...spot, kind } : spot);
        } else if (cls === "weed") litter.weeds.push(spot);
        else if (cls === "twig") litter.twigs.push(spot);
        else if (cls === "tree")
          trees.push({
            ...spot,
            stage: num(o, "stage") ?? 5,
            ...treeKindOf(o),
          });
        else if (cls === "stump")
          trees.push({ ...spot, stage: 5, large: true, ...treeKindOf(o) });
        else if (cls === "log")
          logs.push({ ...spot, flag: text(o, "flag") ?? "" });
        else if (cls === "water")
          waterZones.push({
            ...spot,
            w: Math.max(1, Math.round((o.width ?? size) / size)),
            h: Math.max(1, Math.round((o.height ?? size) / size)),
            kind: (text(o, "kind") ?? "") as WaterKind,
          });
        else if (cls === "service")
          put(services, "service", o.name, objTier, {
            id: o.name,
            kind: text(o, "kind") ?? "",
            ...spot,
          });
        else if (cls === "region")
          regions.push({
            id: o.name,
            ...spot,
            ...(text(o, "forage") === undefined
              ? {}
              : { forage: text(o, "forage") }),
            ...(text(o, "pad") === "true" ? { pad: true } : {}),
            w: Math.max(1, Math.round((o.width ?? size) / size)),
            h: Math.max(1, Math.round((o.height ?? size) / size)),
          });
        else if (cls === "exit") {
          const w = Math.max(1, Math.round((o.width ?? size) / size));
          const h = Math.max(1, Math.round((o.height ?? size) / size));
          const requires = text(o, "requires");
          put(exits, "exit", o.name, objTier, {
            id: o.name,
            ...spot,
            w,
            h,
            map: text(o, "map") ?? "",
            entry: text(o, "entry") ?? "",
            ...(requires === undefined ? {} : { requires }),
          });
        }
      }
    }
    return new FarmMap(
      width,
      height,
      size,
      blocked,
      grid(SOIL_LAYER, true),
      entries,
      exits,
      forageSpots,
      services,
      regions,
      trees,
      grid(PATHS_LAYER, true),
      rocks,
      at,
      bounds,
      water,
      json.properties?.find((p) => p.name === "indoors")?.value === true,
      waterZones,
      logs,
      traitsOf(json),
      litter,
    );
  }

  /**
   * A copy of this map with one door moved: the exit `exitId` to the tile
   * `door`, and the entry `entryName` (where you land coming out) to the tile
   * below it. Placed buildings move their doors this way
   * (`docs/design/60_building_placement.md`). A name the map lacks is skipped.
   */
  withDoor(exitId: string, entryName: string, door: Spot): FarmMap {
    return new FarmMap(
      this.width,
      this.height,
      this.tileSize,
      this.blocked,
      this.soil,
      this.entries.map((e) =>
        e.name === entryName ? { ...e, x: door.x, y: door.y + 1 } : e,
      ),
      this.exits.map((e) =>
        e.id === exitId ? { ...e, x: door.x, y: door.y } : e,
      ),
      this.forageSpots,
      this.services,
      this.regions,
      this.trees,
      this.paths,
      this.rocks,
      this.tier,
      this.bounds,
      this.water,
      this.indoors,
      this.waterZones,
      this.logs,
      this.traits,
      this.litter,
    );
  }

  /**
   * A copy of this map with every open tile in a rectangle made tillable.
   * Used for the greenhouse's old site once it has been moved, since the soil
   * layer was never marked there. Blocked tiles stay untillable.
   */
  withSoil(rect: { x: number; y: number; w: number; h: number }): FarmMap {
    const soil = [...this.soil];
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (!this.inside(x, y) || this.blocked[y * this.width + x] === true)
          continue;
        soil[y * this.width + x] = true;
      }
    return new FarmMap(
      this.width,
      this.height,
      this.tileSize,
      this.blocked,
      soil,
      this.entries,
      this.exits,
      this.forageSpots,
      this.services,
      this.regions,
      this.trees,
      this.paths,
      this.rocks,
      this.tier,
      this.bounds,
      this.water,
      this.indoors,
      this.waterZones,
      this.logs,
      this.traits,
      this.litter,
    );
  }

  /**
   * A copy of this map with a building's footprint walled off and made
   * untillable, except its door tile. The greenhouse is the farm's one building
   * that is not in the map data, so it can be moved
   * (`docs/design/60_building_placement.md`).
   */
  withBuilding(
    rect: { x: number; y: number; w: number; h: number },
    door: Spot,
  ): FarmMap {
    const blocked = [...this.blocked];
    const soil = [...this.soil];
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (!this.inside(x, y)) continue;
        soil[y * this.width + x] = false;
        if (x === door.x && y === door.y) continue;
        blocked[y * this.width + x] = true;
      }
    return new FarmMap(
      this.width,
      this.height,
      this.tileSize,
      blocked,
      soil,
      this.entries,
      this.exits,
      this.forageSpots,
      this.services,
      this.regions,
      this.trees,
      this.paths,
      this.rocks,
      this.tier,
      this.bounds,
      this.water,
      this.indoors,
      this.waterZones,
      this.logs,
      this.traits,
      this.litter,
    );
  }

  /** Outside the map counts as blocked. */
  isBlocked(x: number, y: number): boolean {
    return !this.inside(x, y) || this.blocked[y * this.width + x] === true;
  }

  isTillable(x: number, y: number): boolean {
    return this.inside(x, y) && this.soil[y * this.width + x] === true;
  }

  /** Every tillable tile, in reading order. */
  tillableTiles(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++)
        if (this.soil[y * this.width + x] === true) out.push({ x, y });
    return out;
  }

  /** True on a path tile. */
  isPath(x: number, y: number): boolean {
    return this.inside(x, y) && this.paths[y * this.width + x] === true;
  }

  /**
   * Whether a tree seed may be planted here: open ground that is not a path, an
   * exit, an entry or a service tile. Trees never destroy paths
   * (`docs/design/36_gathering_trees_sap_fiber.md`).
   */
  canPlantTree(x: number, y: number): boolean {
    return (
      this.inside(x, y) &&
      this.blocked[y * this.width + x] !== true &&
      !this.isPath(x, y) &&
      !this.exitAt(x, y) &&
      !this.entries.some((e) => e.x === x && e.y === y) &&
      !this.serviceAt(x, y)
    );
  }

  /** Tiles that the starting trees block, so the layout is checked with them. */
  private treeTiles(): Set<string> {
    return new Set(
      this.trees.filter((t) => t.stage > 1).map((t) => `${t.x},${t.y}`),
    );
  }

  /** The entry with this name, if the map has one. */
  entry(name: string): Entry | undefined {
    return this.entries.find((e) => e.name === name);
  }

  /** The exit covering this tile, if any. */
  exitAt(x: number, y: number): Exit | undefined {
    return this.exits.find(
      (e) => x >= e.x && x < e.x + e.w && y >= e.y && y < e.y + e.h,
    );
  }

  /** The service on this tile, if any. */
  serviceAt(x: number, y: number): Service | undefined {
    return this.services.find((s) => s.x === x && s.y === y);
  }

  /** Tiles that can be walked to from `from`, four ways. */
  reachable(from: Spot): Set<string> {
    const seen = new Set<string>();
    const solid = this.treeTiles();
    if (this.isBlocked(from.x, from.y)) return seen;
    const queue = [from];
    seen.add(`${from.x},${from.y}`);
    for (let i = 0; i < queue.length; i++) {
      const { x, y } = queue[i] as Spot;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = { x: x + dx, y: y + dy };
        const k = `${next.x},${next.y}`;
        // A log is solid only until it is chopped, so it counts as open here.
        if (
          seen.has(k) ||
          solid.has(k) ||
          (this.isBlocked(next.x, next.y) && !this.logAt(next.x, next.y))
        )
          continue;
        seen.add(k);
        queue.push(next);
      }
    }
    return seen;
  }

  /**
   * Everything wrong with this map on its own, in words. Empty when it is
   * usable. Whether exit targets exist is checked across maps (`MapRegistry`).
   */
  problems(): string[] {
    const out: string[] = [];
    if (this.entries.length === 0) out.push("needs at least one entry");
    const names = this.entries.map((e) => e.name);
    if (names.includes("")) out.push("every entry needs a name");
    if (new Set(names).size !== names.length)
      out.push("entry names must be unique");
    const ids = this.exits.map((e) => e.id);
    if (ids.includes("")) out.push("every exit needs a name");
    if (new Set(ids).size !== ids.length) out.push("exit names must be unique");
    for (const exit of this.exits)
      if (exit.map === "" || exit.entry === "")
        out.push(`exit "${exit.id}" needs a map and an entry`);
    const serviceIds = this.services.map((s) => s.id);
    if (serviceIds.includes("")) out.push("every service needs a name");
    if (new Set(serviceIds).size !== serviceIds.length)
      out.push("service names must be unique");
    for (const service of this.services)
      if (service.kind === "") out.push(`service "${service.id}" needs a kind`);
    const treeIds = new Set<string>();
    for (const t of this.trees) {
      const at = `tree at ${t.x},${t.y}`;
      if (treeIds.has(`${t.x},${t.y}`)) out.push(`${at} is placed twice`);
      treeIds.add(`${t.x},${t.y}`);
      if (t.stage < 1 || t.stage > 5)
        out.push(`${at} has a stage outside 1 to 5`);
      if (!this.canPlantTree(t.x, t.y))
        out.push(`${at} is on a blocked, path, exit, entry or service tile`);
    }
    if (!WATER_KINDS.includes(this.traits.waterKind))
      out.push(`waterKind "${this.traits.waterKind}" is not a water kind`);
    const days = this.traits.stumpRegrowDays;
    if (days !== undefined && (!Number.isInteger(days) || days < 0))
      out.push("stumpRegrowDays must be a whole number, zero or more");
    for (const z of this.waterZones)
      if (!WATER_KINDS.includes(z.kind))
        out.push(
          `water zone at ${z.x},${z.y} has the kind "${z.kind}", which is not a water kind`,
        );
    for (const t of this.trees)
      if (t.kind !== undefined && !TREE_KINDS.includes(t.kind))
        out.push(`tree at ${t.x},${t.y} has the kind "${t.kind}"`);
    for (const l of this.logs) {
      if (l.flag === "") out.push(`log at ${l.x},${l.y} needs a flag`);
      if (
        this.exitAt(l.x, l.y) ||
        this.entries.some((e) => e.x === l.x && e.y === l.y)
      )
        out.push(`log at ${l.x},${l.y} is on an exit or entry tile`);
    }
    for (const r of this.rocks)
      if (
        this.isBlocked(r.x, r.y) ||
        this.exitAt(r.x, r.y) ||
        this.entries.some((e) => e.x === r.x && e.y === r.y) ||
        this.serviceAt(r.x, r.y)
      )
        out.push(
          `rock at ${r.x},${r.y} is on a blocked, exit, entry or service tile`,
        );
    for (const r of this.rocks)
      if (r.kind !== undefined && !ROCK_KINDS.includes(r.kind))
        out.push(
          `rock at ${r.x},${r.y} has the kind "${r.kind}", which is not a rock kind`,
        );
    for (const [what, spots] of [
      ["weed", this.litter.weeds],
      ["twig", this.litter.twigs],
    ] as const)
      for (const r of spots)
        if (
          this.isBlocked(r.x, r.y) ||
          this.exitAt(r.x, r.y) ||
          this.entries.some((e) => e.x === r.x && e.y === r.y) ||
          this.serviceAt(r.x, r.y)
        )
          out.push(
            `${what} at ${r.x},${r.y} is on a blocked, exit, entry or service tile`,
          );
    for (const entry of this.entries) {
      if (this.exitAt(entry.x, entry.y))
        out.push(`entry "${entry.name}" is inside an exit`);
      if (this.isBlocked(entry.x, entry.y))
        out.push(`entry "${entry.name}" is blocked`);
    }

    for (const entry of this.entries) {
      const walkable = this.reachable(entry);
      for (const exit of this.exits) {
        let ok = false;
        for (let y = exit.y; y < exit.y + exit.h; y++)
          for (let x = exit.x; x < exit.x + exit.w; x++)
            if (walkable.has(`${x},${y}`)) ok = true;
        if (!ok)
          out.push(
            `exit "${exit.id}" cannot be reached from entry "${entry.name}"`,
          );
      }
      for (const service of this.services) {
        const beside = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) =>
          walkable.has(`${service.x + dx!},${service.y + dy!}`),
        );
        if (!beside)
          out.push(
            `service "${service.id}" cannot be reached from entry "${entry.name}"`,
          );
      }
      for (const z of this.waterZones) {
        if (!this.hasCastingSpot(z, walkable))
          out.push(
            `water zone at ${z.x},${z.y} has no walkable casting spot from entry "${entry.name}"`,
          );
      }
      for (const s of this.forageSpots)
        if (this.treeTiles().has(`${s.x},${s.y}`))
          out.push(`forage spot ${s.x},${s.y} is under a tree`);
        else if (!walkable.has(`${s.x},${s.y}`))
          out.push(
            `forage spot ${s.x},${s.y} cannot be reached from entry "${entry.name}"`,
          );
    }
    return out;
  }

  /**
   * Whether the player can stand beside some water tile of the zone: a walkable
   * tile next to it, four ways, that is not itself water.
   */
  private hasCastingSpot(zone: WaterZone, walkable: Set<string>): boolean {
    for (let y = zone.y; y < zone.y + zone.h; y++)
      for (let x = zone.x; x < zone.x + zone.w; x++) {
        if (!this.isWater(x, y)) continue;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const)
          if (
            !this.isWater(x + dx, y + dy) &&
            walkable.has(`${x + dx},${y + dy}`)
          )
            return true;
      }
    return false;
  }

  /** Whether any tile can be tilled. */
  get hasSoil(): boolean {
    return this.soil.some(Boolean);
  }

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
}
