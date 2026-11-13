import { stampPlaceholder, type MapArtPass } from "./mapart";
import { TILES_KEY } from "./placeholder-textures";

/**
 * Indoors and underground: rooms, floors, wall faces, doors, fixtures, caves and the
 * mines (note 99). It paints every tile id on maps that are not under the sky.
 * For now it stamps the old one picture tiles.
 */
export const interiorsPass: MapArtPass = {
  paint(env) {
    if (env.outdoors) return;
    stampPlaceholder(env, TILES_KEY, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  },
};
