import { TILE, stampPlaceholder, type MapArtPass } from "./mapart";
import { TILES_KEY } from "./placeholder-textures";

/**
 * What is built under the sky: house fronts, roofs, doors, stone walls, cliffs, bridges
 * and the bin (note 99). It paints only outdoor maps; `art-interiors.ts` paints the rest.
 * For now it stamps the old one picture tiles.
 */
export const structuresPass: MapArtPass = {
  paint(env) {
    if (!env.outdoors) return;
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
