import Phaser from "phaser";
import type { Season } from "../core/calendar";
import type { TiledLayer, TiledMapJson } from "../core/map";
import { DEPTH } from "./depth";

/**
 * The painted map (note 99). The map files hold twelve placeholder tile ids. Instead of
 * stamping one picture per id, each visible tile layer is painted once onto a canvas by
 * passes that can look at a cell's neighbours, the layers under it, the season and the
 * kind of place, so grass can fringe a path and a block of wall can become a house front.
 */

/** The tile ids of the placeholder tileset in the map files. */
export const TILE = {
  grass: 1,
  flowers: 2,
  path: 3,
  water: 4,
  earth: 5,
  tree: 6,
  wall: 7,
  roof: 8,
  door: 9,
  bed: 10,
  scroll: 11,
  bin: 12,
} as const;

export interface MapArtOptions {
  mapId: string;
  json: TiledMapJson;
  /** The visible tile layers at this tier, in draw order. */
  layers: readonly TiledLayer[];
  /** Under the sky: the farm, the valley areas and the village. False in interiors, caves and the mines. */
  outdoors: boolean;
  /** The mine floor number, on a mine floor. */
  floor?: number;
  season: Season;
}

/** What a pass sees while it paints one layer. */
export interface MapArtEnv extends MapArtOptions {
  scene: Phaser.Scene;
  /** Map size in tiles. */
  width: number;
  height: number;
  /** Tile size in pixels (16). */
  ts: number;
  /** The layer being painted, and its index in `layers`. */
  layer: TiledLayer;
  index: number;
  /** The layer's canvas. It is in map pixels: draw a cell at (x * ts, y * ts). */
  ctx: CanvasRenderingContext2D;
  /** The tile id at a cell of this layer (or of `layer`), 0 if empty or off the map. */
  tile(x: number, y: number, layer?: TiledLayer): number;
  /** The topmost tile id at a cell on the layers under this one, 0 if none. */
  under(x: number, y: number): number;
  /** A stable number from 0 to 1 for a cell, the same on every run. */
  rand(x: number, y: number, salt?: number): number;
  /**
   * Add a game object that belongs to this layer: a tall, depth sorted prop (set its
   * depth with `sortDepth`), a canopy over the figures (`DEPTH.above`) or moving water.
   * It shows and hides with the layer.
   */
  add<T extends Phaser.GameObjects.GameObject>(object: T): T;
}

/** A painter of some of the tile ids. Passes run in order on the same canvas. */
export interface MapArtPass {
  paint(env: MapArtEnv): void;
}

/** One painted layer: its canvas image and whatever the passes added. */
export interface MapLayerArt {
  layer: TiledLayer;
  objects: Phaser.GameObjects.GameObject[];
  setVisible(visible: boolean): void;
}

const hash = (x: number, y: number, salt: number): number => {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
};

/** Canvas textures made for the last map drawn, removed when the next is drawn. */
let stale: string[] = [];
let serial = 0;

/**
 * A canvas texture that lives as long as this map is on screen. For art that is the same
 * on every map (a tree picture used a hundred times), make an ordinary texture once
 * under a fixed key instead.
 */
export function mapCanvas(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.Textures.CanvasTexture {
  const key = `mapart-${serial++}`;
  stale.push(key);
  return scene.textures.createCanvas(key, width, height)!;
}

/** Paint every visible tile layer of a map. The caller adds the objects to its world. */
export function drawMapArt(
  scene: Phaser.Scene,
  options: MapArtOptions,
  passes: readonly MapArtPass[],
): MapLayerArt[] {
  for (const key of stale)
    if (scene.textures.exists(key)) scene.textures.remove(key);
  stale = [];
  const { json, layers } = options;
  const { width, height } = json;
  const ts = json.tilewidth;
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height;
  return layers.map((layer, index) => {
    const data = layer.data ?? [];
    // The canvas covers only the cells the layer uses, with room around them for a
    // fringe or an eave that spills into the next cell.
    let x0 = width;
    let y0 = height;
    let x1 = -1;
    let y1 = -1;
    for (let i = 0; i < data.length; i++) {
      if (!data[i]) continue;
      const x = i % width;
      const y = Math.floor(i / width);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const objects: Phaser.GameObjects.GameObject[] = [];
    const art: MapLayerArt = {
      layer,
      objects,
      setVisible(visible) {
        for (const o of objects)
          (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(
            visible,
          );
      },
    };
    if (x1 < 0) return art;
    const MARGIN = 3;
    x0 = Math.max(0, x0 - MARGIN);
    y0 = Math.max(0, y0 - MARGIN);
    x1 = Math.min(width - 1, x1 + MARGIN);
    y1 = Math.min(height - 1, y1 + MARGIN);
    const texture = mapCanvas(scene, (x1 - x0 + 1) * ts, (y1 - y0 + 1) * ts);
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(-x0 * ts, -y0 * ts);
    const env: MapArtEnv = {
      ...options,
      scene,
      width,
      height,
      ts,
      layer,
      index,
      ctx,
      tile: (x, y, of = layer) =>
        inside(x, y) ? (of.data?.[y * width + x] ?? 0) : 0,
      under: (x, y) => {
        if (!inside(x, y)) return 0;
        for (let i = index - 1; i >= 0; i--) {
          const id = layers[i]?.data?.[y * width + x];
          if (id) return id;
        }
        return 0;
      },
      rand: (x, y, salt = 0) => hash(x, y, salt),
      add: (object) => {
        objects.push(object);
        return object;
      },
    };
    for (const pass of passes) pass.paint(env);
    texture.refresh();
    objects.unshift(
      scene.add
        .image(x0 * ts, y0 * ts, texture)
        .setOrigin(0)
        .setDepth(DEPTH.map + index * 0.01),
    );
    return art;
  });
}

/**
 * Stamp the old one picture tile, for a pass that has not painted an id yet. `tiles` is
 * the placeholder tileset texture key.
 */
export function stampPlaceholder(
  env: MapArtEnv,
  tiles: string,
  ids: readonly number[],
): void {
  const source = env.scene.textures.get(tiles).getSourceImage() as
    HTMLCanvasElement | HTMLImageElement;
  const { ts } = env;
  for (let y = 0; y < env.height; y++)
    for (let x = 0; x < env.width; x++) {
      const id = env.tile(x, y);
      if (!ids.includes(id)) continue;
      env.ctx.drawImage(
        source,
        (id - 1) * ts,
        0,
        ts,
        ts,
        x * ts,
        y * ts,
        ts,
        ts,
      );
    }
}
