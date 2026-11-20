import { WATER_TILE, type TiledMapJson } from "./map";
import { WALL_TILE } from "./decor";
import { addObject } from "./layoutedit";

/**
 * Block-out brushes for the layout page (`docs/design/87_layout_page.md`,
 * slice 3). Pure: each takes a map and a tile rectangle and returns a new map.
 * A brush uses the one placeholder tile of its kind and writes the layers
 * directly with the index Tiled would write, so the file stays one Tiled opens.
 */

export type Brush = "water" | "path" | "building" | "pad" | "soil" | "erase";

export const BRUSHES: readonly Brush[] = [
  "water",
  "path",
  "building",
  "pad",
  "soil",
  "erase",
];

/** The placeholder tile of a path on the ground (tile 3 of the tileset, as the farm and the mines use). */
export const PATH_TILE = 3;

/** A tile rectangle, inclusive of its first cell, `w` and `h` at least 1. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which face of a building footprint holds the door. */
export type Face = "n" | "s" | "e" | "w";

export interface BrushOptions {
  /** Water kind of the `water` object (default `river`). */
  waterKind?: string;
  /** Door face of a building (default `s`, below the building). */
  face?: Face;
  /** A building with an interior: the tile in front of the door is also left open. */
  interior?: boolean;
  /** The layer base the erase brush clears (default `collision`). */
  eraseLayer?: string;
}

/** The two corners of a drag, as a rectangle clipped to the map. */
export function rectOf(
  json: TiledMapJson,
  a: { x: number; y: number },
  b: { x: number; y: number },
): Rect {
  const x0 = Math.max(0, Math.min(a.x, b.x));
  const y0 = Math.max(0, Math.min(a.y, b.y));
  const x1 = Math.min(json.width - 1, Math.max(a.x, b.x));
  const y1 = Math.min(json.height - 1, Math.max(a.y, b.y));
  return {
    x: x0,
    y: y0,
    w: Math.max(1, x1 - x0 + 1),
    h: Math.max(1, y1 - y0 + 1),
  };
}

const clone = <T>(v: T): T => structuredClone(v);

/** The tile layer with exactly this name, created (all zero, after the last tile layer) when the map lacks it. */
function tileLayer(json: TiledMapJson, name: string) {
  let layer = json.layers.find(
    (l) => l.name === name && l.type === "tilelayer",
  );
  if (layer?.data) return layer;
  const ground = json.layers.find((l) => l.name === "ground");
  if (!ground?.data) throw new Error("map has no ground layer");
  const raw = json as unknown as { nextlayerid?: number };
  const made = {
    ...(raw.nextlayerid !== undefined ? { id: raw.nextlayerid } : {}),
    name,
    type: "tilelayer",
    x: 0,
    y: 0,
    width: json.width,
    height: json.height,
    opacity: 1,
    visible: true,
    data: new Array(json.width * json.height).fill(0),
  } as unknown as (typeof json.layers)[number];
  if (raw.nextlayerid !== undefined) raw.nextlayerid += 1;
  const lastTile = json.layers.reduce(
    (m, l, i) => (l.type === "tilelayer" ? i : m),
    -1,
  );
  json.layers.splice(lastTile + 1, 0, made);
  layer = made;
  return layer;
}

function fill(json: TiledMapJson, name: string, r: Rect, id: number): void {
  const data = tileLayer(json, name).data!;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) data[y * json.width + x] = id;
}

const setCell = (
  json: TiledMapJson,
  name: string,
  x: number,
  y: number,
  id: number,
): void => {
  if (x < 0 || y < 0 || x >= json.width || y >= json.height) return;
  tileLayer(json, name).data![y * json.width + x] = id;
};

function uniqueName(json: TiledMapJson, base: string): string {
  const taken = new Set(
    json.layers.flatMap((l) => (l.objects ?? []).map((o) => o.name)),
  );
  for (let n = 1; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** The first object layer, where the brushes add water and region objects. */
const objectLayerOf = (json: TiledMapJson): number => {
  const at = json.layers.findIndex(
    (l) => l.type === "objectgroup" && !l.name.includes("-"),
  );
  const any =
    at >= 0 ? at : json.layers.findIndex((l) => l.type === "objectgroup");
  if (any < 0) throw new Error("map has no object layer");
  return any;
};

function addRectObject(
  json: TiledMapJson,
  cls: "water" | "region",
  name: string,
  r: Rect,
  props: Record<string, string | number | boolean>,
): TiledMapJson {
  const layer = objectLayerOf(json);
  const out = addObject(json, layer, cls, name, r.x, r.y, props);
  const o = out.layers[layer]!.objects!.at(-1)!;
  o.width = r.w * json.tilewidth;
  o.height = r.h * json.tilewidth;
  return out;
}

/** The door cell of a building footprint on a face, in the middle of that face. */
export function doorCell(
  r: Rect,
  face: Face,
): { x: number; y: number; outX: number; outY: number } {
  const mx = r.x + Math.floor((r.w - 1) / 2);
  const my = r.y + Math.floor((r.h - 1) / 2);
  if (face === "n") return { x: mx, y: r.y, outX: mx, outY: r.y - 1 };
  if (face === "s")
    return { x: mx, y: r.y + r.h - 1, outX: mx, outY: r.y + r.h };
  if (face === "w") return { x: r.x, y: my, outX: r.x - 1, outY: my };
  return { x: r.x + r.w - 1, y: my, outX: r.x + r.w, outY: my };
}

/** Apply a brush to a rectangle. Returns a new map; the input is not changed. */
export function applyBrush(
  json: TiledMapJson,
  brush: Brush,
  rect: Rect,
  opts: BrushOptions = {},
): TiledMapJson {
  let out = clone(json);
  switch (brush) {
    case "water": {
      fill(out, "ground", rect, WATER_TILE);
      fill(out, "collision", rect, 1);
      out = addRectObject(out, "water", uniqueName(out, "water"), rect, {
        kind: opts.waterKind ?? "river",
      });
      break;
    }
    case "path":
      fill(out, "ground", rect, PATH_TILE);
      fill(out, "paths", rect, 1);
      fill(out, "collision", rect, 0);
      break;
    case "building": {
      fill(out, "collision", rect, 1);
      fill(out, "objects", rect, WALL_TILE);
      fill(out, "soil", rect, 0);
      const d = doorCell(rect, opts.face ?? "s");
      setCell(out, "collision", d.x, d.y, 0);
      setCell(out, "objects", d.x, d.y, 0);
      if (opts.interior) setCell(out, "collision", d.outX, d.outY, 0);
      break;
    }
    case "pad":
      out = addRectObject(out, "region", uniqueName(out, "pad"), rect, {
        pad: "true",
      });
      break;
    case "soil":
      fill(out, "soil", rect, 1);
      break;
    case "erase":
      fill(out, opts.eraseLayer ?? "collision", rect, 0);
      break;
  }
  return out;
}
