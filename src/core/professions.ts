import type { Skill, Skills } from "./skills";
import { cropById } from "./crops";
import { fruitTreeById } from "./fruittrees";
import { splitQuality, type Quality } from "./quality";

/** The level at which a skill offers a choice of profession, as in Stardew. */
export const PROFESSION_LEVEL = 5;

export interface ProfessionDef {
  id: string;
  skill: Skill;
  name: string;
  text: string;
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
];

export const TILLER_BONUS = 0.1;
export const AGRICULTURIST_SPEED = 1 / 0.9;
export const GATHERER_CHANCE = 0.2;

export function professionById(id: string): ProfessionDef | undefined {
  return PROFESSIONS.find((p) => p.id === id);
}

export function optionsFor(skill: Skill): ProfessionDef[] {
  return PROFESSIONS.filter((p) => p.skill === skill);
}

/** A skill that has reached the choice level and has not chosen yet. */
export function pendingChoice(skills: Skills): Skill | undefined {
  return skills.skills.find(
    (s) =>
      skills.level(s) >= PROFESSION_LEVEL &&
      !skills.professionOf(s) &&
      optionsFor(s).length > 0,
  );
}

/** Pick a profession. Returns false if it is not one of that skill's options or the choice is not open. */
export function choose(skills: Skills, skill: Skill, id: string): boolean {
  if (pendingChoice(skills) !== skill) return false;
  if (!optionsFor(skill).some((p) => p.id === id)) return false;
  skills.setProfession(skill, id);
  return true;
}

/** Sell price multiplier for an item: Tillers get more for crops. */
export function sellMultiplier(skills: Skills, itemId: string): number {
  const { base } = splitQuality(itemId);
  return skills.has("tiller") && (cropById(base) || fruitTreeById(base))
    ? 1 + TILLER_BONUS
    : 1;
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
