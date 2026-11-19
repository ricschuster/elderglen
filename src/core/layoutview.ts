import {
  NO_CONDITIONS,
  layerBase,
  layersAtTier,
  maxTierOf,
  type TiledMapJson,
  type TiledObject,
} from "./map";
import { MapRegistry } from "./maps";

/**
 * Pure helpers for the layout page (`docs/design/87_layout_page.md`). The page
 * itself is a dev-only DOM tool; everything it decides lives here so it can be
 * unit tested. Nothing in this file touches Phaser or the DOM.
 */

export type MapKind = "outdoor" | "interior" | "festival";

/**
 * The area filter of the map list. A map with the `rideable` or `wild` property
 * is outdoors, a map whose id names a fair, feast or market is a festival map,
 * and every other map is an interior (a simple reading of note 87).
 */
export function mapKind(id: string, json: TiledMapJson): MapKind {
  if (/festival|feast|fair|market/.test(id)) return "festival";
  const on = (name: string) =>
    json.properties?.some((p) => p.name === name && p.value === true) === true;
  return on("rideable") || on("wild") ? "outdoor" : "interior";
}

/** Whether the map still has placeholder art (the `placeholder` map property). */
export function isPlaceholder(json: TiledMapJson): boolean {
  return (
    json.properties?.some(
      (p) => p.name === "placeholder" && p.value === true,
    ) === true
  );
}

/** The map id a problem line is about: `registry.problems()` lines start with it. */
export function problemMapId(problem: string): string {
  return /^[^\s:]+/.exec(problem)?.[0] ?? "";
}

/** Problems grouped by map id. */
export function groupProblems(problems: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const p of problems) {
    const id = problemMapId(p);
    const list = out.get(id);
    if (list) list.push(p);
    else out.set(id, [p]);
  }
  return out;
}

/**
 * The same list the game's contract test uses: `MapRegistry.problems()` over
 * the given files. A file that cannot even be read is reported as a problem
 * naming its map, instead of throwing.
 */
export function registryProblems(
  files: Record<string, TiledMapJson>,
): string[] {
  try {
    return MapRegistry.fromTiled(files).problems();
  } catch (e) {
    return [(e as Error).message];
  }
}

export interface PlacedObject {
  cls: string;
  name: string;
  /** Tile position and size. */
  x: number;
  y: number;
  w: number;
  h: number;
  layer: string;
  properties: Record<string, unknown>;
  /** The raw object, for the inspector. */
  raw: TiledObject;
}

const clsOf = (o: TiledObject) => o.class ?? o.type ?? "";

/** The objects of every object layer that shows at this tier and these conditions. */
export function placedObjects(
  json: TiledMapJson,
  tier: number,
  holds: ReadonlySet<string> = NO_CONDITIONS,
): PlacedObject[] {
  const size = json.tilewidth;
  const out: PlacedObject[] = [];
  for (const layer of layersAtTier(json, tier, holds)) {
    if (layer.type !== "objectgroup") continue;
    for (const o of layer.objects ?? []) {
      out.push({
        cls: clsOf(o),
        name: o.name,
        x: Math.floor(o.x / size),
        y: Math.floor(o.y / size),
        w: Math.max(1, Math.round((o.width ?? size) / size)),
        h: Math.max(1, Math.round((o.height ?? size) / size)),
        layer: layer.name,
        properties: Object.fromEntries(
          (o.properties ?? []).map((p) => [p.name, p.value]),
        ),
        raw: o,
      });
    }
  }
  return out;
}

/** Colour of each object class on the canvas (placeholder look). */
export const CLASS_COLOURS: Record<string, string> = {
  entry: "#3ddc84",
  exit: "#ff5c5c",
  service: "#ffd23f",
  forage: "#c07cff",
  tree: "#2e9e44",
  stump: "#8a5a2b",
  rock: "#9aa0a6",
  log: "#b5651d",
  weed: "#8fd16a",
  twig: "#d2b48c",
  water: "#4aa3ff",
  region: "#ffffff",
  gate: "#ff9f1c",
  mark: "#00e5ff",
  fixture: "#ff6fb5",
};

export function classColour(cls: string): string {
  return CLASS_COLOURS[cls] ?? "#cccccc";
}

/** The tile layer bases the page can toggle, in drawing order. */
export const TILE_LAYERS = [
  "ground",
  "objects",
  "above",
  "fixtures",
  "paths",
  "soil",
  "collision",
] as const;

/** Placeholder colour of a tile id on a layer. Water is blue, collision is red. */
export function tileColour(base: string, id: number): string {
  if (base === "collision") return "rgba(255,0,0,0.35)";
  if (base === "soil") return "rgba(120,80,30,0.55)";
  if (base === "paths") return "rgba(220,200,150,0.6)";
  if (base === "ground" && id === 4) return "#2a6fb5";
  const hue = (id * 47) % 360;
  const light = base === "ground" ? 32 : 55;
  return `hsl(${hue} 40% ${light}%)`;
}

/** The tile layers of the map that show at a tier and conditions, with a base name. */
export function drawableTileLayers(
  json: TiledMapJson,
  tier: number,
  holds: ReadonlySet<string>,
): { base: string; data: number[]; name: string }[] {
  return layersAtTier(json, tier, holds)
    .filter((l) => l.type === "tilelayer" && l.data)
    .map((l) => ({ base: layerBase(l.name), data: l.data!, name: l.name }));
}

/**
 * Find the place a problem line is about: a tile `x,y` in the text, else an
 * object named in quotes. Undefined when the line has no place.
 */
export function problemPlace(
  json: TiledMapJson,
  problem: string,
): { x: number; y: number } | undefined {
  const m = /(\d+),(\d+)/.exec(problem);
  if (m) return { x: Number(m[1]), y: Number(m[2]) };
  const q = /"([^"]+)"/.exec(problem);
  if (q) {
    const o = placedObjects(json, maxTierOf(json)).find((p) => p.name === q[1]);
    if (o) return { x: o.x, y: o.y };
  }
  return undefined;
}

/** The 30 by 17 tile view box of note 81 decision 5. */
export const VIEW_BOX = { w: 30, h: 17 } as const;

/** The view box centred on a tile and kept inside the map. */
export function viewBoxAt(
  json: TiledMapJson,
  cx: number,
  cy: number,
): { x: number; y: number; w: number; h: number } {
  const x = Math.min(
    Math.max(0, cx - Math.floor(VIEW_BOX.w / 2)),
    Math.max(0, json.width - VIEW_BOX.w),
  );
  const y = Math.min(
    Math.max(0, cy - Math.floor(VIEW_BOX.h / 2)),
    Math.max(0, json.height - VIEW_BOX.h),
  );
  return { x, y, ...VIEW_BOX };
}
