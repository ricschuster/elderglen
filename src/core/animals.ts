import { dateOf } from "./calendar";
import { festivalDayToday } from "./festivals";
import { loadHorse, newHorse, saveHorse, type Horse } from "./horse";
import { HARDWOOD, itemById } from "./items";
import {
  animalQuality,
  splitQuality,
  withQuality,
  type Quality,
} from "./quality";
import type { GameState } from "./save";
import { visibleTier } from "./map";
import { isRaining } from "./weather";

/**
 * Animals (`docs/design/23_animals.md`): the coop and the barn, their tiers and
 * species. Rules only, free of Phaser and the DOM. Every number here is a
 * placeholder for `07_tuning_numbers.md`.
 */

export type Species =
  "chicken" | "duck" | "rabbit" | "cow" | "goat" | "sheep" | "pig";

/** The farm buildings the carpenter places. The coop and barn house animals; the stable holds the horse (note 59). */
export type Building = "coop" | "barn" | "stable";

/** One species of the coop: where it lives, what it costs, what it makes and how often. */
export interface SpeciesInfo {
  id: Species;
  name: string;
  /** The building that houses it. */
  building: Building;
  /** The building tier that opens it (1 base, 2 big, 3 deluxe). */
  tier: number;
  /** Makes its product only on a day it was let out (the pig's truffle). */
  outdoors?: boolean;
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
    building: "coop",
    tier: 1,
    price: 800,
    days: 1,
    item: "egg",
    grown: "hen",
  },
  duck: {
    id: "duck",
    name: "Duck",
    building: "coop",
    tier: 2,
    price: 1200,
    days: 2,
    item: "duck-egg",
    grown: "duck",
  },
  rabbit: {
    id: "rabbit",
    name: "Rabbit",
    building: "coop",
    tier: 3,
    price: 8000,
    days: 4,
    item: "wool",
    grown: "rabbit",
  },
  cow: {
    id: "cow",
    name: "Cow",
    building: "barn",
    tier: 1,
    price: 1500,
    days: 1,
    item: "milk",
    grown: "cow",
  },
  goat: {
    id: "goat",
    name: "Goat",
    building: "barn",
    tier: 2,
    price: 4000,
    days: 2,
    item: "goat-milk",
    grown: "goat",
  },
  sheep: {
    id: "sheep",
    name: "Sheep",
    building: "barn",
    tier: 3,
    price: 8000,
    days: 3,
    item: "wool",
    grown: "sheep",
  },
  pig: {
    id: "pig",
    name: "Pig",
    building: "barn",
    tier: 3,
    price: 16000,
    days: 1,
    item: "truffle",
    grown: "pig",
    outdoors: true,
  },
};
export const SPECIES_ORDER: readonly Species[] = [
  "chicken",
  "duck",
  "rabbit",
  "cow",
  "goat",
  "sheep",
  "pig",
];
/** The species a building can house, in shop order. */
export function speciesOf(b: Building): Species[] {
  return SPECIES_ORDER.filter((s) => SPECIES[s].building === b);
}
/**
 * Moonwool (note 23): a sheep at this friendship (8 of 10 hearts on the note's
 * scale, 800 of our 1000), fed and at 70 mood or more, leaves one beside its
 * wool with this chance. The placeholder name is `moonwool`.
 */
export const MOONWOOL = "moonwool";
export const MOONWOOL_FRIENDSHIP = 800;
export const MOONWOOL_CHANCE = 0.05;
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
/** The barn: same tiers, capacities, prices and days as the coop (note 23, placeholders). */
export const BARN_CAPACITIES = [0, 4, 8, 12] as const;
export const BARN_UPGRADES: Record<
  number,
  { name: string; coin: number; wood: number; stone: number }
> = {
  2: { name: "Big barn", coin: 10000, wood: 400, stone: 150 },
  3: { name: "Deluxe barn", coin: 20000, wood: 500, stone: 200 },
};
export const BARN_MAX_TIER = 3;
export const BARN_COST = { coin: 4000, wood: 300, stone: 100 } as const;
export const BARN_BUILD_DAYS = 3;

/**
 * The stable (note 59, owner 2026-11-06): 10,000g, Hardwood 100 and Iron Bar 5
 * as Stardew, two days to build, 4 by 2 tiles. The horse comes with it.
 */
