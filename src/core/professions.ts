import type { Skill, Skills } from "./skills";
import { artisanById } from "./artisan";
import { FEATHER, MOONWOOL, SPECIES } from "./animals";
import { cropById } from "./crops";
import { fishById } from "./fishing";
import { fruitTreeById } from "./fruittrees";
import { BARS } from "./ore";
import { GEM_ITEMS } from "./gems";
import { GEODE_POOL_MINERALS } from "./geodes";
import { splitQuality, type Quality } from "./quality";
import tapperData from "../content/tapper.json";

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
 * Two professions per skill at level 5, and two under each at level 10 (farming,
 * fishing and foraging so far). Ours, after Stardew.
 */
export const PROFESSIONS: ProfessionDef[] = [
  {
    id: "tiller",
    skill: "farming",
    name: "Tiller",
    text: "Crops sell for 10% more.",
  },
  {
    id: "rancher",
    skill: "farming",
    name: "Rancher",
    text: "Animal goods sell for 20% more.",
  },
  {
    id: "agriculturist",
    skill: "farming",
    name: "Agriculturist",
    text: "Crops grow 10% faster.",
    under: "tiller",
  },
  {
    id: "artisan",
    skill: "farming",
    name: "Artisan",
    text: "Artisan goods sell for 40% more.",
    under: "tiller",
  },
  {
    id: "coopmaster",
    skill: "farming",
    name: "Coopmaster",
    text: "Coop animals befriend faster and give better goods. The incubator takes half the time.",
    under: "rancher",
  },
  {
    id: "shepherd",
    skill: "farming",
    name: "Shepherd",
    text: "Barn animals befriend faster and give better goods. Sheep give wool a day sooner.",
    under: "rancher",
  },
  {
    id: "forester",
    skill: "foraging",
    name: "Forester",
    text: "Trees and stumps give 25% more wood.",
  },
  {
    id: "gatherer",
    skill: "foraging",
    name: "Gatherer",
    text: "Foraging sometimes gives a second one (20% chance).",
  },
  {
    id: "lumberjack",
    skill: "foraging",
    name: "Lumberjack",
    text: "A felled tree sometimes holds a hardwood (15% chance).",
    under: "forester",
  },
  {
    id: "tapmaster",
    skill: "foraging",
    name: "Tapper",
    text: "Tapped goods (resin, syrup, tar) sell for 25% more.",
    under: "forester",
  },
  {
    id: "botanist",
    skill: "foraging",
    name: "Botanist",
    text: "Foraged goods are always the top grade, Hearthsilver.",
    under: "gatherer",
  },
  {
    id: "tracker",
    skill: "foraging",
    name: "Tracker",
    text: "Arrows at the screen edge point to forage out of sight.",
    under: "gatherer",
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
    text: "Geodes and gems drop twice as often.",
  },
  {
    id: "barwright",
    skill: "mining",
    name: "Barwright",
    text: "Metal bars sell for 50% more.",
    under: "prospector",
  },
  {
    id: "coalseeker",
    skill: "mining",
    name: "Coalseeker",
    text: "Coal turns up twice as often in rocks.",
    under: "prospector",
  },
  {
    id: "geodehunter",
    skill: "mining",
    name: "Geode Hunter",
    text: "Geodes drop twice as often again, four times the usual with Rockhound.",
    under: "rockhound",
  },
  {
    id: "gemcutter",
    skill: "mining",
    name: "Gemcutter",
    text: "Gems and minerals sell for 30% more.",
    under: "rockhound",
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
/** Rancher: animal goods sell for this much more (note 23). */
export const RANCHER_BONUS = 0.2;
/** Artisan: artisan goods sell for this much more (note 23). */
export const ARTISAN_BONUS = 0.4;
export const AGRICULTURIST_SPEED = 1 / 0.9;
export const GATHERER_CHANCE = 0.2;
/** Forester: wood from trees and stumps (placeholder, note 07). */
export const FORESTER_WOOD = 1.25;
/** Lumberjack: chance a felled tree holds a hardwood (placeholder, note 07). */
export const LUMBERJACK_HARDWOOD_CHANCE = 0.15;
/** Tapper: tapped goods sell for this much more (placeholder, note 07). */
export const TAPPER_BONUS = 0.25;

/** Barwright: metal bars sell for this much more (placeholder, note 22). */
export const BARWRIGHT_BONUS = 0.5;
/** Gemcutter: gems and minerals sell for this much more (placeholder, note 22). */
export const GEMCUTTER_BONUS = 0.3;
/** Coalseeker: coal turns up this many times as often (placeholder, note 22). */
export const COALSEEKER_FACTOR = 2;
/** Geode Hunter: geodes drop this many times as often again (placeholder, note 22). */
export const GEODE_HUNTER_FACTOR = 2;

/** Metal bars only: the refined crystal is not a bar. */
const METAL_BARS = BARS.filter((b) => b.id.endsWith("-bar")).map((b) => b.id);

/** Gems, the Diamond and Glimmerstone, and the minerals and crystals geodes give. */
const GEMS_AND_MINERALS = new Set<string>([
  ...GEM_ITEMS.map((g) => g.id),
  ...GEODE_POOL_MINERALS,
]);

/** True for anything an animal makes: Rancher raises what these sell for. */
function isAnimalGood(base: string): boolean {
  return (
    base === FEATHER ||
    base === MOONWOOL ||
    Object.values(SPECIES).some((s) => s.item === base)
  );
}

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
  if (skills.has("barwright") && METAL_BARS.includes(base))
    return 1 + BARWRIGHT_BONUS;
  if (skills.has("gemcutter") && GEMS_AND_MINERALS.has(base))
    return 1 + GEMCUTTER_BONUS;
  if (skills.has("tapmaster") && tapperData.goods.some((t) => t.item === base))
    return 1 + TAPPER_BONUS;
  if (skills.has("tiller") && (cropById(base) || fruitTreeById(base)))
    return 1 + TILLER_BONUS;
  if (skills.has("rancher") && isAnimalGood(base)) return 1 + RANCHER_BONUS;
  if (skills.has("artisan") && artisanById(base)) return 1 + ARTISAN_BONUS;
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

/** Wood from a tree or stump: Foresters get a quarter more, rounded down. */
export function woodYield(skills: Skills, wood: number): number {
  return skills.has("forester") ? Math.floor(wood * FORESTER_WOOD) : wood;
}

/** Botanists always find the top grade of forage. */
export function forageFloor(skills: Skills, quality: Quality): Quality {
  return skills.has("botanist") ? "hearthsilver" : quality;
}

/**
 * Chance a rock breaks with a geode as well: the geode share of nodes, once more
 * for Rockhound and again by the Geode Hunter factor on top, so four times the
 * base in all. Capped at 1.
 */
export function bonusGeodeChance(skills: Skills, share: number): number {
  if (!skills.has("rockhound")) return 0;
  const times = skills.has("geodehunter") ? 1 + GEODE_HUNTER_FACTOR : 1;
  return Math.min(1, share * times);
}

/** Coal is this many times as likely from a rock: twice for a Coalseeker. */
export function coalFactor(skills: Skills): number {
  return skills.has("coalseeker") ? COALSEEKER_FACTOR : 1;
}
