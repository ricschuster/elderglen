/**
 * The people of the Forest's part 2 (`docs/design/72_forest.md`): the animal
 * keeper's advice, the hermit's mutter and the Wanderer's camp. Lines only, and
 * role labels until the cast is named (#136, #178). Plain data, no Phaser.
 */

/** What the keeper says over the counter, one piece of advice a day (note 23). */
export const KEEPER_ADVICE: readonly string[] = [
  "'Feed them every morning and pet them every day. They know the difference.'",
  "'Let them out on a dry day. Grass is better than hay, and free.'",
  "'Winter is hard on them. Keep the coop warm.'",
  "'A young one needs hay each day to grow up, and none on its first.'",
  "'Name them well. They answer to it sooner than you would think.'",
];

/** The advice for a day, the same all day. */
export function keeperAdvice(day: number): string {
  return KEEPER_ADVICE[Math.abs(day) % KEEPER_ADVICE.length]!;
}

/** The hermit, until her stock and her teaching are built (#178). */
export const HERMIT_LINE =
  "The witch looks up from her pots. 'Now, what did I come in for? Something about hats.' She wanders off to the window.";

/** The camp's fire ring: he wanders the roads, so it is empty (note 72). */
export const CAMP_LINE =
  "A fire ring, a bench and a patched tent. Old Greencoat is on the road somewhere.";
