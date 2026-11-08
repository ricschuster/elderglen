import { dateOf } from "./calendar";
import { festivalToday } from "./festivals";
import { animalQuality, withQuality, type Quality } from "./quality";
import type { GameState } from "./save";
import { visibleTier } from "./map";
import { isRaining } from "./weather";

/**
 * Animals, slice 1 (`docs/design/23_animals.md`): the base coop and young
 * chickens. Rules only, free of Phaser and the DOM. Every number here is a
 * placeholder for `07_tuning_numbers.md`.
 */

export type Species = "chicken" | "duck" | "rabbit";

/** One species of the coop: where it lives, what it costs, what it makes and how often. */
export interface SpeciesInfo {
  id: Species;
  name: string;
  /** The coop tier that opens it (1 base, 2 big, 3 deluxe). */
  tier: number;
  price: number;
  /** Fed nights between products. */
  days: number;
  /** The item it makes. */
  item: string;
  /** Word for a grown one on the bench card. */
  grown: string;
}

/** Placeholder prices after note 07 (chicken 800g, duck 1200g, rabbit 8000g). */
export const SPECIES: Record<Species, SpeciesInfo> = {
  chicken: {
    id: "chicken",
    name: "Chicken",
    tier: 1,
    price: 800,
    days: 1,
    item: "egg",
    grown: "hen",
  },
  duck: {
    id: "duck",
    name: "Duck",
    tier: 2,
    price: 1200,
    days: 2,
    item: "duck-egg",
    grown: "duck",
  },
  rabbit: {
    id: "rabbit",
    name: "Rabbit",
    tier: 3,
    price: 8000,
    days: 4,
    item: "wool",
    grown: "rabbit",
  },
};
export const SPECIES_ORDER: readonly Species[] = ["chicken", "duck", "rabbit"];
/** The feather a duck may leave instead of an egg, at this friendship (4 hearts), with this chance. */
export const FEATHER = "feather";
export const FEATHER_FRIENDSHIP = 800;
export const FEATHER_CHANCE = 0.25;

/** Friendship runs 0 to 1000 (5 hearts of 200), mood 0 to 255, as in Stardew. */
export const MAX_FRIENDSHIP = 1000;
export const MAX_MOOD = 255;
export const FRIENDSHIP_PER_HEART = 200;

/** Animals the base coop holds (note 23). */
export const COOP_CAPACITY = 4;
/** What a tier holds (index is tier, 1 to 3), and what its upgrade costs and takes (index is the tier reached). */
export const COOP_CAPACITIES = [0, 4, 8, 12] as const;
export const COOP_UPGRADES: Record<
  number,
  { name: string; coin: number; wood: number; stone: number }
> = {
  2: { name: "Big coop", coin: 10000, wood: 400, stone: 150 },
  3: { name: "Deluxe coop", coin: 20000, wood: 500, stone: 200 },
};
export const COOP_MAX_TIER = 3;
/** What the carpenter charges for the base coop, and the days he works (note 23, near Stardew). */
export const COOP_COST = { coin: 4000, wood: 300, stone: 100 } as const;
export const COOP_BUILD_DAYS = 3;
/** Price of a young chicken at the placeholder shop row (the keeper is not built). */
export const CHICKEN_PRICE = 800;
/** Days a chick takes to grow up, if fed each day. */
export const GROW_DAYS = 4;
/** Hay: the silo's size, what the backstop sells it for, and what a cut weed gives. */
export const SILO_CAPACITY = 240;
export const HAY_PRICE = 50;
export const HAY_PER_WEED = 2;
/** What a new animal's mood and friendship start at. */
export const START_MOOD = 128;

/** Petting, the grass and neglect, after Stardew's numbers (note 23). */
export const PET_FRIENDSHIP = 15;
export const PET_MOOD = 32;
export const GRASS_FRIENDSHIP = 8;
export const UNFED_FRIENDSHIP = -20;
export const UNFED_MOOD = -100;
export const UNPETTED_FRIENDSHIP = -10;
export const UNPETTED_MOOD = -30;
/** Below this mood a fed animal may make nothing: the chance is mood / this. */
export const PRODUCT_MOOD = 70;

