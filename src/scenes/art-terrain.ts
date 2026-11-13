import { TILE, stampPlaceholder, type MapArtPass } from "./mapart";
import { TILES_KEY } from "./placeholder-textures";

/**
 * The land under the sky: grass, flowers, paths, water, bare earth and the trees drawn
 * in the map (note 99). It paints only outdoor maps. For now it stamps the old one
 * picture tiles.
 */
export const terrainPass: MapArtPass = {
  paint(env) {
    if (!env.outdoors) return;
    stampPlaceholder(env, TILES_KEY, [
      TILE.grass,
      TILE.flowers,
      TILE.path,
      TILE.water,
      TILE.earth,
      TILE.tree,
    ]);
  },
};