export const STABLE_COST = {
  coin: 10000,
  wood: 0,
  stone: 0,
  hardwood: 100,
  iron: 5,
} as const;
export const STABLE_BUILD_DAYS = 2;
export const STABLE_FOOTPRINT = { w: 4, h: 2 } as const;
/** The item the stable asks for besides wood. */
export const IRON_BAR = "iron-bar";
/** Only used when a stable has no chosen site, which a placed stable always has. */
export const STABLE_SITES: Record<string, { x: number; y: number }> = {
  farm: { x: 60, y: 27 },
  "farm-woodland": { x: 32, y: 9 },
};
/** What a base building costs. Only the stable asks for hardwood and iron. */
export interface BuildCost {
  coin: number;
  wood: number;
  stone: number;
  hardwood?: number;
  iron?: number;
}
/** What differs between the buildings. */
export interface BuildingInfo {
  id: Building;
  /** Lower case word for messages. */
  noun: string;
  /** Name of the base building at the carpenter. */
  name: string;
  maxTier: number;
  capacities: readonly number[];
  cost: BuildCost;
  upgrades: Record<
    number,
    { name: string; coin: number; wood: number; stone: number }
  >;
  days: number;
}
export const BUILDINGS: Record<Building, BuildingInfo> = {
  coop: {
    id: "coop",
    noun: "coop",
    name: "Chicken coop",
    maxTier: COOP_MAX_TIER,
    capacities: COOP_CAPACITIES,
    cost: COOP_COST,
    upgrades: COOP_UPGRADES,
    days: COOP_BUILD_DAYS,
  },
  barn: {
    id: "barn",
    noun: "barn",
    name: "Barn",
    maxTier: BARN_MAX_TIER,
    capacities: BARN_CAPACITIES,
    cost: BARN_COST,
    upgrades: BARN_UPGRADES,
    days: BARN_BUILD_DAYS,
  },
  stable: {
    id: "stable",
    noun: "stable",
    name: "Stable",
    maxTier: 1,
    capacities: [0],
    cost: STABLE_COST,
    upgrades: {},
    days: STABLE_BUILD_DAYS,
  },
};
/** The buildings in the carpenter's order. The stable has its own rows (it holds no animals). */
export const BUILDING_ORDER: readonly Building[] = ["coop", "barn"];

/** The incubator at the big coop: one egg at a time, hatching after these nights (note 23, placeholder). */
export const INCUBATE_DAYS = 6;
export const INCUBATOR_TIER = 2;

/** Coopmaster and Shepherd: friendship from petting and grazing is this many times larger (placeholder). */
export const MASTER_FRIENDSHIP = 1.5;
/** Coopmaster and Shepherd: friendship counted extra when a good's quality is rolled (placeholder). */
export const MASTER_QUALITY_FRIENDSHIP = 150;

/** The level 10 profession that serves a building's animals, if the player has it. */
function masterOf(g: GameState, b: Building): boolean {
  return g.skills.has(b === "coop" ? "coopmaster" : "shepherd");
}

/** Friendship from petting and grazing: a master of the building earns half as much again (placeholder). */
function friendshipGain(g: GameState, a: Animal, n: number): number {
  return masterOf(g, SPECIES[a.species].building)
    ? Math.round(n * MASTER_FRIENDSHIP)
    : n;
}

/** Nights an egg takes to hatch: the Coopmaster halves it. */
export function incubateDays(g: GameState): number {
  return g.skills.has("coopmaster")
    ? Math.ceil(INCUBATE_DAYS / 2)
    : INCUBATE_DAYS;
}

/** Fed nights between products: the Shepherd's sheep give wool a day sooner. */
function productDays(g: GameState, a: Animal): number {
  const base = SPECIES[a.species].days;
  return a.species === "sheep" && g.skills.has("shepherd")
    ? Math.max(1, base - 1)
    : base;
}
/** The eggs it takes, and the young animal each hatches. */
export const HATCHES: Record<string, Species> = {
  egg: "chicken",
  "duck-egg": "duck",
};

/** Price of a young chicken at the placeholder shop row (the keeper is not built). */
export const CHICKEN_PRICE = 800;
/** Days a chick takes to grow up, if fed each day. */
export const GROW_DAYS = 4;
/** Hay is a pack item. One silo holds this much, and the carpenter sells hay at this price (note 23). */
export const HAY = "hay";
export const SILO_CAPACITY = 240;
export const HAY_PRICE = 50;
/** The silo: a farm building the carpenter makes, 3 by 3, as Stardew's (clay comes from tilling soil, note 23). */
export const SILO_COST = {
  coin: 100,
  stone: 100,
  clay: 10,
  "copper-bar": 5,
} as const;
export const SILO_BUILD_DAYS = 2;
export const SILO_FOOTPRINT = { w: 3, h: 3 } as const;
export const SILO_SITES: Record<string, { x: number; y: number }> = {
  farm: { x: 52, y: 27 },
  "farm-woodland": { x: 28, y: 9 },
};
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
  farm: { x: 52, y: 20 },
  "farm-woodland": { x: 14, y: 11 },
};
export const COOP_FOOTPRINT = { w: 6, h: 3 } as const;
/** Where the barn stands: the top left of its 7 by 4 footprint. The door is the bottom row, fourth tile. */
export const BARN_SITES: Record<string, { x: number; y: number }> = {
  farm: { x: 60, y: 20 },
  "farm-woodland": { x: 21, y: 9 },
};
export const BARN_FOOTPRINT = { w: 7, h: 4 } as const;
/** The condition the farm's barn door needs, and the id of the barn interior map. */
export const BARN_BUILT = "barn-built";
export const BARN_MAP = "barn";
/**
 * Animal tiles inside the barn: four for the base room, then four on the tiles
 * each bigger tier adds. The barn is 17, 21 and 24 wide by 13 deep (note 68).
 */