/** The egg item id. Quality rides as a suffix like other goods. */
export const EGG = "egg";
/** Placeholder names offered when the player gives none. */
export const DEFAULT_NAMES = [
  "Clementine",
  "Biscuit",
  "Pip",
  "Marigold",
  "Dot",
  "Hazel",
  "Nutmeg",
  "Juniper",
] as const;

/** Where the coop stands on each farm map: the top left of its 6 by 3 footprint. The door is the bottom row, second tile. */
export const COOP_SITES: Record<string, { x: number; y: number }> = {
  farm: { x: 10, y: 9 },
  "farm-woodland": { x: 14, y: 11 },
};
export const COOP_FOOTPRINT = { w: 6, h: 3 } as const;
/** The condition the farm's coop door needs. */
export const COOP_BUILT = "coop-built";
/** The id of the coop interior map. */
export const COOP_MAP = "coop";
/**
 * The tiles animals stand on inside the coop, in order. The first four are the
 * base room, then four each for the big and the deluxe tier, so each tier's
 * animals stand on tiles that tier added.
 */
export const COOP_SLOTS: readonly { x: number; y: number }[] = [
  { x: 2, y: 4 },
  { x: 4, y: 4 },
  { x: 6, y: 4 },
  { x: 8, y: 4 },
  { x: 10, y: 4 },
  { x: 12, y: 4 },
  { x: 10, y: 6 },
  { x: 12, y: 6 },
  { x: 15, y: 4 },
  { x: 17, y: 4 },
  { x: 15, y: 6 },
  { x: 17, y: 6 },
];

/** The coop map tier layer to draw for a coop tier: tier 1 is the base layers. */
export function coopVisibleTier(coopTier: number): number {
  return visibleTier(coopTier - 1, COOP_MAX_TIER - 1);
}

/** What the coop at a tier holds. */
export function coopCapacity(tier: number): number {
  return COOP_CAPACITIES[clamp(Math.floor(tier), 1, COOP_MAX_TIER)]!;
}

export interface Animal {
  id: number;
  species: Species;
  name: string;
  /** Days alive; grown up at `GROW_DAYS`. */
  age: number;
  friendship: number;
  mood: number;
  /** Ate today, from the bench or on grass. */
  fed: boolean;
  petted: boolean;
  /** Out on the grass. One left out at night sleeps there. */
  outside: boolean;
  /** Bought today: needs no feeding or petting the first night. */
  fresh: boolean;
  /** Fed days since its last product, for species that make one every few days. */
  lay: number;
  /** A product waiting in the coop, at its quality. */
  product?: Quality;
  /** What the waiting product is (an item id without quality). Absent means the species' own. */
  item?: string;
}

export interface CoopBuild {
  daysLeft: number;
  /** The tier being built: 1 for the coop itself, 2 or 3 for an upgrade. */
  tier: number;
}

export interface AnimalsState {
  coopBuilt: boolean;
  /** The coop's tier, 1 to 3. 1 until an upgrade lands. */
  tier: number;
  /** The coop being built, if any. */
  build: CoopBuild | undefined;
  animals: Animal[];
  /** Hay in the silo. */
  hay: number;
  nextId: number;
}

