import { structuresPass } from "./art-structures";
import { terrainPass } from "./art-terrain";
import type { MapArtPass } from "./mapart";

/** The passes that paint a map, in order: the land, then what is built on it. */
export const MAP_PASSES: readonly MapArtPass[] = [terrainPass, structuresPass];
