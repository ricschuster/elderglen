// Homes in a game with several players (note 110): the host's farmhouse and each guest's cabin are the one
// `house` map, held once per owner under the instance id `house@<owner>` (the host's is plain `house`).
// This file reads a home's data, finds where a player wakes and checks a bed move. Free of Phaser and the DOM.
import { maps } from "../content/maps";
import {
  cabinOf,
  type Cabin,
  newCabinBook,
  type CabinBook,
  type CabinBuild,
} from "./cabins";
import { HOUSE_MAP, houseHolds, houseVisibleTier, validRenos } from "./house";
import { LOCAL_PLAYER, type PlayerId } from "./players";
import { bondOf } from "./playermarriage";
import type { GameState } from "./save";
import { tileKey } from "./tilekey";

/** The instance id of an owner's home: the host's is `house`, a guest's `house@<their id>`. */
export function homeMapId(owner: PlayerId): string {
  return owner === LOCAL_PLAYER ? HOUSE_MAP : `${HOUSE_MAP}@${owner}`;
}

/** Whose home an instance id is, or undefined for any other map (the old tiered ids count as the host's). */
export function homeOwnerOf(mapId: string): PlayerId | undefined {
  if (mapId === HOUSE_MAP || mapId.startsWith(`${HOUSE_MAP}-`))
    return LOCAL_PLAYER;
  if (mapId.startsWith(`${HOUSE_MAP}@`)) {
    const key = mapId.slice(HOUSE_MAP.length + 1);
    return key === "" ? undefined : key;
  }
  return undefined;
}

/** What a home holds that the house map shows and the carpenter changes. */
export interface HomeData {
  owner: PlayerId;
  tier: number;
  renos: string[];
  build: CabinBuild | undefined;
}

/** The data of the home an instance id names, or undefined if there is no such home (a guest without a cabin). */
export function homeData(g: GameState, mapId: string): HomeData | undefined {
  const owner = homeOwnerOf(mapId);
  if (owner === undefined) return undefined;
  if (owner === LOCAL_PLAYER)
    return {
      owner,
      tier: g.houseTier,
      renos: g.houseRenos,
      build: g.houseBuild,
    };
  const c = g.cabins ? cabinOf(g.cabins, owner) : undefined;
  return c && { owner, tier: c.tier, renos: c.renos, build: c.build };
}

/** The tier layers a home shows (a cabin's interior grows as the farmhouse does). */
export function homeVisibleTier(g: GameState, mapId: string): number {
  return houseVisibleTier(homeData(g, mapId)?.tier ?? g.houseTier);
}

/**
 * The conditions an instance's layers are shown under: the cellar and the renovations of its owner. A guest's
 * spouse room is not built (note 110, "As built"), so a cabin never holds `spouse`.
 */
export function homeHoldsOf(
  g: GameState,
  mapId: string,
  spouse: boolean,
): string[] {
  const d = homeData(g, mapId);
  if (!d) return [];
  return houseHolds(d.tier, d.owner === LOCAL_PLAYER && spouse, d.renos);
}

/** The owner whose home a player lives in: the proposer's for a married pair (note 53, owner 2026-11-18). */
export function homeOwnerFor(g: GameState, key: PlayerId): PlayerId {
  const bond = bondOf(g.playerMarriage, key);
  return bond?.stage === "married" ? bond.proposer : key;
}

/** The instance id of the home a player lives in, or undefined when they have no cabin. */
export function ownHomeMap(g: GameState, key: PlayerId): string | undefined {
  const owner = homeOwnerFor(g, key);
  if (owner === LOCAL_PLAYER) return HOUSE_MAP;
  return g.cabins && cabinOf(g.cabins, owner) ? homeMapId(owner) : undefined;
}

/** The cabin a home instance is, if it is a guest's. */
export function cabinOfHome(g: GameState, mapId: string): Cabin | undefined {
  const owner = homeOwnerOf(mapId);
  return owner === undefined || owner === LOCAL_PLAYER || !g.cabins
    ? undefined
    : cabinOf(g.cabins, owner);
}

