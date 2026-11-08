import recipeData from "../content/recipes.json";
import { BUNDLES } from "./bundles";
import { itemById } from "./items";
import { orderById } from "./orders";
import type { Skill } from "./skills";
import type { PlacedChest } from "./chests";
import type { GameState } from "./save";

/**
 * Crafting (`docs/design/34_crafting.md`). Recipes are data in
 * `src/content/recipes.json`. A recipe is known when its source is met; build
 * 7 adds the other sources (shop, gifts, bundles), the workbench and chests (`craft` takes the chests beside a bench).
 * A recipe whose ingredient item does not exist yet is not offered, so the
 * list can name items before they are built. Pure rules.
 */
export interface Ingredient {
  item: string;
  count: number;
}

export type RecipeSource =
  | { kind: "start" }
  | { kind: "level"; skill: Skill; level: number }
  /** Known once the hall bundle is finished (note 34: a bundle gives its machine and recipe together). */
  | { kind: "bundle"; bundle: string }
  /** Known once a Special Order has been filled at least once (note 65). */
  | { kind: "order"; order: string };

export interface Recipe {
  id: string;
  ingredients: Ingredient[];
  result: Ingredient;
  /** Any one source is enough to know the recipe. */
  sources: RecipeSource[];
}

export const RECIPES = recipeData as Recipe[];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** True when every item in the recipe exists in the game. */
export function buildable(r: Recipe): boolean {
  return [...r.ingredients, r.result].every((i) => itemById(i.item));
}

/** True when the player has met the recipe's source. */
export function known(g: GameState, r: Recipe): boolean {
  return r.sources.some((s) =>
    s.kind === "start"
      ? true
      : s.kind === "level"
        ? g.skills.level(s.skill) >= s.level
        : s.kind === "order"
          ? g.orders.timesDone(s.order) > 0
          : g.hall.complete(s.bundle),
  );
}

/** Words for how a locked recipe is learned, such as "Farming level 4 or the Woodland bundle". */
export function sourceText(r: Recipe): string {
  const parts = r.sources.flatMap((s) => {
    if (s.kind === "level") return [`${s.skill} level ${s.level}`];
    if (s.kind === "bundle") {
      const name = BUNDLES.find((b) => b.id === s.bundle)?.name;
      return name ? [`the ${name} bundle`] : [];
    }
    if (s.kind === "order") {
      const title = orderById(s.order)?.title;
      return title ? [`the ${title} order`] : [];
    }
    return [];
  });
  return parts.length === 0
    ? "Not known yet"
    : `Learned at ${parts.join(" or ")}`;
}

/** Recipes the player knows and the game can make, in list order. */
export function knownRecipes(g: GameState): Recipe[] {
  return RECIPES.filter((r) => buildable(r) && known(g, r));
}

/** Recipes the game can make but the player has not unlocked yet. */
export function lockedRecipes(g: GameState): Recipe[] {
  return RECIPES.filter((r) => buildable(r) && !known(g, r));
}

/** How many of an item the pack and the given chests hold together. */
export function haveCount(
  g: GameState,
  item: string,
  chests: PlacedChest[] = [],
): number {
  return (
    g.inventory.count(item) +
    chests.reduce((n, c) => n + c.items.count(item), 0)
  );
}

/** True when the pack and any chests beside the workbench hold every ingredient. */
export function canCraft(
  g: GameState,
  r: Recipe,
  chests: PlacedChest[] = [],
): boolean {
  return r.ingredients.every((i) => haveCount(g, i.item, chests) >= i.count);
}

/**
 * Craft one batch. Ingredients come from the pack first, then from the chests
 * beside a workbench. Returns undefined on success, otherwise why not.
 */
export function craft(
  g: GameState,
  id: string,
  chests: PlacedChest[] = [],
): string | undefined {
  const r = recipeById(id);
  if (!r || !buildable(r)) return "no such recipe";
  if (!known(g, r)) return "recipe not known";
  if (!canCraft(g, r, chests)) return "missing ingredients";
  // The ingredients leave first, so a stack they empty can hold the result.
  const before = g.inventory.save();
  const chestsBefore = chests.map((c) => c.items.save());
  for (const i of r.ingredients) {
    let left = i.count;
    const fromPack = Math.min(left, g.inventory.count(i.item));
    g.inventory.remove(i.item, fromPack);
    left -= fromPack;
    for (const c of chests) {
      const take = Math.min(left, c.items.count(i.item));
      if (take > 0) c.items.remove(i.item, take);
      left -= take;
    }
  }
  if (!g.inventory.add(r.result.item, r.result.count)) {
    g.inventory.load(before);
    chests.forEach((c, n) => c.items.load(chestsBefore[n]!));
    return "backpack full";
  }
  g.achievements.noteCrafted(r.id);
  return undefined;
}

/** Words for an ingredient list, such as "1 copper bar, 1 iron bar". */
export function ingredientText(r: Recipe): string {
  return r.ingredients
    .map((i) => `${i.count} ${itemById(i.item)?.name.toLowerCase() ?? i.item}`)
    .join(", ");
}