export const BARN_SLOTS: readonly { x: number; y: number }[] = [
  { x: 2, y: 4 },
  { x: 5, y: 4 },
  { x: 2, y: 7 },
  { x: 14, y: 4 },
  { x: 17, y: 4 },
  { x: 19, y: 4 },
  { x: 17, y: 7 },
  { x: 19, y: 7 },
  { x: 21, y: 4 },
  { x: 22, y: 6 },
  { x: 21, y: 8 },
  { x: 22, y: 10 },
];
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

/** The barn map tier layer to draw for a barn tier. */
export function barnVisibleTier(barnTier: number): number {
  return visibleTier(barnTier - 1, BARN_MAX_TIER - 1);
}

/** What a building at a tier holds. */
export function capacityOf(b: Building, tier: number): number {
  const info = BUILDINGS[b];
  return info.capacities[clamp(Math.floor(tier), 1, info.maxTier)]!;
}

/** What the coop at a tier holds. */
export function coopCapacity(tier: number): number {
  return capacityOf("coop", tier);
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
  /** Let out on the grass today (a pig digs a truffle only then). */
  grazed: boolean;
  /** A product waiting in the coop, at its quality. */
  product?: Quality;
  /** Moonwool waiting beside a sheep's wool, at its quality. */
  bonus?: Quality;
  /** What the waiting product is (an item id without quality). Absent means the species' own. */
  item?: string;
}

export interface CoopBuild {
  daysLeft: number;
  /** The tier being built: 1 for the building itself, 2 or 3 for an upgrade. */
  tier: number;
  /** Which building the carpenter is working on. Old saves have the coop. */
  building: Building;
}

/** The egg in the incubator and the nights it still needs. */
export interface Incubator {
  egg: string;
  daysLeft: number;
}

export interface AnimalsState {
  coopBuilt: boolean;
  /** The coop's tier, 1 to 3. 1 until an upgrade lands. */
  tier: number;
  barnBuilt: boolean;
  /** The barn's tier, 1 to 3. */
  barnTier: number;
  /** The coop or barn being built or upgraded, if any. One job at a time. */
  build: CoopBuild | undefined;
  /** The egg being hatched at the big coop. */
  incubator: Incubator | undefined;
  animals: Animal[];
  /** Hay in the silo. Always 0 with no silo. */
  hay: number;
  /** True once the carpenter has built the silo. */
  silo: boolean;
  /** Days left on the silo job, 0 when none. One carpenter job at a time. */
  siloDays: number;
  /**
   * Where the player put the coop and the barn, the top left tile
   * (`docs/design/60_building_placement.md`). Absent means the fixed site of
   * the farm map, so old saves keep working.
   */
  sites: Partial<Record<Building, { x: number; y: number }>>;
  /** True once the carpenter has built the stable. The horse comes with it (note 59). */
  stableBuilt: boolean;
  /** The horse: its name and where it was left today. */
  horse: Horse;
  /** True while the player rides. Not saved: a loaded game starts on foot. */
  mounted: boolean;
  nextId: number;
}