export function newAnimals(): AnimalsState {
  return {
    coopBuilt: false,
    tier: 1,
    build: undefined,
    animals: [],
    hay: 0,
    nextId: 1,
  };
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

export function saveAnimals(a: AnimalsState): AnimalsState {
  return {
    coopBuilt: a.coopBuilt,
    tier: a.tier,
    build: a.build ? { ...a.build } : undefined,
    animals: a.animals.map((x) => ({ ...x })),
    hay: a.hay,
    nextId: a.nextId,
  };
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Read saved animals. Anything missing or broken falls back to nothing built. */
export function loadAnimals(raw: unknown): AnimalsState {
  const out = newAnimals();
  if (typeof raw !== "object" || raw === null) return out;
  const r = raw as Record<string, unknown>;
  out.coopBuilt = r.coopBuilt === true;
  const b = r.build as Record<string, unknown> | undefined;
  out.tier =
    out.coopBuilt && isNum(r.tier)
      ? clamp(Math.floor(r.tier), 1, COOP_MAX_TIER)
      : 1;
  if (b && isNum(b.daysLeft) && b.daysLeft >= 1) {
    // An old save has no tier: a coop still being built is tier 1.
    const tier = isNum(b.tier) ? Math.floor(b.tier) : 1;
    const want = out.coopBuilt ? out.tier + 1 : 1;
    if (tier === want && tier <= COOP_MAX_TIER)
      out.build = {
        daysLeft: Math.min(Math.floor(b.daysLeft), COOP_BUILD_DAYS),
        tier,
      };
  }
  if (isNum(r.hay)) out.hay = clamp(Math.floor(r.hay), 0, SILO_CAPACITY);
  if (out.coopBuilt && Array.isArray(r.animals))
    for (const item of r.animals) {
      if (out.animals.length >= coopCapacity(out.tier)) break;
      const a = item as Record<string, unknown> | null;
      if (!a || typeof a !== "object") continue;
      const species = SPECIES_ORDER.find((x) => x === a.species);
      // A species the saved tier does not open is dropped, not kept.
      if (!species || SPECIES[species].tier > out.tier) continue;
      out.animals.push({
        id: isNum(a.id) ? Math.floor(a.id) : out.animals.length + 1,
        species,
        name:
          typeof a.name === "string" && a.name.trim() !== ""
            ? a.name.slice(0, 16)
            : DEFAULT_NAMES[0],
        age: isNum(a.age) ? clamp(Math.floor(a.age), 0, 9999) : GROW_DAYS,
        friendship: isNum(a.friendship)
          ? clamp(Math.floor(a.friendship), 0, MAX_FRIENDSHIP)
          : 0,
        mood: isNum(a.mood)
          ? clamp(Math.floor(a.mood), 0, MAX_MOOD)
          : START_MOOD,
        fed: a.fed === true,
        petted: a.petted === true,
        outside: a.outside === true,
        fresh: a.fresh === true,
        lay: isNum(a.lay) ? clamp(Math.floor(a.lay), 0, 99) : 0,
        item: a.item === FEATHER && species === "duck" ? FEATHER : undefined,
        product:
          a.product === "normal" ||
          a.product === "silver" ||
          a.product === "gold"
            ? a.product
            : undefined,
      });
    }
  out.nextId =
    isNum(r.nextId) && r.nextId > 0
      ? Math.floor(r.nextId)
      : out.animals.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  return out;
}

/** The coop site on a farm map id, if it has one. */
export function coopSite(mapId: string) {
  return COOP_SITES[mapId];
}

/** True if a tile is part of the built coop's footprint on this map, other than its door tile. */
export function coopBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const s = COOP_SITES[mapId];
  if (!s || !g.animals.coopBuilt) return false;
  if (x === s.x + 1 && y === s.y + COOP_FOOTPRINT.h - 1) return false;
  return (
    x >= s.x &&
    x < s.x + COOP_FOOTPRINT.w &&
    y >= s.y &&
    y < s.y + COOP_FOOTPRINT.h
  );
}

export function isAdult(a: Animal): boolean {
  return a.age >= GROW_DAYS;
}

/** Hearts shown on an animal's card, 0 to 5. */
export function hearts(a: Animal): number {
  return Math.floor(a.friendship / FRIENDSHIP_PER_HEART);
}

/** Mood in a word for the card. */
export function moodWord(a: Animal): string {
  return a.mood >= 200
    ? "happy"
    : a.mood >= 150
      ? "content"
      : a.mood >= PRODUCT_MOOD
        ? "fine"
        : "low";
}

/** Why the coop cannot be ordered now, or undefined if it can. */
export function coopProblem(g: GameState): string | undefined {
  if (g.animals.coopBuilt) return "You already have a coop.";
  if (g.animals.build) return "The carpenter is already building your coop.";
  if (g.houseBuild) return "The carpenter is busy with your house.";
  const missing: string[] = [];
  if (g.money < COOP_COST.coin)
    missing.push(`${COOP_COST.coin - g.money}g more`);
  const wood = g.inventory.count("wood");
  if (wood < COOP_COST.wood) missing.push(`${COOP_COST.wood - wood} more wood`);
  const stone = g.inventory.count("stone");
  if (stone < COOP_COST.stone)
    missing.push(`${COOP_COST.stone - stone} more stone`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the coop and start the build. Returns false if it cannot. */
export function orderCoop(g: GameState): boolean {
  if (coopProblem(g) !== undefined) return false;
  g.money -= COOP_COST.coin;
  g.inventory.remove("wood", COOP_COST.wood);
  g.inventory.remove("stone", COOP_COST.stone);
  g.animals.build = { daysLeft: COOP_BUILD_DAYS, tier: 1 };
  return true;
}

/**
 * One morning of the coop build, after the clock moved on. A festival day does
 * not count, as for the house. Returns true on the morning the coop opens.
 */
export function advanceCoop(g: GameState): boolean {
  const b = g.animals.build;
  if (!b || festivalToday(g.day.clock.day)) return false;
  b.daysLeft -= 1;
  if (b.daysLeft > 0) return false;
  g.animals.build = undefined;
  g.animals.coopBuilt = true;
  g.animals.tier = b.tier;
  return true;
}

/** The upgrade the carpenter would build next, or undefined at the deluxe tier or with no coop. */
export function nextCoopUpgrade(g: GameState) {
  if (!g.animals.coopBuilt) return undefined;
  return COOP_UPGRADES[g.animals.tier + 1];
}

/** Why the coop cannot be upgraded now, or undefined if it can. One job at a time. */
export function coopUpgradeProblem(g: GameState): string | undefined {
  if (!g.animals.coopBuilt) return "You need a coop first.";
  const up = nextCoopUpgrade(g);
  if (!up) return "The coop is as big as it gets.";
  if (g.animals.build) return "The carpenter is already working on your coop.";
  if (g.houseBuild) return "The carpenter is busy with your house.";
  const missing: string[] = [];
  if (g.money < up.coin) missing.push(`${up.coin - g.money}g more`);
  const wood = g.inventory.count("wood");
  if (wood < up.wood) missing.push(`${up.wood - wood} more wood`);
  const stone = g.inventory.count("stone");
  if (stone < up.stone) missing.push(`${up.stone - stone} more stone`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the next coop tier. It lands overnight; the outside never changes. */
export function orderCoopUpgrade(g: GameState): boolean {
  if (coopUpgradeProblem(g) !== undefined) return false;
  const up = nextCoopUpgrade(g)!;
  g.money -= up.coin;
  g.inventory.remove("wood", up.wood);
  g.inventory.remove("stone", up.stone);
  g.animals.build = { daysLeft: COOP_BUILD_DAYS, tier: g.animals.tier + 1 };
  return true;
}

/** Why an animal cannot be bought now, or undefined if it can. */
export function animalProblem(
  g: GameState,
  species: Species = "chicken",
): string | undefined {
  const info = SPECIES[species];
  if (!g.animals.coopBuilt) return "You need a coop first.";
  if (g.animals.tier < info.tier)
    return `${info.name}s need the ${COOP_UPGRADES[info.tier]?.name.toLowerCase() ?? "coop"}.`;
  if (g.animals.animals.length >= coopCapacity(g.animals.tier))
    return "The coop is full.";
  if (g.money < info.price) return `You need ${info.price - g.money}g more.`;
  return undefined;
}

/** Why a chick cannot be bought now (slice 1 name for the chicken case). */
export function chickProblem(g: GameState): string | undefined {
  return animalProblem(g, "chicken");
}

/** A name for the next animal when the player gives none. */
export function defaultName(g: GameState): string {
  return DEFAULT_NAMES[(g.animals.nextId - 1) % DEFAULT_NAMES.length]!;
}

/** Buy a young animal and name it. Returns the animal, or undefined if refused. */
export function buyAnimal(
  g: GameState,
  species: Species,
  name: string,
): Animal | undefined {
  if (animalProblem(g, species) !== undefined) return undefined;
  g.money -= SPECIES[species].price;
  const a: Animal = {
    id: g.animals.nextId++,
    species,
    name: cleanName(name) || defaultName(g),
    age: 0,
    friendship: 0,
    mood: START_MOOD,
    fed: false,
    petted: false,
    outside: false,
    fresh: true,
    lay: 0,
  };
  g.animals.animals.push(a);
  return a;
}

/** Buy a young chicken and name it. */
export function buyChick(g: GameState, name: string): Animal | undefined {
  return buyAnimal(g, "chicken", name);
}

/** A trimmed name of at most 16 characters. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 16);
}

export function rename(g: GameState, id: number, name: string): boolean {
  const a = g.animals.animals.find((x) => x.id === id);
  const n = cleanName(name);
  if (!a || n === "") return false;
  a.name = n;
  return true;
}

/** Put hay in the silo, up to its size. Returns how much went in. */
export function addHay(g: GameState, n: number): number {
  if (!g.animals.coopBuilt) return 0;
  const put = Math.min(n, SILO_CAPACITY - g.animals.hay);
  g.animals.hay += put;
  return put;
}

/** Buy hay at the placeholder shop row. Returns the amount bought, 0 if refused. */
export function buyHay(g: GameState, n: number): number {
  if (!g.animals.coopBuilt) return 0;
  const room = SILO_CAPACITY - g.animals.hay;
  const count = Math.min(n, room, Math.floor(g.money / HAY_PRICE));
  if (count <= 0) return 0;
  g.money -= count * HAY_PRICE;
  g.animals.hay += count;
  return count;
}

/** Put hay on the bench for every animal that is in and not yet fed. Returns how many ate and how many went without for lack of hay. */
export function feedAll(g: GameState): { fed: number; short: number } {
  let fed = 0;
  let short = 0;
  for (const a of g.animals.animals) {
    if (a.fed || a.outside) continue;
    if (g.animals.hay > 0) {
      g.animals.hay -= 1;
      a.fed = true;
      fed += 1;
    } else short += 1;
  }
  return { fed, short };
}

/** Pet an animal: friendship and mood, once a day. Returns false if already petted. */
export function pet(g: GameState, id: number): boolean {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a || a.petted) return false;
  a.petted = true;
  a.friendship = clamp(a.friendship + PET_FRIENDSHIP, 0, MAX_FRIENDSHIP);
  a.mood = clamp(a.mood + PET_MOOD, 0, MAX_MOOD);
  return true;
}

/** Why an animal cannot go out now, or undefined if it can. */
export function letOutProblem(g: GameState, id: number): string | undefined {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a) return "No such animal.";
  if (a.outside) return `${a.name} is already out.`;
  if (isRaining(g.weather) || g.weather === "snowy")
    return "It is too wet and cold to go out.";
  if (dateOf(g.day.clock.day).season === "winter")
    return "There is no grass in winter.";
  return undefined;
}

/**
 * Let an animal out on the grass: it eats free, its mood is full and it gains
 * a little friendship. Left out at night it sleeps out (see `endDay`).
 */
export function letOut(g: GameState, id: number): boolean {
  if (letOutProblem(g, id) !== undefined) return false;
  const a = g.animals.animals.find((x) => x.id === id)!;
  a.outside = true;
  if (!a.fed) {
    a.fed = true;
    a.friendship = clamp(a.friendship + GRASS_FRIENDSHIP, 0, MAX_FRIENDSHIP);
  }
  a.mood = MAX_MOOD;
  return true;
}

/** Bring an animal in. Returns false if it was not out. */
export function bringIn(g: GameState, id: number): boolean {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a || !a.outside) return false;
  a.outside = false;
  return true;
}

/** Take the egg an animal left, into the pack. Returns the item id, or why not. */
export function collect(
  g: GameState,
  id: number,
): { item: string } | { problem: string } {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a?.product) return { problem: "Nothing to take there." };
  const item = withQuality(a.item ?? SPECIES[a.species].item, a.product);
  if (!g.inventory.add(item)) return { problem: "Your pack is full." };
  a.product = undefined;
  return { item };
}

/** What the night did, for the morning report. */
export interface AnimalNews {
  /** Animals that made something tonight (eggs, feathers, wool). */
  eggs: number;
  /** Animals that went unfed. */
  unfed: number;
  /** Animals that slept outside. */
  outside: number;
  /** Names of chicks that grew up tonight. */
  grown: string[];
}

/**
 * The night's tick, run once in the day-end step. Unfed animals make nothing
 * and lose friendship and mood. One left outside loses half its mood and the
 * day's egg, nothing else: nothing is lost or hurt. A grown, fed animal that
 * slept in lays an egg if its mood allows (chance mood / 70 under 70), at a
 * quality from friendship and mood.
 */
export function endDay(g: GameState, random: () => number): AnimalNews {
  const news: AnimalNews = { eggs: 0, unfed: 0, outside: 0, grown: [] };
  // The deluxe coop's auto-feeder puts hay out for everyone inside.
  if (g.animals.tier >= COOP_MAX_TIER) feedAll(g);
  for (const a of g.animals.animals) {
    const ate = a.fed || a.fresh;
    if (!ate) {
      a.friendship += UNFED_FRIENDSHIP;
      a.mood += UNFED_MOOD;
      news.unfed += 1;
    }
    if (!a.petted && !a.fresh) {
      a.friendship += UNPETTED_FRIENDSHIP;
      a.mood += UNPETTED_MOOD;
    }
    const sleptOut = a.outside;
    if (sleptOut) {
      a.mood = Math.floor(a.mood / 2);
      news.outside += 1;
    }
    a.friendship = clamp(a.friendship, 0, MAX_FRIENDSHIP);
    a.mood = clamp(a.mood, 0, MAX_MOOD);
    if (!isAdult(a)) {
      if (ate) {
        a.age += 1;
        if (isAdult(a)) news.grown.push(a.name);
      }
    } else if (ate) {
      // The product clock runs on fed nights. A night outside loses the day.
      a.lay = sleptOut ? 0 : a.lay + 1;
      if (a.lay >= SPECIES[a.species].days && a.product === undefined) {
        const chance = a.mood >= PRODUCT_MOOD ? 1 : a.mood / PRODUCT_MOOD;
        if (random() < chance) {
          a.product = animalQuality(a.friendship, a.mood);
          a.item =
            a.species === "duck" &&
            a.friendship >= FEATHER_FRIENDSHIP &&
            random() < FEATHER_CHANCE
              ? FEATHER
              : undefined;
          a.lay = 0;
          news.eggs += 1;
        }
      }
    }
    a.fed = false;
    a.petted = false;
    a.outside = false;
    a.fresh = false;
  }
  return news;
}

/** Lines for the morning report. */
export function animalReportLines(
  news: AnimalNews,
  coopFinished: boolean,
): string[] {
  const lines: string[] = [];
  if (coopFinished) lines.push("The carpenter has finished your coop.");
  for (const n of news.grown) lines.push(`${n} has grown up.`);
  if (news.eggs > 0)
    lines.push(
      news.eggs === 1
        ? "There is something waiting in the coop."
        : `There are ${news.eggs} things waiting in the coop.`,
    );
  if (news.unfed > 0)
    lines.push(
      news.unfed === 1
        ? "One of your animals went without hay."
        : `${news.unfed} of your animals went without hay.`,
    );
  if (news.outside > 0)
    lines.push("Some animals slept outside. They are back in the coop.");
  return lines;
}