/** The house map's bed tile at a tier when the owner has not moved it (the bed service the tier shows). */
export function defaultBed(tier: number): { x: number; y: number } {
  const t = houseVisibleTier(tier);
  return t >= 1 ? { x: 46, y: 24 } : { x: 40, y: 31 };
}

/** Where an owner's bed stands in their home: the moved tile, else the default for their tier. */
export function bedOf(g: GameState, owner: PlayerId): { x: number; y: number } {
  const moved = g.cabins?.beds?.[owner];
  if (moved) return { ...moved };
  const d = homeData(g, homeMapId(owner));
  return defaultBed(d?.tier ?? 0);
}

/** Where a player wakes after sleeping in a home: that home owner's bed tile (note 110 rule 1). */
export function wakeSpot(
  g: GameState,
  mapId: string,
): { map: string; x: number; y: number } | undefined {
  const d = homeData(g, mapId);
  if (!d) return undefined;
  return { map: homeMapId(d.owner), ...bedOf(g, d.owner) };
}

/** Where a player wakes after passing out: their own home (note 110 rule 1). Undefined without one. */
export function ownWakeSpot(
  g: GameState,
  key: PlayerId,
): { map: string; x: number; y: number } | undefined {
  const map = ownHomeMap(g, key);
  return map ? wakeSpot(g, map) : undefined;
}

/**
 * Why a bed cannot be put on a tile of a home, or undefined if it can. Only the owner moves it (note 110, note
 * 85, Stardew checked); the tile must be floor in the owner's rooms at their tier, free of furniture and chests.
 */
export function bedMoveProblem(
  g: GameState,
  by: PlayerId,
  mapId: string,
  x: number,
  y: number,
): string | undefined {
  const d = homeData(g, mapId);
  if (!d) return "There is no home here.";
  if (homeOwnerFor(g, by) !== d.owner && d.owner !== by)
    return "Only the one who lives here can move their bed.";
  const holds = new Set(houseHolds(d.tier, false, validRenos(d.tier, d.renos)));
  const map = maps.getWith(HOUSE_MAP, holds, houseVisibleTier(d.tier));
  if (map.isBlocked(x, y) || map.serviceAt(x, y) || map.exitAt(x, y))
    return "The bed will not go there.";
  const key = tileKey(x, y);
  const taken =
    [...g.furniture.each(mapId)].some((f) => tileKey(f.x, f.y) === key) ||
    [...g.chests.each(mapId)].some((c) => tileKey(c.x, c.y) === key);
  return taken ? "Something is in the way." : undefined;
}

/** Put an owner's bed on a tile. The caller has checked `bedMoveProblem`. */
export function moveBed(
  book: CabinBook,
  owner: PlayerId,
  x: number,
  y: number,
): CabinBook {
  return { ...book, beds: { ...book.beds, [owner]: { x, y } } };
}

/** A spot on a home map as the tile a player stands on, and the pixels the scene stands them at. */
export interface HomeSpot {
  map: string;
  /** The tile. */
  x: number;
  y: number;
  /** The scene's pixels for a player standing there (`(x + 0.5) * ts`, `(y + 1) * ts - 2`). */
  px: number;
  py: number;
}

/** A wake spot with its pixels, for the host to move a player's last known position. */
export function spotPixels(s: { map: string; x: number; y: number }): HomeSpot {
  const ts = maps.get(HOUSE_MAP).tileSize;
  return { ...s, px: (s.x + 0.5) * ts, py: (s.y + 1) * ts - 2 };
}

/**
 * Apply a `bed-move` intent: put the sender's bed on a tile of the home the intent names. Only in the home they
 * live in (note 110 rule 1). The host and a guest's copy both run it.
 */
export function applyBedMove(
  g: GameState,
  by: PlayerId,
  intent: { kind: string; [key: string]: unknown },
): string | undefined {
  const { map, x, y } = intent;
  if (typeof map !== "string" || !Number.isInteger(x) || !Number.isInteger(y))
    return "bad bed-move";
  const why = bedMoveProblem(g, by, map, x as number, y as number);
  if (why !== undefined) return why;
  const book = g.cabins ?? newCabinBook("multiplayer-start");
  g.cabins = moveBed(book, homeOwnerFor(g, by), x as number, y as number);
  return undefined;
}