export function newAnimals(): AnimalsState {
  return {
    coopBuilt: false,
    tier: 1,
    barnBuilt: false,
    barnTier: 1,
    build: undefined,
    incubator: undefined,
    animals: [],
    hay: 0,
    silo: false,
    siloDays: 0,
    sites: {},
    stableBuilt: false,
    horse: newHorse(),
    mounted: false,
    nextId: 1,
  };
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

export function saveAnimals(a: AnimalsState): AnimalsState {
  return {
    coopBuilt: a.coopBuilt,
    tier: a.tier,
    barnBuilt: a.barnBuilt,
    barnTier: a.barnTier,
    build: a.build ? { ...a.build } : undefined,
    incubator: a.incubator ? { ...a.incubator } : undefined,
    animals: a.animals.map((x) => ({ ...x })),
    hay: a.hay,
    silo: a.silo,
    siloDays: a.siloDays,
    sites: Object.fromEntries(
      Object.entries(a.sites).map(([k, v]) => [k, { ...v }]),
    ),
    stableBuilt: a.stableBuilt,
    horse: saveHorse(a.horse),
    mounted: false,
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
  out.barnBuilt = r.barnBuilt === true;
  out.stableBuilt = r.stableBuilt === true;
  out.horse = out.stableBuilt ? loadHorse(r.horse) : newHorse();
  out.tier =
    out.coopBuilt && isNum(r.tier)
      ? clamp(Math.floor(r.tier), 1, COOP_MAX_TIER)
      : 1;
  out.barnTier =
    out.barnBuilt && isNum(r.barnTier)
      ? clamp(Math.floor(r.barnTier), 1, BARN_MAX_TIER)
      : 1;
  const b = r.build as Record<string, unknown> | undefined;
  if (b && isNum(b.daysLeft) && b.daysLeft >= 1) {
    // An old save has no building: a job in it is the coop's.
    const building: Building =
      b.building === "barn" || b.building === "stable" ? b.building : "coop";
    // An old save has no tier: a coop still being built is tier 1.
    const tier = isNum(b.tier) ? Math.floor(b.tier) : 1;
    const built = isBuilt(out, building);
    const want = built ? tierOf(out, building) + 1 : 1;
    if (tier === want && tier <= BUILDINGS[building].maxTier)
      out.build = {
        daysLeft: Math.min(Math.floor(b.daysLeft), BUILDINGS[building].days),
        tier,
        building,
      };
  }
  const inc = r.incubator as Record<string, unknown> | undefined;
  if (
    inc &&
    out.coopBuilt &&
    out.tier >= INCUBATOR_TIER &&
    typeof inc.egg === "string" &&
    HATCHES[inc.egg] !== undefined &&
    isNum(inc.daysLeft)
  )
    out.incubator = {
      egg: inc.egg,
      daysLeft: clamp(Math.floor(inc.daysLeft), 0, INCUBATE_DAYS),
    };
  // A site is kept only for a building that exists or is being built. An old
  // save has none, and the building stands at the fixed site of its map.
  const sites = r.sites as Record<string, unknown> | undefined;
  for (const b of ["coop", "barn", "stable"] as const) {
    const v = sites?.[b] as Record<string, unknown> | undefined;
    if (
      v &&
      isNum(v.x) &&
      isNum(v.y) &&
      (isBuilt(out, b) || out.build?.building === b)
    )
      out.sites[b] = {
        x: clamp(Math.floor(v.x), 0, MAX_SITE),
        y: clamp(Math.floor(v.y), 0, MAX_SITE),
      };
  }
  out.silo = r.silo === true;
  if (!out.silo && isNum(r.siloDays) && r.siloDays >= 1)
    out.siloDays = Math.min(Math.floor(r.siloDays), SILO_BUILD_DAYS);
  // An old save kept hay with no silo. It cannot stay anywhere, so it is lost.
  if (out.silo && isNum(r.hay))
    out.hay = clamp(Math.floor(r.hay), 0, SILO_CAPACITY);
  if (Array.isArray(r.animals))
    for (const item of r.animals) {
      const a = item as Record<string, unknown> | null;
      if (!a || typeof a !== "object") continue;
      const species = SPECIES_ORDER.find((x) => x === a.species);
      if (!species) continue;
      const home = SPECIES[species].building;
      // An animal whose building is gone, or too small, or full, is dropped.
      if (!isBuilt(out, home) || SPECIES[species].tier > tierOf(out, home))
        continue;
      if (
        out.animals.filter((x) => SPECIES[x.species].building === home)
          .length >= capacityOf(home, tierOf(out, home))
      )
        continue;
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
        grazed: a.grazed === true,
        lay: isNum(a.lay) ? clamp(Math.floor(a.lay), 0, 99) : 0,
        item: a.item === FEATHER && species === "duck" ? FEATHER : undefined,
        product: quality(a.product),
        bonus: species === "sheep" ? quality(a.bonus) : undefined,
      });
    }
  out.nextId =
    isNum(r.nextId) && r.nextId > 0
      ? Math.floor(r.nextId)
      : out.animals.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  return out;
}

function quality(v: unknown): Quality | undefined {
  return v === "normal" || v === "silver" || v === "gold" ? v : undefined;
}

/** True if the building stands. */
export function isBuilt(a: AnimalsState, b: Building): boolean {
  return b === "coop"
    ? a.coopBuilt
    : b === "barn"
      ? a.barnBuilt
      : a.stableBuilt;
}

/** The tier of a building, 1 to 3 (1 when it is not built). */
export function tierOf(a: AnimalsState, b: Building): number {
  return b === "coop" ? a.tier : b === "barn" ? a.barnTier : 1;
}

/** The animals that live in a building, in the order they were bought. */
export function animalsIn(g: GameState, b: Building): Animal[] {
  return g.animals.animals.filter((a) => SPECIES[a.species].building === b);
}

/** The tile each animal of a building stands on. Each tier's animals stand on tiles that tier added. */
export function animalSlots(
  g: GameState,
  b: Building,
): { animal: Animal; x: number; y: number }[] {
  const slots = b === "coop" ? COOP_SLOTS : BARN_SLOTS;
  return animalsIn(g, b).flatMap((animal, i) => {
    const s = slots[i];
    return s ? [{ animal, x: s.x, y: s.y }] : [];
  });
}

/** The largest tile a saved site may hold. Placement keeps a site on the map. */
export const MAX_SITE = 255;

/** The footprint of the coop or the barn, and the door tile's offset from its top left. */
export const FOOTPRINTS = {
  coop: { w: COOP_FOOTPRINT.w, h: COOP_FOOTPRINT.h, doorX: 1, door: true },
  barn: { w: BARN_FOOTPRINT.w, h: BARN_FOOTPRINT.h, doorX: 3, door: true },
  /** The stable has no interior and no door: the horse stands in front (note 59). */
  stable: {
    w: STABLE_FOOTPRINT.w,
    h: STABLE_FOOTPRINT.h,
    doorX: 1,
    door: false,
  },
} as const;

/**
 * Where a building stands on a farm map: the site the player chose, else the
 * fixed one of the map (every old save). Undefined on a map with no site.
 */
export function siteOf(
  g: { animals: AnimalsState },
  b: Building,
  mapId: string,
) {
  const fixed = (
    b === "coop" ? COOP_SITES : b === "barn" ? BARN_SITES : STABLE_SITES
  )[mapId];
  return fixed ? (g.animals.sites[b] ?? fixed) : undefined;
}

