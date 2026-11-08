import {
  known as sourceKnown,
  sourceText,
  type RecipeSource,
} from "./crafting";
import { DISHES, dishById, type Dish } from "./dishes";
import { itemById } from "./items";
import type { GameState } from "./save";

/**
 * Cooking (`docs/design/24_processing_and_cooking.md`). The stove is in the
 * kitchen, which the first house upgrade adds (note 41). One cook turns the
 * ingredients in the pack into one dish. A dish is food, so eating it already
 * works. Pure rules.
 */

/** The house tier that adds the kitchen. */
export const KITCHEN_TIER = 1;

/** True once the house has its kitchen. */
export function kitchenOpen(g: GameState): boolean {
  return g.houseTier >= KITCHEN_TIER;
}

/** True when every ingredient of the dish is a real item. */
export function cookable(d: Dish): boolean {
  return [...d.ingredients, { item: d.id }].every((i) => itemById(i.item));
}

export function dishKnown(g: GameState, d: Dish): boolean {
  return sourceKnown(g, d as { sources: RecipeSource[] });
}

/** Dishes the player knows, in list order. */
export function knownDishes(g: GameState): Dish[] {
  return DISHES.filter((d) => cookable(d) && dishKnown(g, d));
}

/** Dishes the player has not learned yet, shown as silhouettes. */
export function lockedDishes(g: GameState): Dish[] {
  return DISHES.filter((d) => cookable(d) && !dishKnown(g, d));
}

export function dishSourceText(d: Dish): string {
  return sourceText(d);
}

export function canCook(g: GameState, d: Dish): boolean {
  return d.ingredients.every((i) => g.inventory.count(i.item) >= i.count);
}

/** Cook one dish from the pack. Returns undefined on success, otherwise why not. */
export function cook(g: GameState, id: string): string | undefined {
  const d = dishById(id);
  if (!d || !cookable(d)) return "no such recipe";
  if (!kitchenOpen(g)) return "no kitchen";
  if (!dishKnown(g, d)) return "recipe not known";
  if (!canCook(g, d)) return "missing ingredients";
  // The ingredients leave first, so a stack they empty can hold the dish.
  const before = g.inventory.save();
  for (const i of d.ingredients) g.inventory.remove(i.item, i.count);
  if (!g.inventory.add(d.id)) {
    g.inventory.load(before);
    return "backpack full";
  }
  g.achievements.noteCooked(d.id);
  return undefined;
}

/** Words for an ingredient list, such as "2 egg, 1 milk". */
export function dishIngredientText(d: Dish): string {
  return d.ingredients
    .map((i) => `${i.count} ${itemById(i.item)?.name.toLowerCase() ?? i.item}`)
    .join(", ");
}
