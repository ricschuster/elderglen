import type { Outcome } from "./actions";
import { creatureById } from "./creatures";
import { LIFE_ELIXIR, OIL_OF_GARLIC } from "./items";
import type { GameState } from "./save";

/**
 * The Forge's three small goods (`docs/design/89_placement_system.md`, "Forge
 * stock"). Life Elixir restores health to full. Miner's Treat is plain food
 * with a large energy value (`items.ts`, eaten with `eat`). Oil of Garlic makes
 * the weaker monsters ignore the player for the rest of the day. Prices are
 * Stardew's, placeholders (SC-149). Pure rules.
 *
 * Monsters that live only in mine bands below this one (bands 1 and 2) ignore
 * the player under the oil. The deepest band keeps coming (placeholder).
 */
export const OIL_TIER = 3;

/** Items the player drinks rather than eats. */
export const isDrink = (id: string): boolean =>
  id === LIFE_ELIXIR || id === OIL_OF_GARLIC;

/** True while the oil's day lasts. */
export const oilActive = (g: GameState): boolean =>
  g.combat.oilDay === g.day.clock.day;

/** True when the oil calms this kind of monster today: every band it lives in is below the tier. */
export function oilCalms(g: GameState, kind: string): boolean {
  const def = creatureById(kind);
  return !!def && oilActive(g) && def.bands.every((b) => b < OIL_TIER);
}

/** Drink a Life Elixir or Oil of Garlic from the backpack. */
export function drink(g: GameState, id: string): Outcome {
  if (!isDrink(id)) return { ok: false, reason: "not a drink" };
  if (g.inventory.count(id) < 1)
    return { ok: false, reason: "nothing to drink" };
  if (id === LIFE_ELIXIR) {
    if (g.combat.health.full && !g.combat.effects.any)
      return { ok: false, reason: "not hurt" };
    g.inventory.remove(id);
    g.combat.health.fill();
    g.combat.effects.clear();
    return { ok: true, item: id };
  }
  if (oilActive(g)) return { ok: false, reason: "already protected" };
  g.inventory.remove(id);
  g.combat.oilDay = g.day.clock.day;
  return { ok: true, item: id };
}
