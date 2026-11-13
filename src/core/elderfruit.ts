import { ELDERFRUIT } from "./items";
import { MAX_ENERGY } from "./energy";
import { hasFlag, setFlag } from "./worldflags";
import type { GameState } from "./save";

/**
 * The elderfruit (`docs/design/39_completion_total.md`), our counterpart of
 * Stardew's stardrop: each one eaten adds 34 to the maximum energy, with no
 * health restored. There are seven sources and seven to find, 270 up to 508 (as Stardew's stardrops).
 * Each is eaten the moment it is received (`absorbElderfruit`).
 * The fruit is an item in the pack until it is eaten; the count eaten is the
 * saved state (`GameState.elderfruit`). Pure rules.
 */
export const ELDERFRUIT_ENERGY = 34;
/** Seven sources, one fruit each (note 39, owner 2026-11-12). */
export const ELDERFRUIT_TOTAL = 7;

/** Maximum energy after `eaten` elderfruit. */
export const maxEnergyFor = (eaten: number): number =>
  MAX_ENERGY +
  ELDERFRUIT_ENERGY * Math.min(Math.max(eaten, 0), ELDERFRUIT_TOTAL);

/** Eat one elderfruit from the pack: raise the maximum and fill the new space. */
export function eatElderfruit(
  g: GameState,
): { ok: true } | { ok: false; reason: "nothing to eat" | "all eaten" } {
  if (g.inventory.count(ELDERFRUIT) < 1)
    return { ok: false, reason: "nothing to eat" };
  if (g.elderfruit >= ELDERFRUIT_TOTAL)
    return { ok: false, reason: "all eaten" };
  g.inventory.remove(ELDERFRUIT);
  g.elderfruit += 1;
  g.day.energy.max = maxEnergyFor(g.elderfruit);
  g.day.energy.restore(ELDERFRUIT_ENERGY);
  return { ok: true };
}

/**
 * Eat every elderfruit the pack holds, as Stardew eats a stardrop on pickup. Called by each
 * source right after it adds the item. Returns how many were eaten.
 */
export function absorbElderfruit(g: GameState): number {
  let n = 0;
  while (g.inventory.count(ELDERFRUIT) > 0 && eatElderfruit(g).ok) n += 1;
  return n;
}

/** The flags that mark a one-off elderfruit source as taken. */
export const SOURCE_FLAGS = {
  showing: "elderfruit-showing",
  hermit: "elderfruit-hermit",
  spirit: "elderfruit-spirit",
  emberseed: "emberseed-given",
} as const;

/** Source 1: the Harvest Showing's counter price, and source 4: the hermit's. Placeholders (note 39). */
export const SHOWING_ELDERFRUIT_PRICE = 2000;
export const HERMIT_ELDERFRUIT_PRICE = 20000;

/** Buy the one elderfruit a source sells. Returns a refusal text, or undefined when bought. */
export function buyElderfruit(
  g: GameState,
  flag: string,
  price: number,
): string | undefined {
  if (hasFlag(g, flag)) return "You have bought one already.";
  if (g.money < price) return `You need ${price - g.money}g more.`;
  if (g.inventory.room(ELDERFRUIT) < 1) return "Your pack is full.";
  g.inventory.add(ELDERFRUIT);
  g.money -= price;
  setFlag(g, flag);
  absorbElderfruit(g);
  return undefined;
}

/** The hermit sells her one elderfruit at a very high price (source 4). */
export const hermitStock = (g: GameState): string[] =>
  hasFlag(g, SOURCE_FLAGS.hermit) ? [] : [ELDERFRUIT];

/** The rare seed the hermit gives at 4 hearts, and its fruit (note 39, source 5). */
export const EMBER_BERRY = "ember-berry";
export const EMBERSEED = `${EMBER_BERRY}-seed`;

/** The Secret Woods map's service kind for the spirit's statue (note 73). */
export const SPIRIT_STATUE = "spirit-statue";

/** The spirit in the Secret Woods takes one ember berry, once, and gives an elderfruit. */
export function giveToSpirit(g: GameState): string {
  if (hasFlag(g, SOURCE_FLAGS.spirit))
    return "The stone is quiet. It has had its fruit.";
  if (g.inventory.count(EMBER_BERRY) < 1)
    return "An old mossy stone, warm to the touch. It seems to want something grown from a rare seed.";
  g.inventory.remove(EMBER_BERRY);
  if (!g.inventory.add(ELDERFRUIT)) {
    g.inventory.add(EMBER_BERRY);
    return "Your pack is full.";
  }
  setFlag(g, SOURCE_FLAGS.spirit);
  absorbElderfruit(g);
  return "The stone takes the ember berry. Something small and bright rolls out of the moss.";
}
