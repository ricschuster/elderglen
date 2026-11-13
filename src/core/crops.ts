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
   * ale from them, note 92). `flower` goes to bees and the dye vat only (note 91).
   */
  produce?: "fruit" | "vegetable" | "none" | "flower";
  /** A rare crop is not on sale, not in a mixed seed, not shipped for the total and not asked for (the ember berry, note 39). */
  rare?: boolean;
  /** The seed's own name, when it is not "<name> seeds" (the Emberseed). */
  seedName?: string;
}

/** Every crop, rare ones included. Use `CROPS` for the ordinary ones. */
export const ALL_CROPS = cropData as CropDef[];
export const CROPS = ALL_CROPS.filter((c) => !c.rare);

/** The flower crops (note 91): tulip, cornflower, poppy, zinnia, sunflower, dahlia. */
export const FLOWER_CROPS = CROPS.filter((c) => c.produce === "flower");

/** True for one of the six flower crops. */
export const isFlowerCrop = (id: string): boolean =>
  FLOWER_CROPS.some((c) => c.id === id);

export function cropById(id: string): CropDef | undefined {
  return ALL_CROPS.find((c) => c.id === id);
}
