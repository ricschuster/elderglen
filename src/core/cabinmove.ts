// Moving and demolishing a cabin from the carpenter's building screen (note 110, owner 2026-11-25). Anyone moves
// any cabin, free and at once, the way any building is moved; only the host demolishes one. Free of Phaser and
// the DOM.
import {
  cabinDoorTile,
  cabinMailboxTile,
  cabinRect,
  demolishCabin,
  moveCabin,
} from "./cabins";
import { farmMapOf, farmTypeById } from "./farmtypes";
import { homeMapId } from "./homes";
import { evictToLostFound } from "./lostfound";
import type { FarmMap } from "./map";
import type { Intent } from "./protocol";
import {
  buildingRects,
  clutterAt,
  reservedTiles,
  type Blocker,
} from "./placement";
import { pondRects } from "./pondsite";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type { GameState } from "./save";
import { tileKey } from "./tilekey";

const inRect = (
  r: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/**
 * Every tile that stops cabin `id` standing with its top left on (x, y), each with a reason. Empty means the spot
 * is free. The tile in front of the door and the mailbox tile count too. The cabin's own old spot is ignored.
 */
export function cabinBlockers(
  g: GameState,
  map: FarmMap,
  mapId: string,
  id: number,
  x: number,
  y: number,
): Blocker[] {
  const site = { x, y };
  const foot = cabinRect(site);
  const reserved = reservedTiles(map);
  const rects = buildingRects(g, mapId);
  const ponds = pondRects(g, mapId);
  const others = (g.cabins?.cabins ?? []).filter((c) => c.id !== id);
  const reason = (tx: number, ty: number): string | undefined => {
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height)
      return "the edge of the farm";
    if (map.isBlocked(tx, ty)) return "water, a cliff or a wall";
    const near = reserved.get(tileKey(tx, ty));
    if (near) return `too close to ${near}`;
    if (rects.some((r) => inRect(r, tx, ty))) return "a farm building";
    if (ponds.some((r) => inRect(r, tx, ty))) return "a fish pond";
    for (const c of others) {
      if (inRect(cabinRect(c), tx, ty)) return "another cabin";
      const m = cabinMailboxTile(c);
      const d = cabinDoorTile(c);
      if ((tx === m.x && ty === m.y) || (tx === d.x && ty === d.y + 1))
        return "another cabin's door or mailbox";
    }
    if (g.chests.at(mapId, tx, ty)) return "a chest";
    return clutterAt(g, tx, ty);
  };
  const out: Blocker[] = [];
  const check = (tx: number, ty: number) => {
    const why = reason(tx, ty);
    if (why) out.push({ x: tx, y: ty, why });
  };
  for (let ty = foot.y; ty < foot.y + foot.h; ty++)
    for (let tx = foot.x; tx < foot.x + foot.w; tx++) check(tx, ty);
  const door = cabinDoorTile(site);
  check(door.x, door.y + 1);
  const m = cabinMailboxTile(site);
  check(m.x, m.y);
  return out;
}

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;

/** Move a cabin. Any player may; the contents and the home instance stay with the cabin's owner. */
export function applyCabinMove(
  g: GameState,
  intent: Intent,
): string | undefined {
  const { id, x, y } = intent;
  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    !isTile(x) ||
    !isTile(y)
  )
    return "bad carp-cabin-move";
  if (!g.cabins) return "There is no such cabin.";
  const site = { x, y };
  const r = moveCabin(g.cabins, id, site);
  if (!r.ok) return r.reason;
  const first = cabinBlockers(
    g,
    farmMapOf(g),
    farmTypeById(g.farmType).map,
    id,
    x,
    y,
  )[0];
  if (first) return `It will not go there: ${first.why}.`;
  g.cabins = r.book;
  return undefined;
}

/** The sentence that names who loses a cabin, for the confirm step. */
export function demolishLine(name: string | undefined): string {
  return name === undefined
    ? "Press Demolish again to take down this empty cabin."
    : `${name} lives here. Their things except tools go to the lost and found at the village hall. Press Demolish again to take it down.`;
}

/**
 * The host demolishes a cabin, occupied or not. The occupant's things except tools go to the lost and found box;
 * they have no cabin until they rejoin (a free one, or the game's rule for a guest without one).
 */
export function applyCabinDemolish(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined {
  if (by !== LOCAL_PLAYER) return "Only the host can demolish a cabin.";
  const id = intent.id;
  if (typeof id !== "number" || !Number.isInteger(id))
    return "bad carp-cabin-demolish";
  if (!g.cabins) return "There is no such cabin.";
  const r = demolishCabin(g.cabins, id);
  if (!r) return "There is no such cabin.";
  g.cabins = r.book;
  if (r.evictedKey !== null)
    evictToLostFound(g, r.evictedKey, homeMapId(r.evictedKey));
  return undefined;
}
