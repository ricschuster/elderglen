import Phaser from "phaser";
import { makeArt, SIZE } from "./art";

/**
 * Names shared with the map. The pictures themselves are drawn in `art.ts`.
 * The tile order must match the tileset in the map JSON (`src/content/maps/`).
 */
export const TILES_KEY = "placeholder-tiles";
/** Must match the tileset name inside the map file. */
export const TILESET_NAME = "placeholder";
export const PLAYER_KEY = "player";
export const TILE = SIZE;

export function makePlaceholderTextures(scene: Phaser.Scene): void {
  makeArt(scene, TILES_KEY, PLAYER_KEY);
}
