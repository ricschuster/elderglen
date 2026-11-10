import type { Skill, Skills } from "./skills";
import { cropById } from "./crops";
import { fishById } from "./fishing";
import { fruitTreeById } from "./fruittrees";
import { splitQuality, type Quality } from "./quality";

/** The level at which a skill offers a choice of profession, as in Stardew. */
export const PROFESSION_LEVEL = 5;

/** The level at which a skill offers its second choice, under the first. */
export const TOP_PROFESSION_LEVEL = 10;

export interface ProfessionDef {
  id: string;
  skill: Skill;
  name: string;
  text: string;
  /** Set for a level 10 profession: the level 5 profession it grows from. */
  under?: string;
}

/**
 * Two professions per skill, one per skill picked at level 5. Stardew's level
 * 10 choices and its animal and wood options are left out. Ours, after Stardew.
 */
export const PROFESSIONS: ProfessionDef[] = [
  {
    id: "tiller",
    skill: "farming",
    name: "Tiller",
    text: "Crops sell for 10% more.",
  },
  {
    id: "agriculturist",
    skill: "farming",
    name: "Agriculturist",
    text: "Crops grow 10% faster.",
  },
  {
    id: "gatherer",
    skill: "foraging",
    name: "Gatherer",
    text: "Foraging sometimes gives a second one (20% chance).",
  },
  {
    id: "botanist",
    skill: "foraging",
    name: "Botanist",
    text: "Foraged goods are always at least silver quality.",
  },
  {
    id: "prospector",
    skill: "mining",
    name: "Prospector",
    text: "A node sometimes gives one more ore (25% chance).",
  },
  {
    id: "rockhound",
    skill: "mining",
    name: "Rockhound",
    text: "Geodes drop twice as often.",
  },
  {
    id: "steady",
    skill: "combat",
    name: "Steady",
    text: "25 more health.",
  },
  {
    id: "nimble",
    skill: "combat",
    name: "Nimble",
    text: "A hit leaves 2.5 seconds of grace, not 1.5.",
  },
  {
    id: "fisher",
    skill: "fishing",
    name: "Fisher",
    text: "Fish sell for 25% more.",
  },
  {
    id: "trapper",
    skill: "fishing",
    name: "Trapper",
    text: "Shellfish pots cost half as much.",
  },
  {
    id: "angler",
    skill: "fishing",
    name: "Angler",
    text: "Fish sell for 50% more.",
    under: "fisher",
  },
  {
    id: "pirate",
    skill: "fishing",
    name: "Pirate",
    text: "Twice the chance of treasure with the Magpie Hook.",
    under: "fisher",
  },
  {
    id: "mariner",
    skill: "fishing",
    name: "Mariner",
    text: "Pots never catch junk.",
    under: "trapper",
  },
  {
    id: "luremaster",
    skill: "fishing",
    name: "Luremaster",
    text: "Pots need no bait.",
    under: "trapper",
  },
];

export const FISHER_BONUS = 0.25;
export const ANGLER_BONUS = 0.5;
/** Trapper: the share of the pot's price paid (note 21, placeholder). */
export const TRAPPER_PRICE = 0.5;
export const PIRATE_TREASURE = 2;
export const TILLER_BONUS = 0.1;
export const AGRICULTURIST_SPEED = 1 / 0.9;
export const GATHERER_CHANCE = 0.2;

export function professionById(id: string): ProfessionDef | undefined {
  return PROFESSIONS.find((p) => p.id === id);
}

/** The level this skill's next choice is made at, or undefined if none is open to be made. */
function nextTier(skills: Skills, skill: Skill): 5 | 10 | undefined {
  const first = skills.professionOf(skill);
  if (!first) return PROFESSION_LEVEL;
  return skills.topProfessionOf(skill) ? undefined : TOP_PROFESSION_LEVEL;
}

/** The professions on offer to a skill now: the level 5 pair, or the pair under what it chose. */
export function optionsFor(skill: Skill, skills?: Skills): ProfessionDef[] {
  const first = skills?.professionOf(skill);
  if (!first) return PROFESSIONS.filter((p) => p.skill === skill && !p.under);
  return PROFESSIONS.filter((p) => p.skill === skill && p.under === first);
}

/** A skill that has reached a choice level and has not chosen yet. */
export function pendingChoice(skills: Skills): Skill | undefined {
  return skills.skills.find((s) => {
    const tier = nextTier(skills, s);
    return (
      tier !== undefined &&
      skills.level(s) >= tier &&
      optionsFor(s, skills).length > 0
    );
  });
}

/** The level of the choice a skill is pending on: 5 or 10. */
export function pendingLevel(skills: Skills, skill: Skill): 5 | 10 | undefined {
  return pendingChoice(skills) === skill ? nextTier(skills, skill) : undefined;
}

/** Pick a profession. Returns false if it is not one of that skill's options or the choice is not open. */
export function choose(skills: Skills, skill: Skill, id: string): boolean {
  if (pendingChoice(skills) !== skill) return false;
  const pick = optionsFor(skill, skills).find((p) => p.id === id);
  if (!pick) return false;
  if (pick.under) skills.setTopProfession(skill, id);
  else skills.setProfession(skill, id);
  return true;
}

/** Sell price multiplier for an item: Tillers get more for crops. */
export function sellMultiplier(skills: Skills, itemId: string): number {
  const { base } = splitQuality(itemId);
  if (skills.has("tiller") && (cropById(base) || fruitTreeById(base)))
    return 1 + TILLER_BONUS;
  // Fish only: shellfish and junk from a pot are not fish. Angler replaces Fisher.
  if (fishById(base)) {
    if (skills.has("angler")) return 1 + ANGLER_BONUS;
    if (skills.has("fisher")) return 1 + FISHER_BONUS;
  }
  return 1;
}

/** What the fisher charges for a shellfish pot. */
export function potPrice(skills: Skills, base: number): number {
  return skills.has("trapper") ? Math.floor(base * TRAPPER_PRICE) : base;
}

/** Magpie Hook treasure chance, doubled by Pirate. */
export function treasureChance(skills: Skills, base: number): number {
  return Math.min(1, skills.has("pirate") ? base * PIRATE_TREASURE : base);
}

/** Crop growth per watered day. */
export function growthRate(skills: Skills): number {
  return skills.has("agriculturist") ? AGRICULTURIST_SPEED : 1;
}

/** Chance that foraging yields a second good. */
export function doubleForageChance(skills: Skills): number {
  return skills.has("gatherer") ? GATHERER_CHANCE : 0;
}

/** Botanists never find plain forage. */
export function forageFloor(skills: Skills, quality: Quality): Quality {
  return skills.has("botanist") && quality === "normal" ? "silver" : quality;
}
