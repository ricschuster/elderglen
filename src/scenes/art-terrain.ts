import { TILE, stampPlaceholder, type MapArtPass } from "./mapart";
import { TILES_KEY } from "./placeholder-textures";

/**
 * The land: grass, flowers, paths, water, bare earth and the trees drawn in the map
 * (note 99). For now it stamps the old one picture tiles.
 */
export const terrainPass: MapArtPass = {
  paint(env) {
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
