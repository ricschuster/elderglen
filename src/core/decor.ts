import decorData from "../content/decor.json";
import roomData from "../content/house-rooms.json";
import type { Outcome } from "./actions";
import { isHouseMap } from "./house";
import {
  GROUND_LAYER,
  layerBase,
  layersAtTier,
  type TiledMapJson,
} from "./map";
import type { GameState } from "./save";

/**
 * Wallpaper and flooring (`docs/design/10_customisation.md`, note 41): items
 * bought at the carpenter's, each covering a whole room, as Stardew's do. Use
 * on a tile of a built room to cover it; the old covering is replaced. Pure
 * rules. Content is `src/content/decor.json` and `house-rooms.json`.
 */
export interface DecorDef {
  id: string;
  name: string;
  kind: "wallpaper" | "floor";
  /** The carpenter's price, a placeholder (Stardew's is 200g). */
  price: number;
  /** Placeholder colour as `#rrggbb`. */
  color: string;
}

export interface RoomDef {
  id: string;
  name: string;
  /** The house tier that builds the room. */
  tier: number;
  /** Outer rectangle in tiles, walls included, at the widest tier. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DECOR = decorData as DecorDef[];
export const ROOMS = roomData as RoomDef[];

/** Ground tile ids of the placeholder tileset that mean a wall and a floor. */
export const FLOOR_TILE = 3;
export const WALL_TILE = 7;

export const decorById = (id: string | undefined): DecorDef | undefined =>
  DECOR.find((d) => d.id === id);

export const roomById = (id: string | undefined): RoomDef | undefined =>
  ROOMS.find((r) => r.id === id);

/** The room whose rectangle holds the tile and that the house has built, if any. */
export function roomAt(
  houseTier: number,
  x: number,
  y: number,
): RoomDef | undefined {
  return ROOMS.find(
    (r) =>
      r.tier <= houseTier &&
      x >= r.x &&
      x < r.x + r.w &&
      y >= r.y &&
      y < r.y + r.h,
  );
}

export interface RoomCovering {
  wallpaper?: string;
  floor?: string;
}
export type DecorSave = Record<string, RoomCovering>;

/** What covers each room. A room with nothing keeps the bare tiles. */
export class Decor {
  private rooms = new Map<string, RoomCovering>();

  get(room: string): RoomCovering {
    return this.rooms.get(room) ?? {};
  }

  set(room: string, def: DecorDef): void {
    const cover = { ...this.get(room) };
    cover[def.kind === "floor" ? "floor" : "wallpaper"] = def.id;
    this.rooms.set(room, cover);
  }

  save(): DecorSave {
    const out: DecorSave = {};
    for (const [room, c] of this.rooms) out[room] = { ...c };
    return out;
  }

  /** Old saves have no field; unknown rooms and items are dropped. */
  load(raw: unknown): void {
    this.rooms.clear();
    if (typeof raw !== "object" || raw === null) return;
    for (const [room, c] of Object.entries(raw)) {
      if (!roomById(room) || typeof c !== "object" || c === null) continue;
      const cover = c as RoomCovering;
      const wallpaper = decorById(cover.wallpaper);
      const floor = decorById(cover.floor);
      if (wallpaper?.kind === "wallpaper") this.set(room, wallpaper);
      if (floor?.kind === "floor") this.set(room, floor);
    }
  }
}

/** Tiles of a room that a floor and a wallpaper cover, read from the map's ground at a tier. */
export function roomTiles(
  json: TiledMapJson,
  tier: number,
  room: RoomDef,
): { floor: { x: number; y: number }[]; wall: { x: number; y: number }[] } {
  const ids = new Array<number>(json.width * json.height).fill(0);
  for (const layer of layersAtTier(json, tier))
    if (layerBase(layer.name) === GROUND_LAYER && layer.data)
      layer.data.forEach((id, i) => {
        if (id !== 0) ids[i] = id;
      });
  const floor: { x: number; y: number }[] = [];
  const wall: { x: number; y: number }[] = [];
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++) {
      const id = ids[y * json.width + x];
      if (id === FLOOR_TILE) floor.push({ x, y });
      else if (id === WALL_TILE) wall.push({ x, y });
    }
  return { floor, wall };
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** Cover the room holding the faced tile with the held wallpaper or flooring. The item is used up. */
export function applyDecor(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
  id: string,
): Outcome {
  if (!isHouseMap(mapId)) return fail("decor needs the house");
  const def = decorById(id);
  if (!def) return fail("not wallpaper or flooring");
  if (g.inventory.count(id) < 1) return fail("none to use");
  const room = roomAt(g.houseTier, x, y);
  if (!room) return fail("not in a room");
  if (g.decor.get(room.id)[def.kind === "floor" ? "floor" : "wallpaper"] === id)
    return fail("already covered with that");
  g.inventory.remove(id);
  g.decor.set(room.id, def);
  return { ok: true };
}

/** Why a covering cannot be bought, or undefined if it can. */
export function decorProblem(g: GameState, id: string): string | undefined {
  const def = decorById(id);
  if (!def) return "The carpenter does not sell that.";
  if (g.money < def.price) return `You need ${def.price - g.money}g more.`;
  if (g.inventory.room(id) < 1) return "Your pack is full.";
  return undefined;
}

/** Buy one wallpaper or flooring into the backpack. */
export function buyDecor(g: GameState, id: string): boolean {
  if (decorProblem(g, id) !== undefined) return false;
  g.money -= decorById(id)!.price;
  return g.inventory.add(id);
}