/** The barn site on a farm map id, if it has one. */
export function barnSite(g: { animals: AnimalsState }, mapId: string) {
  return siteOf(g, "barn", mapId);
}

/** The coop site on a farm map id, if it has one. */
export function coopSite(g: { animals: AnimalsState }, mapId: string) {
  return siteOf(g, "coop", mapId);
}

/** True if a tile is part of the built coop's footprint on this map, other than its door tile. */
export function coopBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const s = siteOf(g, "coop", mapId);
  if (!s || !g.animals.coopBuilt) return false;
  if (x === s.x + 1 && y === s.y + COOP_FOOTPRINT.h - 1) return false;
  return (
    x >= s.x &&
    x < s.x + COOP_FOOTPRINT.w &&
    y >= s.y &&
    y < s.y + COOP_FOOTPRINT.h
  );
}

/** Where the silo stands on this map, if it has a site. */
export function siloSite(mapId: string) {
  return SILO_SITES[mapId];
}

/** True if a tile is part of the built silo's footprint on this map. */
export function siloBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const s = SILO_SITES[mapId];
  if (!s || !g.animals.silo) return false;
  return (
    x >= s.x &&
    x < s.x + SILO_FOOTPRINT.w &&
    y >= s.y &&
    y < s.y + SILO_FOOTPRINT.h
  );
}

/** True if a tile is part of the built stable's footprint on this map. The whole of it blocks. */
export function stableBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const s = siteOf(g, "stable", mapId);
  if (!s || !g.animals.stableBuilt) return false;
  return (
    x >= s.x &&
    x < s.x + STABLE_FOOTPRINT.w &&
    y >= s.y &&
    y < s.y + STABLE_FOOTPRINT.h
  );
}

/** Where the horse waits beside the stable: the tile in front of it. */
export function stableHome(g: GameState, mapId: string) {
  const s = siteOf(g, "stable", mapId);
  if (!s || !g.animals.stableBuilt) return undefined;
  return { x: s.x + FOOTPRINTS.stable.doorX, y: s.y + STABLE_FOOTPRINT.h };
}

