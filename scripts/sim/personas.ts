// The three players of note 08, as numbers. Each is a plan over the same core
// actions, so the results stay comparable with the browser runs.
export interface Persona {
  name: string;
  /** Chance of playing on a given day; a skipped day is just slept through. */
  playChance: number;
  /** Chance of walking the forage spots on a played day. */
  forageChance: number;
  /** Most spots picked in one sweep; 0 for all of them. */
  forageMax: number;
  /** Visit the hall every this many played days, if there is something to hand in. */
  hallEvery: number;
  /** Chance of skipping the watering on a played day. */
  forgetWater: number;
  /** How many of each crop a bundle wants to have growing or in hand. */
  cropsPerBundleCrop: number;
  /** False for a player who sells goods the hall wants before handing them in (note 08's casual). */
  keepsForHall: boolean;
  /** A crop planted for money on spare soil, and how many plots of it. */
  cashCrop?: string;
  cashPlots: number;
  /** Extra plots of the best paying crop while saving for the barn, the coop and the kitchen. */
  savingPlots: number;
  /** Chance of a fishing outing on a played day, casts in one, and the hands on the bar. */
  fishChance: number;
  fishCasts: number;
  /** Seconds before the bar answers the fish, and fumbles a second (`playFight`). */
  reaction: number;
  fumble: number;
  /** How far out the line goes, 0 to 1 of the rod's range: it sets the size roll and so the quality. */
  castShare: number;
  /** Chance of a day's trip to the Forest to forage, dig and cut wood. */
  forestChance: number;
  /** Visit the villager who teaches a recipe every this many played days. */
  socialEvery: number;
  /** True for a player who plans the whole hall, the Last Seat included; the casual does not. */
  plansWholeHall: boolean;
}

export const PERSONAS: Record<string, Persona> = {
  expert: {
    name: "expert",
    playChance: 1,
    forageChance: 1,
    forageMax: 0,
    hallEvery: 1,
    forgetWater: 0,
    cropsPerBundleCrop: 2,
    keepsForHall: true,
    cashCrop: "parsnip",
    cashPlots: 0,
    savingPlots: 60,
    fishChance: 0.8,
    fishCasts: 10,
    reaction: 0.12,
    fumble: 0.1,
    castShare: 0.9,
    forestChance: 0.7,
    socialEvery: 1,
    plansWholeHall: true,
  },
  intermediate: {
    name: "intermediate",
    playChance: 1,
    forageChance: 0.6,
    forageMax: 0,
    hallEvery: 3,
    forgetWater: 0.1,
    cropsPerBundleCrop: 2,
    keepsForHall: true,
    cashCrop: "parsnip",
    cashPlots: 12,
    savingPlots: 30,
    fishChance: 0.4,
    fishCasts: 8,
    reaction: 0.2,
    fumble: 0.3,
    castShare: 0.6,
    forestChance: 0.35,
    socialEvery: 2,
    plansWholeHall: true,
  },
  casual: {
    name: "casual",
    playChance: 0.75,
    forageChance: 0.33,
    forageMax: 3,
    hallEvery: 6,
    forgetWater: 0.3,
    cropsPerBundleCrop: 1,
    keepsForHall: false,
    cashCrop: "parsnip",
    cashPlots: 6,
    savingPlots: 0,
    fishChance: 0.15,
    fishCasts: 5,
    reaction: 0.35,
    fumble: 0.6,
    castShare: 0.4,
    forestChance: 0.1,
    socialEvery: 5,
    plansWholeHall: false,
  },
};
