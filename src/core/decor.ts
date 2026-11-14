import decorData from "../content/decor.json";
import roomData from "../content/house-rooms.json";
import type { Outcome } from "./actions";
import { houseHolds, houseSpouse, isHouseMap } from "./house";
import {
  GROUND_LAYER,
  NO_CONDITIONS,
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

/** A rectangle in tiles, walls included. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A decoration zone (note 85, "Decoration zones"): a room that takes one
 * wallpaper and one flooring. Renovation rooms are zones too, shown only under
 * their house conditions.
 */
export interface RoomDef extends Rect {
  id: string;
  name: string;
  /** The house tier that builds the room. */
  tier: number;
  /** House conditions the main rectangle needs (`spouse`, `reno-<id>`). None means always. */
  when?: string[];
  /** Further rectangles of the zone, each under its own conditions (the expanded corner room). */
  wings?: (Rect & { when?: string[] })[];
  /** While the condition holds this zone shares its covering with another (open rooms). */
  joins?: { when: string; with: string }[];
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

const holdsAll = (need: string[] | undefined, holds: ReadonlySet<string>) =>
  (need ?? []).every((h) => holds.has(h));

/** The rectangles of a zone that exist at a house tier under the house's conditions. */
export function zoneRects(
  room: RoomDef,
  houseTier: number,
  holds: ReadonlySet<string> = NO_CONDITIONS,
): Rect[] {
  if (room.tier > houseTier) return [];
  const rects: Rect[] = holdsAll(room.when, holds) ? [room] : [];
  for (const w of room.wings ?? []) if (holdsAll(w.when, holds)) rects.push(w);
  return rects;
}

/** The house conditions a game gives its zones: the spouse and the renovations built. */
export function zoneHolds(
  g: Pick<GameState, "houseTier" | "houseRenos" | "flags">,
): Set<string> {
  return new Set(houseHolds(g.houseTier, houseSpouse(g), g.houseRenos));
}

const inRect = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** The zone whose rectangle holds the tile and that the house has built, if any. */
export function roomAt(
  houseTier: number,
  x: number,
  y: number,
  holds: ReadonlySet<string> = NO_CONDITIONS,
): RoomDef | undefined {
  return ROOMS.find((r) =>
    zoneRects(r, houseTier, holds).some((rc) => inRect(rc, x, y)),
  );
}

/**
 * The zones that share a covering with this one under the conditions, itself
 * first: an open room joins its neighbour (open bedroom: main room and bedroom;
 * open dining room: kitchen and dining room).
 */
export function zoneGroup(
  id: string,
  holds: ReadonlySet<string> = NO_CONDITIONS,
): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++)
    for (const r of ROOMS)
      for (const j of r.joins ?? []) {
        if (!holds.has(j.when)) continue;
        const other =
          r.id === out[i] ? j.with : j.with === out[i] ? r.id : undefined;
        if (other && !out.includes(other)) out.push(other);
      }
  return out;
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
  holds: ReadonlySet<string> = NO_CONDITIONS,
): { floor: { x: number; y: number }[]; wall: { x: number; y: number }[] } {
  const ids = new Array<number>(json.width * json.height).fill(0);
  for (const layer of layersAtTier(json, tier, holds))
    if (layerBase(layer.name) === GROUND_LAYER && layer.data)
      layer.data.forEach((id, i) => {
        if (id !== 0) ids[i] = id;
      });
  const floor: { x: number; y: number }[] = [];
  const wall: { x: number; y: number }[] = [];
  for (const r of zoneRects(room, tier, holds))
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
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
  const holds = zoneHolds(g);
  const room = roomAt(g.houseTier, x, y, holds);
  if (!room) return fail("not in a room");
  const slot = def.kind === "floor" ? "floor" : "wallpaper";
  const group = zoneGroup(room.id, holds);
  if (group.every((z) => g.decor.get(z)[slot] === id))
    return fail("already covered with that");
  g.inventory.remove(id);
  for (const z of group) g.decor.set(z, def);
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
