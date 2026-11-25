// Furniture and decor in any house (note 110, owner 2026-11-25): any player may stand a piece or paper a room in
// the farmhouse or any cabin they are standing in, not only their own, and whoever lifts a piece gets it in their
// own pack (a placed piece keeps no owner). The rules are the host's own (`placeFurniture`, `applyDecor`,
// `pickUpFurniture`), run as the sender on the home the intent names. Free of Phaser and the DOM.
import { maps } from "../content/maps";
import type { Outcome } from "./actions";
import { asPlayer } from "./asplayer";
import { chestById, pickUpChest, placeChest } from "./chests";
import { applyDecor, decorById } from "./decor";
import { furnitureById, pickUpFurniture, placeFurniture } from "./furniture";
import {
  HOUSE_MAP,
  houseHolds,
  houseSpouse,
  houseVisibleTier,
  isHouseMap,
} from "./house";
import { isLight, lightAt, pickUpLight, placeLight } from "./lights";
import type { FarmMap } from "./map";
import type { Intent } from "./protocol";
import { homeData } from "./homes";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import type { GameState } from "./save";

/** The intent kinds this file serves. */
export const HOME_PLACE_KINDS = new Set(["home-place", "home-pickup"]);

const isTile = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 4096;

/** The walkable map of a home as its owner has it built (their tier and renovations), or undefined if there is no such home. */
export function homeMapOf(g: GameState, mapId: string): FarmMap | undefined {
  const d = homeData(g, mapId);
  if (!d) return undefined;
  const holds = new Set(
    houseHolds(d.tier, d.owner === LOCAL_PLAYER && houseSpouse(g), d.renos),
  );
  return maps.getWith(HOUSE_MAP, holds, houseVisibleTier(d.tier));
}

const outcome = (o: Outcome): string | undefined =>
  o.ok ? undefined : o.reason;

/**
 * Apply `home-place {map, x, y, item}` (a furniture piece, chest, light, or a wallpaper or flooring from the sender's pack) or
 * `home-pickup {map, x, y}` (a piece into the sender's pack). `null` when the kind is not one of these.
 */
export function applyHomePlace(
  g: GameState,
  by: PlayerId,
  intent: Intent,
): string | undefined | null {
  if (!HOME_PLACE_KINDS.has(intent.kind)) return null;
  const { map: mapId, x, y, item } = intent;
  if (typeof mapId !== "string" || mapId.length > 80 || !isHouseMap(mapId))
    return "There is no home here.";
  if (!isTile(x) || !isTile(y)) return `bad ${intent.kind}`;
  const map = homeMapOf(g, mapId);
  if (!map) return "There is no home here.";
  if (intent.kind === "home-pickup")
    return asPlayer(g, by, () => {
      // A light, then a chest (the host's rule: empty only), then a furniture piece.
      if (isLight(lightAt(g, mapId, x, y)?.id))
        return outcome(pickUpLight(g, mapId, x, y));
      if (g.chests.at(mapId, x, y)) return outcome(pickUpChest(g, mapId, x, y));
      return outcome(pickUpFurniture(g, mapId, x, y));
    });
  if (typeof item !== "string") return "bad home-place";
  return asPlayer(g, by, () => {
    if (decorById(item)) return outcome(applyDecor(g, mapId, x, y, item));
    if (isLight(item)) return outcome(placeLight(g, map, mapId, x, y, item));
    if (chestById(item)) return outcome(placeChest(g, map, mapId, x, y, item));
    if (furnitureById(item))
      return outcome(placeFurniture(g, map, mapId, x, y, item));
    return "That cannot be placed.";
  });
}
