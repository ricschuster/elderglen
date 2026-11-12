import type { Season } from "./calendar";
import cropData from "../content/crops.json";

export interface CropDef {
  id: string;
  name: string;
  seasons: Season[];
  /** Watered days from planting to first harvest. */
  growDays: number;
  /** If set, the crop keeps producing every this many watered days. */
  regrowDays?: number;
  seedPrice: number;
  sellPrice: number;
  /** Items per harvest, when more than one (the cranberry gives 2). */
  yield?: number;
  /** Energy restored when eaten. */
  energy?: number;
  /**
   * Fruit goes to jam and wine, a vegetable to pickles and juice. Crops default
   * to vegetable. `none` is neither (wheat and hops: the keg makes beer and pale
   * ale from them, note 92).
   */
  produce?: "fruit" | "vegetable" | "none";
  /** A rare crop is not on sale, not in a mixed seed, not shipped for the total and not asked for (the ember berry, note 39). */
  rare?: boolean;
  /** The seed's own name, when it is not "<name> seeds" (the Emberseed). */
  seedName?: string;
}

/** Every crop, rare ones included. Use `CROPS` for the ordinary ones. */
export const ALL_CROPS = cropData as CropDef[];
export const CROPS = ALL_CROPS.filter((c) => !c.rare);

export function cropById(id: string): CropDef | undefined {
  return ALL_CROPS.find((c) => c.id === id);
}
