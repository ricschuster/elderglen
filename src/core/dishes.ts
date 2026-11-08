import dishData from "../content/dishes.json";
import type { Ingredient, RecipeSource } from "./crafting";

/**
 * Cooked dishes (`docs/design/24_processing_and_cooking.md`). A dish is data in
 * `src/content/dishes.json`: its ingredients, energy restored, sell price and
 * how the recipe is learned. Names, numbers and the recipe list are
 * placeholders. Data only, so `items.ts` can register the dishes as items.
 */
export interface Dish {
  id: string;
  name: string;
  ingredients: Ingredient[];
  /** Energy restored when eaten. We have no health (note 24). */
  energy: number;
  sellPrice: number;
  /** Any one source is enough to know the recipe. */
  sources: RecipeSource[];
}

export const DISHES = dishData as Dish[];

export function dishById(id: string): Dish | undefined {
  return DISHES.find((d) => d.id === id);
}
