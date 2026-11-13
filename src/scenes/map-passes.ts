import { interiorsPass } from "./art-interiors";
import { structuresPass } from "./art-structures";
import { terrainPass } from "./art-terrain";
import type { MapArtPass } from "./mapart";

/**
 * The passes that paint a map, in order. Outdoors: the land, then what is built on it.
 * Indoors and underground the interiors pass paints everything.
 */
export const MAP_PASSES: readonly MapArtPass[] = [
  terrainPass,
  structuresPass,
  interiorsPass,
];