/** True if a tile is part of the built barn's footprint on this map, other than its door tile. */
export function barnBlocks(
  g: GameState,
  mapId: string,
  x: number,
  y: number,
): boolean {
  const s = siteOf(g, "barn", mapId);
  if (!s || !g.animals.barnBuilt) return false;
  if (x === s.x + 3 && y === s.y + BARN_FOOTPRINT.h - 1) return false;
  return (
    x >= s.x &&
    x < s.x + BARN_FOOTPRINT.w &&
    y >= s.y &&
    y < s.y + BARN_FOOTPRINT.h
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

/** The words for what the carpenter lacks, or undefined if the buyer has it all. */
function shortOf(g: GameState, cost: BuildCost): string | undefined {
  const missing: string[] = [];
  if (g.money < cost.coin) missing.push(`${cost.coin - g.money}g more`);
  const wood = g.inventory.count("wood");
  if (wood < cost.wood) missing.push(`${cost.wood - wood} more wood`);
  const hardwood = g.inventory.count(HARDWOOD);
  if (cost.hardwood !== undefined && hardwood < cost.hardwood)
    missing.push(`${cost.hardwood - hardwood} more hardwood`);
  const stone = g.inventory.count("stone");
  if (stone < cost.stone) missing.push(`${cost.stone - stone} more stone`);
  const iron = g.inventory.count(IRON_BAR);
  if (cost.iron !== undefined && iron < cost.iron)
    missing.push(`${cost.iron - iron} more iron bars`);
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

function pay(g: GameState, cost: BuildCost) {
  if (cost.iron) g.inventory.remove(IRON_BAR, cost.iron);
  g.money -= cost.coin;
  g.inventory.remove("wood", cost.wood);
  if (cost.hardwood) g.inventory.remove(HARDWOOD, cost.hardwood);
  g.inventory.remove("stone", cost.stone);
}

/** Why the base building cannot be ordered now, or undefined if it can. */
export function buildingProblem(g: GameState, b: Building): string | undefined {
  const info = BUILDINGS[b];
  if (isBuilt(g.animals, b)) return `You already have a ${info.noun}.`;
  if (g.animals.build)
    return g.animals.build.building === b
      ? `The carpenter is already building your ${info.noun}.`
      : `The carpenter is busy with your ${g.animals.build.building}.`;
  if (g.houseBuild) return "The carpenter is busy with your house.";
  if (g.animals.siloDays > 0) return "The carpenter is busy with your silo.";
  return shortOf(g, info.cost);
}

/** Pay for a base building and start the build. Returns false if it cannot. */
export function orderBuilding(g: GameState, b: Building): boolean {
  if (buildingProblem(g, b) !== undefined) return false;
  pay(g, BUILDINGS[b].cost);
  g.animals.build = { daysLeft: BUILDINGS[b].days, tier: 1, building: b };
  return true;
}

/**
 * One morning of the carpenter's animal-building job, after the clock moved
 * on. A festival day does not count, as for the house. Returns the building
 * that opens this morning, if one does.
 */
export function advanceBuilding(g: GameState): Building | undefined {
  const b = g.animals.build;
  if (!b || festivalDayToday(g.day.clock.day)) return undefined;
  b.daysLeft -= 1;
  if (b.daysLeft > 0) return undefined;
  g.animals.build = undefined;
  if (b.building === "barn") {
    g.animals.barnBuilt = true;
    g.animals.barnTier = b.tier;
  } else if (b.building === "stable") {
    g.animals.stableBuilt = true;
  } else {
    g.animals.coopBuilt = true;
    g.animals.tier = b.tier;
  }
  return b.building;
}

/** The upgrade the carpenter would build next, or undefined at the deluxe tier or with no building. */
export function nextBuildingUpgrade(g: GameState, b: Building) {
  if (!isBuilt(g.animals, b)) return undefined;
  return BUILDINGS[b].upgrades[tierOf(g.animals, b) + 1];
}

/** Why a building cannot be upgraded now, or undefined if it can. One job at a time. */
export function upgradeProblem(g: GameState, b: Building): string | undefined {
  const info = BUILDINGS[b];
  if (!isBuilt(g.animals, b)) return `You need a ${info.noun} first.`;
  const up = nextBuildingUpgrade(g, b);
  if (!up) return `The ${info.noun} is as big as it gets.`;
  if (g.animals.build)
    return g.animals.build.building === b
      ? `The carpenter is already working on your ${info.noun}.`
      : `The carpenter is busy with your ${g.animals.build.building}.`;
  if (g.houseBuild) return "The carpenter is busy with your house.";
  if (g.animals.siloDays > 0) return "The carpenter is busy with your silo.";
  return shortOf(g, up);
}

/** Pay for the next tier. It lands overnight; the outside never changes. */
export function orderBuildingUpgrade(g: GameState, b: Building): boolean {
  if (upgradeProblem(g, b) !== undefined) return false;
  pay(g, nextBuildingUpgrade(g, b)!);
  g.animals.build = {
    daysLeft: BUILDINGS[b].days,
    tier: tierOf(g.animals, b) + 1,
    building: b,
  };
  return true;
}

/** The coop forms of the above, from slice 1 and 2. */
export const coopProblem = (g: GameState) => buildingProblem(g, "coop");
export const orderCoop = (g: GameState) => orderBuilding(g, "coop");
export const nextCoopUpgrade = (g: GameState) => nextBuildingUpgrade(g, "coop");
export const coopUpgradeProblem = (g: GameState) => upgradeProblem(g, "coop");
export const orderCoopUpgrade = (g: GameState) =>
  orderBuildingUpgrade(g, "coop");
/** Advance the carpenter's job. True on the morning a coop opens or grows. */
export const advanceCoop = (g: GameState) => advanceBuilding(g) === "coop";

/** The barn forms. */
export const barnProblem = (g: GameState) => buildingProblem(g, "barn");
export const orderBarn = (g: GameState) => orderBuilding(g, "barn");
export const nextBarnUpgrade = (g: GameState) => nextBuildingUpgrade(g, "barn");
export const barnUpgradeProblem = (g: GameState) => upgradeProblem(g, "barn");
export const orderBarnUpgrade = (g: GameState) =>
  orderBuildingUpgrade(g, "barn");

/** Why an animal cannot be bought now, or undefined if it can. */
export function animalProblem(
  g: GameState,
  species: Species = "chicken",
): string | undefined {
  const info = SPECIES[species];
  const home = BUILDINGS[info.building];
  const tier = tierOf(g.animals, info.building);
  if (!isBuilt(g.animals, info.building))
    return `You need a ${home.noun} first.`;
  if (tier < info.tier)
    return `${info.name}s need the ${home.upgrades[info.tier]?.name.toLowerCase() ?? home.noun}.`;
  if (animalsIn(g, info.building).length >= capacityOf(info.building, tier))
    return `The ${home.noun} is full.`;
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
    grazed: false,
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

/** Hay the silo can hold: 0 until it is built. */
export function siloCapacity(g: GameState): number {
  return g.animals.silo ? SILO_CAPACITY : 0;
}

/** Put hay in the silo, up to its size. Returns how much went in; 0 with no silo. */
export function addHay(g: GameState, n: number): number {
  const put = Math.max(0, Math.min(n, siloCapacity(g) - g.animals.hay));
  g.animals.hay += put;
  return put;
}

/** Move hay from the pack into the silo, up to what it has room for. Returns how many bales went in. */
export function depositHay(g: GameState, n = Infinity): number {
  const put = Math.min(
    n,
    g.inventory.count(HAY),
    siloCapacity(g) - g.animals.hay,
  );
  if (put <= 0) return 0;
  g.inventory.remove(HAY, put);
  g.animals.hay += put;
  return put;
}

/** Buy hay at the placeholder shop row, into the pack. Returns the amount bought, 0 if refused. */
export function buyHay(g: GameState, n: number): number {
  const count = Math.min(n, Math.floor(g.money / HAY_PRICE));
  let got = 0;
  while (got < count && g.inventory.add(HAY)) got += 1;
  g.money -= got * HAY_PRICE;
  return got;
}

/** Why the silo cannot be ordered now, or undefined if it can. */
export function siloProblem(g: GameState): string | undefined {
  if (g.animals.silo) return "You already have a silo.";
  if (g.animals.siloDays > 0) return "The carpenter is already building it.";
  if (g.animals.build)
    return `The carpenter is busy with your ${g.animals.build.building}.`;
  if (g.houseBuild) return "The carpenter is busy with your house.";
  const missing: string[] = [];
  if (g.money < SILO_COST.coin)
    missing.push(`${SILO_COST.coin - g.money}g more`);
  for (const id of ["stone", "clay", "copper-bar"] as const) {
    const need = SILO_COST[id];
    const have = g.inventory.count(id);
    if (have < need)
      missing.push(
        `${need - have} more ${itemById(id)?.name.toLowerCase() ?? id}`,
      );
  }
  return missing.length > 0 ? `You need ${missing.join(" and ")}.` : undefined;
}

/** Pay for the silo and start the job. Returns false if it cannot. */
export function orderSilo(g: GameState): boolean {
  if (siloProblem(g) !== undefined) return false;
  g.money -= SILO_COST.coin;
  for (const id of ["stone", "clay", "copper-bar"] as const)
    g.inventory.remove(id, SILO_COST[id]);
  g.animals.siloDays = SILO_BUILD_DAYS;
  return true;
}

/** One morning of the silo job. A festival day does not count. True on the morning it opens. */
export function advanceSilo(g: GameState): boolean {
  if (g.animals.siloDays <= 0 || festivalDayToday(g.day.clock.day))
    return false;
  g.animals.siloDays -= 1;
  if (g.animals.siloDays > 0) return false;
  g.animals.silo = true;
  return true;
}

/**
 * Put hay out for every animal that is in and not yet fed, in one building or
 * all. The hopper draws on the silo first. With `fromPack` the farmer drops
 * hay from the pack when the silo has none; the night auto-feeder does not.
 * Returns how many ate and how many went without for lack of hay.
 */
export function feedAll(
  g: GameState,
  building?: Building,
  fromPack = true,
): { fed: number; short: number } {
  let fed = 0;
  let short = 0;
  for (const a of g.animals.animals) {
    if (building && SPECIES[a.species].building !== building) continue;
    if (a.fed || a.outside) continue;
    if (g.animals.hay > 0) g.animals.hay -= 1;
    else if (!(fromPack && g.inventory.remove(HAY, 1))) {
      short += 1;
      continue;
    }
    a.fed = true;
    fed += 1;
  }
  return { fed, short };
}

/** Pet an animal: friendship and mood, once a day. Returns false if already petted. */
export function pet(g: GameState, id: number): boolean {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a || a.petted) return false;
  a.petted = true;
  a.friendship = clamp(
    a.friendship + friendshipGain(g, a, PET_FRIENDSHIP),
    0,
    MAX_FRIENDSHIP,
  );
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
  a.grazed = true;
  if (!a.fed) {
    a.fed = true;
    a.friendship = clamp(
      a.friendship + friendshipGain(g, a, GRASS_FRIENDSHIP),
      0,
      MAX_FRIENDSHIP,
    );
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

/**
 * Take what an animal left into the pack: its product, then any Moonwool beside
 * it. A full pack keeps whatever did not fit. Returns the item ids, or why not.
 */
export function collect(
  g: GameState,
  id: number,
): { item: string; also?: string } | { problem: string } {
  const a = g.animals.animals.find((x) => x.id === id);
  if (!a?.product && !a?.bonus) return { problem: "Nothing to take there." };
  let item: string | undefined;
  if (a.product) {
    item = withQuality(a.item ?? SPECIES[a.species].item, a.product);
    if (!g.inventory.add(item)) return { problem: "Your pack is full." };
    a.product = undefined;
  }
  let also: string | undefined;
  if (a.bonus) {
    const moon = withQuality(MOONWOOL, a.bonus);
    if (g.inventory.add(moon)) {
      also = moon;
      a.bonus = undefined;
    } else if (!item) return { problem: "Your pack is full." };
  }
  return { item: item ?? also!, also: item ? also : undefined };
}

/** Why an egg cannot go in the incubator now, or undefined if it can. */
export function incubatorProblem(
  g: GameState,
  egg: string,
): string | undefined {
  if (!g.animals.coopBuilt || g.animals.tier < INCUBATOR_TIER)
    return "The incubator comes with the big coop.";
  if (HATCHES[egg] === undefined) return "Only eggs hatch.";
  if (g.animals.incubator) return "The incubator is already full.";
  if (animalProblemRoom(g, HATCHES[egg]!) !== undefined)
    return "The coop is full, so there is no room for a hatchling.";
  if (!packEgg(g, egg)) return "You have no such egg.";
  return undefined;
}

function animalProblemRoom(g: GameState, species: Species): string | undefined {
  const b = SPECIES[species].building;
  return animalsIn(g, b).length >= capacityOf(b, tierOf(g.animals, b))
    ? "full"
    : undefined;
}

/** The pack's id for an egg of this kind at any quality, if it holds one. */
function packEgg(g: GameState, egg: string): string | undefined {
  for (let i = 0; i < g.inventory.size; i++) {
    const slot = g.inventory.slot(i);
    if (slot && splitQuality(slot.id).base === egg) return slot.id;
  }
  return undefined;
}

/** Put an egg from the pack into the incubator. Returns false if it cannot. */
export function putEgg(g: GameState, egg: string): boolean {
  if (incubatorProblem(g, egg) !== undefined) return false;
  const id = packEgg(g, egg)!;
  g.inventory.remove(id, 1);
  g.animals.incubator = { egg, daysLeft: incubateDays(g) };
  return true;
}

/** What the night did, for the morning report. */
export interface AnimalNews {
  /** Coop animals that made something tonight (eggs, feathers, wool). */
  eggs: number;
  /** Barn animals that made something tonight (milk, wool, truffles). */
  barn: number;
  /** Animals that went unfed. */
  unfed: number;
  /** Animals that slept outside. */
  outside: number;
  /** Names of chicks that grew up tonight. */
  grown: string[];
  /** Names of young animals hatched tonight. */
  hatched: string[];
  /** True if an egg is ready but the coop has no room. */
  hatchWaiting: boolean;
}

/**
 * The night's tick, run once in the day-end step. Unfed animals make nothing
 * and lose friendship and mood. One left outside loses half its mood and the
 * day's egg, nothing else: nothing is lost or hurt. A grown, fed animal that
 * slept in lays an egg if its mood allows (chance mood / 70 under 70), at a
 * quality from friendship and mood.
 */
export function endDay(g: GameState, random: () => number): AnimalNews {
  const news: AnimalNews = {
    eggs: 0,
    barn: 0,
    unfed: 0,
    outside: 0,
    grown: [],
    hatched: [],
    hatchWaiting: false,
  };
  // The deluxe coop's and barn's auto-feeders put hay out for everyone inside.
  if (g.animals.tier >= COOP_MAX_TIER) feedAll(g, "coop", false);
  if (g.animals.barnBuilt && g.animals.barnTier >= BARN_MAX_TIER)
    feedAll(g, "barn", false);
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
      const info = SPECIES[a.species];
      // A pig digs a truffle only on a day it was let out.
      const ready = !info.outdoors || (a.grazed && !sleptOut);
      if (a.lay >= productDays(g, a) && a.product === undefined && ready) {
        const chance = a.mood >= PRODUCT_MOOD ? 1 : a.mood / PRODUCT_MOOD;
        if (random() < chance) {
          a.product = animalQuality(
            a.friendship +
              (masterOf(g, info.building) ? MASTER_QUALITY_FRIENDSHIP : 0),
            a.mood,
          );
          a.item =
            a.species === "duck" &&
            a.friendship >= FEATHER_FRIENDSHIP &&
            random() < FEATHER_CHANCE
              ? FEATHER
              : undefined;
          a.lay = 0;
          if (info.building === "barn") news.barn += 1;
          else news.eggs += 1;
          // A well kept sheep may leave Moonwool beside its wool.
          if (
            a.species === "sheep" &&
            a.friendship >= MOONWOOL_FRIENDSHIP &&
            a.mood >= PRODUCT_MOOD &&
            random() < MOONWOOL_CHANCE
          )
            a.bonus = a.product;
        }
      }
    }
    a.fed = false;
    a.petted = false;
    a.outside = false;
    a.fresh = false;
    a.grazed = false;
  }
  hatch(g, news);
  return news;
}

/** One night of the incubator: it hatches into a young animal if the coop has room. */
function hatch(g: GameState, news: AnimalNews): void {
  const inc = g.animals.incubator;
  if (!inc) return;
  inc.daysLeft = Math.max(0, inc.daysLeft - 1);
  if (inc.daysLeft > 0) return;
  const species = HATCHES[inc.egg];
  if (!species || animalProblemRoom(g, species) !== undefined) {
    news.hatchWaiting = true;
    return;
  }
  const a: Animal = {
    id: g.animals.nextId++,
    species,
    name: defaultName(g),
    age: 0,
    friendship: 0,
    mood: START_MOOD,
    fed: false,
    petted: false,
    outside: false,
    fresh: true,
    grazed: false,
    lay: 0,
  };
  g.animals.animals.push(a);
  g.animals.incubator = undefined;
  news.hatched.push(a.name);
}

/** Lines for the morning report. */
export function animalReportLines(
  news: AnimalNews,
  coopFinished: boolean,
  barnFinished = false,
  siloFinished = false,
  stableFinished = false,
): string[] {
  const lines: string[] = [];
  if (coopFinished) lines.push("The carpenter has finished your coop.");
  if (barnFinished) lines.push("The carpenter has finished your barn.");
  if (siloFinished) lines.push("The carpenter has finished your silo.");
  if (stableFinished)
    lines.push(
      "The carpenter has finished your stable. Your horse is waiting.",
    );
  for (const n of news.grown) lines.push(`${n} has grown up.`);
  for (const n of news.hatched) lines.push(`${n} hatched in the coop.`);
  if (news.hatchWaiting)
    lines.push("The egg in the incubator is ready, but the coop is full.");
  if (news.barn > 0)
    lines.push(
      news.barn === 1
        ? "There is something waiting in the barn."
        : `There are ${news.barn} things waiting in the barn.`,
    );
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
    lines.push("Some animals slept outside. They are back inside.");
  return lines;
}
