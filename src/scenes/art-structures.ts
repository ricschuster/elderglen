import { TILE, stampPlaceholder, type MapArtPass } from "./mapart";
import { TILES_KEY } from "./placeholder-textures";

/**
 * What is built: walls, roofs, doors and the fixtures inside (note 99). For now it stamps
 * the old one picture tiles.
 */
export const structuresPass: MapArtPass = {
  paint(env) {
    stampPlaceholder(env, TILES_KEY, [
      TILE.wall,
      TILE.roof,
      TILE.door,
      TILE.bed,
      TILE.scroll,
      TILE.bin,
    ]);
  },
};
