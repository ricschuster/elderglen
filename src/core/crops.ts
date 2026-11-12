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
  /** Fruit goes to jam and wine, a vegetable to pickles and juice, a flower to bees and the dye vat only (note 91). Crops default to vegetable. */
  produce?: "fruit" | "vegetable" | "flower";
}

export const CROPS = cropData as CropDef[];

/** The flower crops (note 91): tulip, cornflower, poppy, zinnia, sunflower, dahlia. */
export const FLOWER_CROPS = CROPS.filter((c) => c.produce === "flower");

/** True for one of the six flower crops. */
export const isFlowerCrop = (id: string): boolean =>
  FLOWER_CROPS.some((c) => c.id === id);

export function cropById(id: string): CropDef | undefined {
  return CROPS.find((c) => c.id === id);
}
