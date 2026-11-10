import { cropById } from "./crops";
import { FARM_STORE, GREENHOUSE_STORE } from "./mapstore";
import {
  MAX_SITE,
  loadAnimals,
  newAnimals,
  saveAnimals,
  type AnimalsState,
} from "./animals";
import { Day } from "./day";
import { Farm } from "./farm";
import { Trees, type Tree } from "./trees";
import { GroundItems, type Pile } from "./ground";
import { Weeds, type Weed } from "./weeds";
import { Twigs, type Twig } from "./debris";
import { Orders, orderById, type OrdersSave } from "./orders";
import { Rocks, type Rock, ROCK_KINDS } from "./rocks";
import { Mines, type MinesSave } from "./mines";
import { Combat, type CombatSave } from "./combat";
import type { CreatureSave } from "./creatures";
import { FruitTrees, fruitTreeById, type PlacedFruitTree } from "./fruittrees";
import { Sprinklers, sprinklerById, type PlacedSprinkler } from "./sprinklers";
import { QUALITIES, type Quality } from "./quality";
import { Casks, CASK_LIMIT, caskTakes, type PlacedCask } from "./cask";
import { Machines, type MachineJob, type PlacedMachine } from "./machines";
import { FarmCave, type CaveSave } from "./cave";
import { machineById } from "./processing";
import { Furnace, type FurnaceSave } from "./furnace";
import { Chests, type ChestSave } from "./chests";
import {
  Achievements,
  checkAchievements,
  type AchievementsSave,
} from "./achievements";
import { SummitCall, type SummitSave } from "./summit";
import { ShippingBin, type BinLine, type BinSave } from "./shipping";
import { maps } from "../content/maps";
import { DEFAULT_FARM_TYPE, farmTypeById } from "./farmtypes";
import { ForageField } from "./forage";
import { homeWorld, newAreas, type World } from "./areas";
import { type Weather, WEATHERS } from "./weather";
import { Hall, type HallProgress } from "./bundles";
import { Inventory } from "./inventory";
import { Skills, SKILLS, type Skill } from "./skills";
import { professionById } from "./professions";
import { Decor, type DecorSave } from "./decor";
import { Furniture, migrateCatalogue, type FurnitureSave } from "./furniture";
import { Mailbox, type MailEntry } from "./mail";
import { Quests, type QuestsSave } from "./quests";
import { FishLog, type FishingSave } from "./fishing";
import { Tackle, type TackleSave } from "./tackle";
import { Pots, type PotsSave } from "./pots";
import { Wardrobe, type WardrobeSave } from "./hats";
import {
  BUILD_DAYS,
  HOUSE_LAYOUT,
  MAX_HOUSE_TIER,
  CELLAR_MAP,
  type HouseBuild,
} from "./house";
import {
  UPGRADABLE,
  MAX_TIER,
  type ToolOrder,
  type ToolTiers,
  type Upgradable,
} from "./upgrades";

/** Everything the player owns and has done. The scene holds one of these. */
export interface GameState {
  /** The farm type id, chosen at a new game and never changed (`core/farmtypes.ts`). */
  farmType: string;
  day: Day;
  money: number;
  inventory: Inventory;
  farm: Farm;
  /** Trees and stumps on the farm. */
  trees: Trees;
  /** Goods that did not fit the backpack, waiting to be picked up. */
  ground: GroundItems;
  /** Weeds on the farm. */
  weeds: Weeds;
  /** Twigs on the farm, cleared with any tool for wood. */
  twigs: Twigs;
  /** Special Orders: the board, accepted orders and what is done. */
  orders: Orders;
  /** Rocks on the farm, broken with the pickaxe. */
  rocks: Rocks;
  /** The mine: deepest floor, dry streak, today's floors. */
  mines: Mines;
  /** Sprinklers standing on the farm (the open farm's store, `mapstore.ts`). */
  sprinklers: Sprinklers;
  /** Fruit trees planted on the farm. */
  fruitTrees: FruitTrees;
  /** Sprinklers on the greenhouse border and in its plot. */
  greenhouseSprinklers: Sprinklers;
  /** Fruit trees planted in the greenhouse: they bear in any season. */
  greenhouseFruitTrees: FruitTrees;
  /** Where the repaired greenhouse stands, once moved at the carpenter. Unset: its ruin site. */
  greenhouseSite?: { x: number; y: number };
  /** World flags that are up, such as `secret-log-cleared` (`core/worldflags.ts`). Absent until one is. */
  flags?: string[];
  /**
   * The worlds of the area maps by map id (`areas.ts`): their trees, rocks,
   * weeds, twigs and goods on the ground. The fields above are the farm's, or
   * the area's while `away` is set.
   */
  areas: Record<string, World>;
  /** Set while the player is in an area: which one, and the farm's world set aside. */
  away?: { mapId: string; home: World };
  /** Machines standing on the farm. */
  machines: Machines;
  /** The greenhouse's soil: grows in any season (note 31). */
  greenhouse: Farm;
  /** The casks in the cellar (note 24). */
  casks: Casks;
  /** The furnace the smith gives. */
  furnace: Furnace;
  /** Goods shipped today, paid when the day ends. */
  bin: ShippingBin;
  skills: Skills;
  /** Tier of the hoe and can, 0 for basic. */
  toolTiers: ToolTiers;
  /** The tool the smith is upgrading, if any. */
  toolOrder: ToolOrder | undefined;
  hall: Hall;
  /** House tier, 0 for the start room only. */
  houseTier: number;
  /** Owns the Furniture Catalogue (note 41). */
  catalogue: boolean;
  /** The map the last save was made on, kept only for the cellar (`resumeAt`). */
  resumeMap?: string;
  /** The upgrade the carpenter is building, if any. */
  houseBuild: HouseBuild | undefined;
  /** The coop, its animals and the hay silo (note 23). */
  animals: AnimalsState;
  /** Today's weather. */
  weather: Weather;
  /** Tomorrow's weather, known a day ahead (the forecast). */
  tomorrow: Weather;
  /** True once the end screen has been shown, so it shows only once. */
  endSeen: boolean;
  /** Festivals joined, as `joinKey` strings. */
  festivalsJoined: string[];
  /** Show tokens from the Harvest Showing, good for the year they were won. */
  showTokens: { year: number; count: number };
  /** The farm cave: earnings, the offer and what grows there. */
  cave: FarmCave;
  /** Hats owned and worn. */
  wardrobe: Wardrobe;
  /** Furniture placed in the house. */
  furniture: Furniture;
  /** Wallpaper and flooring per house room (note 10). */
  decor: Decor;
  /** Chests standing on the farm and in the house. */
  chests: Chests;
  /** Achievements earned and the different recipes crafted. */
  achievements: Achievements;
  /** The steward's call to the hall after the summit, and the scene owed (note 39). */
  summit: SummitCall;
  /** Letters sent, delivered and taken (note 51). */
  mail: Mailbox;
  /** Board requests taken and finished (note 50). */
  quests: Quests;
  /** Fish caught, with the longest of each (note 21). */
  fishing: FishLog;
  /** Bait and lures on each rod (note 21). */
  tackle: Tackle;
  /** Shellfish pots on the water, and the shellfish landed. */
  pots: Pots;
  /** Health, the trainer and the kill tally (note 22). */
  combat: Combat;
  /** Wild goods on the ground today. Not saved: it respawns each morning. */
  forage: ForageField;
}

/** Starting cash for a new game. */
export const START_MONEY = 500;

export function newGame(farmType: string = DEFAULT_FARM_TYPE): GameState {
  const farmMap = maps.get(farmTypeById(farmType).map);
  return {
    farmType: farmTypeById(farmType).id,
    day: new Day(),
    money: START_MONEY,
    inventory: new Inventory(),
    farm: new Farm(),
    greenhouse: new Farm(true),
    trees: new Trees(farmMap.trees),
    ground: new GroundItems(),
    weeds: new Weeds(),
    twigs: new Twigs(),
    orders: new Orders(),
    rocks: new Rocks(farmMap.rocks),
    mines: new Mines(),
    sprinklers: new Sprinklers(),
    fruitTrees: new FruitTrees(),
    greenhouseSprinklers: new Sprinklers(),
    greenhouseFruitTrees: new FruitTrees(),
    machines: new Machines(),
    casks: new Casks(),
    furnace: new Furnace(),
    bin: new ShippingBin(),
    skills: new Skills(),
    toolTiers: { hoe: 0, can: 0, pickaxe: 0, axe: 0 },
    toolOrder: undefined,
    hall: new Hall(),
    houseTier: 0,
    catalogue: false,
    houseBuild: undefined,
    animals: newAnimals(),
    weather: "sunny",
    tomorrow: "sunny",
    endSeen: false,
    festivalsJoined: [],
    showTokens: { year: 0, count: 0 },
    cave: new FarmCave(),
    wardrobe: new Wardrobe(),
    furniture: new Furniture(),
    decor: new Decor(),
    chests: new Chests(),
    achievements: new Achievements(),
    summit: new SummitCall(),
    mail: new Mailbox(),
    quests: new Quests(),
    fishing: new FishLog(),
    tackle: new Tackle(),
    pots: new Pots(),
    combat: new Combat(),
    forage: new ForageField(),
    areas: newAreas(),
  };
}

export const SAVE_VERSION = 2;

interface SaveData {
  version: number;
  /** Absent in saves made before farm types: Standard. */
  farmType?: string;
  day: number;
  energy: number;
  /** Minutes since midnight. Absent in saves made before the clock was saved. */
  minutes?: number;
  money: number;
  inventory: ReturnType<Inventory["save"]>;
  farm: ReturnType<Farm["save"]>;
  /** Absent in saves made before trees existed: the map's starting trees. */
  trees?: Tree[];
  /** Absent in saves made before goods could lie on the ground. */
  ground?: Pile[];
  /** Absent in saves made before weeds existed. */
  weeds?: Weed[];
  /** Absent in saves made before seasonal debris. */
  twigs?: Twig[];
  /** Absent in saves made before Special Orders. */
  orders?: OrdersSave;
  /** Absent in saves made before the mines: the map's starting rocks. */
  rocks?: Rock[];
  /** Absent in saves made before the mines. */
  mines?: MinesSave;
  /**
   * Sprinklers and fruit trees by map id (`mapstore.ts`). Absent in saves made
   * before the greenhouse took them: those hold the farm's in `sprinklers` and
   * `fruitTrees` below, which load as the farm's.
   */
  mapItems?: Record<
    string,
    { sprinklers?: PlacedSprinkler[]; fruitTrees?: PlacedFruitTree[] }
  >;
  /** Old saves only: the farm's sprinklers, before `mapItems`. */
  sprinklers?: PlacedSprinkler[];
  /** Old saves only: the farm's fruit trees, before `mapItems`. */
  fruitTrees?: PlacedFruitTree[];
  /** Absent until the greenhouse is moved. */
  greenhouseSite?: { x: number; y: number };
  /** Absent until a world flag is raised. */
  flags?: string[];
  /** Absent in saves made before the Forest: each area's starting world. */
  areas?: Record<string, AreaSave>;
  /** Absent in saves made before machines. */
  machines?: PlacedMachine[];
  /** Absent in saves made before the greenhouse. */
  greenhouse?: ReturnType<Farm["save"]>;
  /** Absent in saves made before casks. */
  casks?: PlacedCask[];
  /** Absent in saves made before the mines. */
  furnace?: FurnaceSave;
  /** Absent in saves made before the shipping bin. */
  bin?: BinSave;
  skills: ReturnType<Skills["save"]>;
  hall: HallProgress;
  /** Absent in saves made before professions existed. */
  professions?: ReturnType<Skills["saveProfessions"]>;
  /** The level 10 professions. Absent in older saves. */
  topProfessions?: ReturnType<Skills["saveTopProfessions"]>;
  /** Absent in saves made before tool upgrades existed. */
  toolTiers?: ToolTiers;
  /** Absent when no tool is at the smith, and in older saves. */
  toolOrder?: ToolOrder;
  /** Absent in saves made before the house had tiers. */
  houseTier?: number;
  /** Absent in saves made before the catalogue. */
  catalogue?: boolean;
  /** Absent unless the save was made in the cellar. */
  resumeMap?: string;
  /** Absent when no upgrade is being built, and in older saves. */
  houseBuild?: HouseBuild;
  /** Absent in saves made before animals. */
  animals?: AnimalsState;
  weather: Weather;
  /** Absent in saves made before the forecast existed. */
  tomorrow?: Weather;
  /** Absent in saves made before the end screen existed. */
  endSeen?: boolean;
  /** Absent in saves made before festivals existed. */
  festivalsJoined?: string[];
  /** Absent in saves made before the Harvest Showing. */
  showTokens?: { year: number; count: number };
  /** Absent in saves made before the farm cave. */
  cave?: CaveSave;
  /** Absent in saves made before hats. */
  wardrobe?: WardrobeSave;
  /** The house map frame (`HOUSE_LAYOUT`). Absent in saves made before the house grew in one map. */
  houseLayout?: number;
  /** Absent in saves made before furniture. */
  furniture?: FurnitureSave;
  /** Absent in saves made before wallpaper and flooring. */
  decor?: DecorSave;
  /** Absent in saves made before chests. */
  chests?: ChestSave[];
  /** Absent in saves made before achievements. */
  achievements?: AchievementsSave;
  /** Absent in saves made before the summit call. */
  summit?: SummitSave;
  /** Absent in saves made before mail. */
  mail?: MailEntry[];
  /** Absent in saves made before the request board. */
  quests?: QuestsSave;
  /** Absent in saves made before fishing. */
  fishing?: FishingSave;
  /** Absent in saves made before bait and lures. */
  tackle?: TackleSave;
  /** Absent in saves made before shellfish pots. */
  pots?: PotsSave;
  /** Absent in saves made before combat: full health, no trainer yet. */
  combat?: CombatSave;
}

/** One area's saved world. Forage is not saved: it respawns each morning. */
interface AreaSave {
  trees?: Tree[];
  ground?: Pile[];
  weeds?: Weed[];
  twigs?: Twig[];
  rocks?: Rock[];
}

/** Where saves live. The scene supplies one backed by the browser. */
export interface SaveStore {
  read(): string | null;
  write(text: string): void;
}

/** The sprinklers of a saved list that are well formed. */
function validSprinklers(raw: unknown): PlacedSprinkler[] {
  return Array.isArray(raw)
    ? raw.filter(
        (s): s is PlacedSprinkler =>
          isObject(s) &&
          Number.isInteger(s.x) &&
          Number.isInteger(s.y) &&
          typeof s.id === "string" &&
          sprinklerById(s.id) !== undefined,
      )
    : [];
}

/** The fruit trees of a saved list that are well formed, with fruit and hits tidied. */
function validFruitTrees(raw: unknown): PlacedFruitTree[] {
  return Array.isArray(raw)
    ? raw
        .filter(
          (t): t is PlacedFruitTree =>
            isObject(t) &&
            Number.isInteger(t.x) &&
            Number.isInteger(t.y) &&
            typeof t.id === "string" &&
            fruitTreeById(t.id) !== undefined &&
            Number.isInteger(t.age),
        )
        .map((t) => ({
          ...t,
          age: Math.max(t.age, 0),
          fruit: Number.isInteger(t.fruit) ? Math.max(t.fruit, 0) : 0,
          hits: 0,
        }))
    : [];
}

/** The trees of a saved list that are well formed. */
function validTrees(raw: unknown[]): Tree[] {
  return raw.filter(
    (t): t is Tree =>
      isObject(t) &&
      Number.isInteger(t.x) &&
      Number.isInteger(t.y) &&
      Number.isInteger(t.stage) &&
      (t.stage as number) >= 1 &&
      (t.stage as number) <= 5 &&
      typeof t.stump === "boolean" &&
      typeof t.seed === "boolean" &&
      isCount(t.hits) &&
      (t.large === undefined || typeof t.large === "boolean") &&
      (t.regrow === undefined || isCount(t.regrow)),
  );
}

/** The piles of goods of a saved list that are well formed. */
function validPiles(raw: unknown[]): Pile[] {
  return raw.filter(
    (p): p is Pile =>
      isObject(p) &&
      Number.isInteger(p.x) &&
      Number.isInteger(p.y) &&
      typeof p.id === "string" &&
      isCount(p.count) &&
      (p.count as number) > 0,
  );
}

function validWeeds(raw: unknown[]): Weed[] {
  return raw.filter(
    (w): w is Weed =>
      isObject(w) && Number.isInteger(w.x) && Number.isInteger(w.y),
  );
}

function validTwigs(raw: unknown[]): Twig[] {
  return raw.filter(
    (t): t is Twig =>
      isObject(t) && Number.isInteger(t.x) && Number.isInteger(t.y),
  );
}

/** Save as text, including the time of day, so a reload mid day resumes it. */
export function serialize(g: GameState): string {
  // The farm's world is saved as the top-level fields, even from inside an area.
  const home = homeWorld(g);
  const data: SaveData = {
    version: SAVE_VERSION,
    farmType: g.farmType,
    day: g.day.clock.day,
    energy: g.day.energy.current,
    minutes: g.day.clock.minutes,
    money: g.money,
    inventory: g.inventory.save(),
    farm: home.farm.save(),
    greenhouse: g.greenhouse.save(),
    trees: home.trees.save(),
    ground: home.ground.save(),
    weeds: home.weeds.save(),
    twigs: home.twigs.save(),
    orders: g.orders.save(),
    rocks: home.rocks.save(),
    mines: g.mines.save(),
    mapItems: {
      [FARM_STORE]: {
        sprinklers: home.sprinklers.save(),
        fruitTrees: home.fruitTrees.save(),
      },
      [GREENHOUSE_STORE]: {
        sprinklers: g.greenhouseSprinklers.save(),
        fruitTrees: g.greenhouseFruitTrees.save(),
      },
    },
    ...(g.greenhouseSite ? { greenhouseSite: { ...g.greenhouseSite } } : {}),
    ...(g.flags?.length ? { flags: [...g.flags] } : {}),
    areas: Object.fromEntries(
      Object.entries(g.areas).map(([id, w]) => [
        id,
        {
          trees: w.trees.save(),
          ground: w.ground.save(),
          weeds: w.weeds.save(),
          twigs: w.twigs.save(),
          rocks: w.rocks.save(),
        },
      ]),
    ),
    machines: home.machines.save(),
    casks: g.casks.save(),
    furnace: g.furnace.save(),
    bin: g.bin.save(),
    skills: g.skills.save(),
    professions: g.skills.saveProfessions(),
    topProfessions: g.skills.saveTopProfessions(),
    hall: g.hall.save(),
    toolTiers: { ...g.toolTiers },
    toolOrder: g.toolOrder ? { ...g.toolOrder } : undefined,
    houseTier: g.houseTier,
    catalogue: g.catalogue,
    resumeMap: g.resumeMap,
    houseBuild: g.houseBuild ? { ...g.houseBuild } : undefined,
    animals: saveAnimals(g.animals),
    weather: g.weather,
    tomorrow: g.tomorrow,
    endSeen: g.endSeen,
    festivalsJoined: [...g.festivalsJoined],
    showTokens: { ...g.showTokens },
    cave: g.cave.save(),
    wardrobe: g.wardrobe.save(),
    houseLayout: HOUSE_LAYOUT,
    furniture: g.furniture.save(),
    decor: g.decor.save(),
    chests: g.chests.save(),
    achievements: g.achievements.save(),
    summit: g.summit.save(),
    mail: g.mail.save(),
    quests: g.quests.save(),
    fishing: g.fishing.save(),
    tackle: g.tackle.save(),
    pots: g.pots.save(),
    combat: g.combat.save(),
  };
  return JSON.stringify(data);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

const isSpot = (v: unknown): v is { x: number; y: number } =>
  isObject(v) && Number.isInteger(v.x) && Number.isInteger(v.y);

/** The valid rocks in saved data. */
function rocksFrom(list: unknown[]): Rock[] {
  return list.filter(
    (r): r is Rock =>
      isSpot(r) &&
      ROCK_KINDS.includes((r as unknown as Rock).kind) &&
      isCount((r as unknown as Rock).hits),
  );
}

/**
 * Load a save. Returns undefined for anything that is not a valid save of
 * this version, so a corrupt or old file never crashes the game.
 */
/** The input a machine job remembers, if it is well formed. */
function savedInput(raw: unknown): MachineJob["input"] {
  if (!isObject(raw) || typeof raw.item !== "string" || !isCount(raw.use))
    return undefined;
  const also = raw.also;
  return {
    item: raw.item,
    use: raw.use,
    also:
      isObject(also) && typeof also.item === "string" && isCount(also.use)
        ? { item: also.item, use: also.use }
        : undefined,
  };
}

/** The orders record in a save, if it is well formed. Anything else loads as a fresh board. */
function savedOrders(raw: unknown): OrdersSave | undefined {
  if (!isObject(raw) || typeof raw.opened !== "boolean") return undefined;
  if (!Array.isArray(raw.active) || !Array.isArray(raw.owed)) return undefined;
  if (!isObject(raw.done) || !Number.isInteger(raw.lastAcceptedWeek))
    return undefined;
  const counts = (o: unknown): o is Record<string, number> =>
    isObject(o) && Object.values(o).every((n) => isCount(n));
  const active = raw.active.filter(
    (a): a is OrdersSave["active"][number] =>
      isObject(a) &&
      typeof a.id === "string" &&
      orderById(a.id) !== undefined &&
      isCount(a.accepted) &&
      isCount(a.due) &&
      counts(a.progress),
  );
  const owed = raw.owed.filter(
    (r): r is { id: string; count: number } =>
      isObject(r) && typeof r.id === "string" && isCount(r.count),
  );
  if (!counts(raw.done)) return undefined;
  return {
    opened: raw.opened,
    active,
    done: raw.done,
    lastAcceptedWeek: raw.lastAcceptedWeek as number,
    owed,
  };
}

export function deserialize(text: string): GameState | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isObject(raw) || raw.version !== SAVE_VERSION) return undefined;
  const { day, energy, money, inventory, farm, skills, hall, weather } = raw;
  if (!isCount(day) || day < 1 || !isCount(energy) || !isCount(money))
    return undefined;
  if (!WEATHERS.includes(weather as Weather)) return undefined;
  if (
    !Array.isArray(inventory) ||
    !isObject(farm) ||
    !isObject(skills) ||
    !isObject(hall)
  ) {
    return undefined;
  }
  for (const s of inventory) {
    if (
      s !== null &&
      !(isObject(s) && typeof s.id === "string" && isCount(s.count))
    ) {
      return undefined;
    }
  }
  // A save from before mining, fishing or combat has no row for it.
  if (
    !SKILLS.every(
      (k) =>
        isCount(skills[k]) ||
        ((k === "mining" || k === "fishing" || k === "combat") &&
          skills[k] === undefined),
    )
  )
    return undefined;
  if (
    !Object.values(hall).every(
      (v) =>
        Array.isArray(v) || (isObject(v) && Object.values(v).every(isCount)),
    )
  )
    return undefined;

  const g = newGame(
    typeof raw.farmType === "string" ? raw.farmType : DEFAULT_FARM_TYPE,
  );
  g.day.restore(day, energy, isCount(raw.minutes) ? raw.minutes : undefined);
  g.money = money;
  g.weather = weather as Weather;
  g.inventory.load(inventory as ReturnType<Inventory["save"]>);
  g.farm.load(farm as ReturnType<Farm["save"]>);
  if (isObject(raw.greenhouse)) {
    const plots = Object.entries(raw.greenhouse).filter(
      ([k, p]) =>
        /^\d+,\d+$/.test(k) &&
        isObject(p) &&
        p.tilled === true &&
        typeof p.wateredToday === "boolean" &&
        (p.crop === undefined ||
          (isObject(p.crop) &&
            typeof p.crop.id === "string" &&
            cropById(p.crop.id) !== undefined &&
            isCount(p.crop.daysGrown) &&
            isCount(p.crop.harvests))),
    );
    g.greenhouse.load(Object.fromEntries(plots) as ReturnType<Farm["save"]>);
  }
  g.skills.load(skills as ReturnType<Skills["save"]>);
  if (Array.isArray(raw.trees)) g.trees.load(validTrees(raw.trees));
  if (Array.isArray(raw.ground)) g.ground.load(validPiles(raw.ground));
  if (Array.isArray(raw.weeds)) g.weeds.load(validWeeds(raw.weeds));
  if (Array.isArray(raw.twigs)) g.twigs.load(validTwigs(raw.twigs));
  // An area missing from the save keeps its starting world.
  if (isObject(raw.areas))
    for (const [id, a] of Object.entries(raw.areas)) {
      const w = g.areas[id];
      if (!w || !isObject(a)) continue;
      if (Array.isArray(a.trees)) w.trees.load(validTrees(a.trees));
      if (Array.isArray(a.ground)) w.ground.load(validPiles(a.ground));
      if (Array.isArray(a.weeds)) w.weeds.load(validWeeds(a.weeds));
      if (Array.isArray(a.twigs)) w.twigs.load(validTwigs(a.twigs));
      if (Array.isArray(a.rocks)) w.rocks.load(rocksFrom(a.rocks));
    }
  const saved = savedOrders(raw.orders);
  if (saved) g.orders.load(saved);
  // Per-map items. An old save has the farm's two lists at the top level.
  const items = isObject(raw.mapItems) ? raw.mapItems : {};
  const farmItems = isObject(items[FARM_STORE])
    ? items[FARM_STORE]
    : { sprinklers: raw.sprinklers, fruitTrees: raw.fruitTrees };
  const houseItems = isObject(items[GREENHOUSE_STORE])
    ? items[GREENHOUSE_STORE]
    : {};
  g.sprinklers.load(validSprinklers(farmItems.sprinklers));
  g.greenhouseSprinklers.load(validSprinklers(houseItems.sprinklers));
  g.fruitTrees.load(validFruitTrees(farmItems.fruitTrees));
  g.greenhouseFruitTrees.load(validFruitTrees(houseItems.fruitTrees));
  if (
    isObject(raw.greenhouseSite) &&
    Number.isInteger(raw.greenhouseSite.x) &&
    Number.isInteger(raw.greenhouseSite.y)
  )
    g.greenhouseSite = {
      x: Math.min(Math.max(raw.greenhouseSite.x as number, 0), MAX_SITE),
      y: Math.min(Math.max(raw.greenhouseSite.y as number, 0), MAX_SITE),
    };
  if (Array.isArray(raw.flags)) {
    const flags = raw.flags.filter(
      (f): f is string => typeof f === "string" && f !== "",
    );
    if (flags.length > 0) g.flags = [...new Set(flags)];
  }
  if (Array.isArray(raw.machines)) {
    const valid: PlacedMachine[] = [];
    for (const m of raw.machines) {
      if (
        !isObject(m) ||
        !Number.isInteger(m.x) ||
        !Number.isInteger(m.y) ||
        typeof m.id !== "string" ||
        !machineById(m.id)
      )
        continue;
      const job = m.job;
      valid.push({
        x: m.x as number,
        y: m.y as number,
        id: m.id,
        job:
          isObject(job) &&
          typeof job.output === "string" &&
          isCount(job.count) &&
          isCount(job.doneAt)
            ? {
                output: job.output,
                count: job.count,
                doneAt: job.doneAt,
                input: savedInput(job.input),
              }
            : undefined,
      });
    }
    g.machines.load(valid);
  }
  if (Array.isArray(raw.casks)) {
    const valid: PlacedCask[] = [];
    for (const c of raw.casks) {
      if (!isObject(c) || !Number.isInteger(c.x) || !Number.isInteger(c.y))
        continue;
      const job = c.job;
      valid.push({
        x: c.x as number,
        y: c.y as number,
        job:
          isObject(job) &&
          typeof job.item === "string" &&
          caskTakes(job.item) &&
          QUALITIES.includes(job.quality as Quality) &&
          isCount(job.since)
            ? {
                item: job.item,
                quality: job.quality as Quality,
                since: job.since,
              }
            : undefined,
      });
    }
    g.casks.load(valid.slice(0, CASK_LIMIT));
  }
  if (Array.isArray(raw.rocks)) g.rocks.load(rocksFrom(raw.rocks));
  const mines = raw.mines;
  if (isObject(mines) && isObject(mines.floors)) {
    const floors: MinesSave["floors"] = {};
    for (const [n, f] of Object.entries(mines.floors)) {
      if (
        Number.isInteger(Number(n)) &&
        isObject(f) &&
        isCount(f.day) &&
        Array.isArray(f.rocks)
      )
        floors[Number(n)] = {
          day: f.day,
          rocks: rocksFrom(f.rocks),
          ...(isSpot(f.ladder)
            ? { ladder: { x: f.ladder.x, y: f.ladder.y } }
            : {}),
          // A save from before creatures has none, and the floor is given its own on load.
          ...(Array.isArray(f.creatures)
            ? {
                creatures: f.creatures.filter(
                  (c): c is CreatureSave =>
                    isObject(c) &&
                    typeof c.uid === "number" &&
                    typeof c.kind === "string" &&
                    typeof c.x === "number" &&
                    typeof c.y === "number" &&
                    typeof c.hp === "number",
                ),
              }
            : {}),
        };
    }
    g.mines.load({
      deepest: isCount(mines.deepest) ? Math.floor(mines.deepest) : 0,
      misses: isCount(mines.misses) ? Math.floor(mines.misses) : 0,
      copperHandedIn: mines.copperHandedIn === true,
      greeted: typeof mines.greeted === "boolean" ? mines.greeted : undefined,
      campTaken: isCount(mines.campTaken)
        ? Math.floor(mines.campTaken)
        : undefined,
      campDays: isObject(mines.campDays)
        ? Object.fromEntries(
            Object.entries(mines.campDays).filter(
              ([n, d]) => Number.isInteger(Number(n)) && isCount(d),
            ) as [string, number][],
          )
        : undefined,
      floors,
    });
  }
  const furnace = raw.furnace;
  if (isObject(furnace)) {
    const job = furnace.job;
    g.furnace.load({
      gifted: furnace.gifted === true,
      job:
        isObject(job) && typeof job.bar === "string" && isCount(job.doneAt)
          ? { bar: job.bar, doneAt: job.doneAt }
          : undefined,
    });
  }
  const bin = raw.bin;
  if (isObject(bin) && Array.isArray(bin.lines)) {
    const lines = bin.lines.filter(
      (l): l is BinLine =>
        isObject(l) &&
        typeof l.id === "string" &&
        Number.isInteger(l.count) &&
        (l.count as number) > 0 &&
        isCount(l.unit),
    );
    const shipped: Record<string, number> = {};
    if (isObject(bin.shipped))
      for (const [id, n] of Object.entries(bin.shipped))
        if (isCount(n)) shipped[id] = n;
    g.bin.load({ lines, shipped });
  }
  g.hall = new Hall(undefined, hall as HallProgress);
  if (isObject(raw.professions)) {
    const picked: Partial<Record<Skill, string>> = {};
    for (const k of SKILLS) {
      const id = raw.professions[k];
      if (typeof id === "string" && professionById(id)?.skill === k)
        picked[k] = id;
    }
    g.skills.loadProfessions(picked);
    // A level 10 pick only stands under the level 5 pick it grows from.
    const top: Partial<Record<Skill, string>> = {};
    if (isObject(raw.topProfessions))
      for (const k of SKILLS) {
        const id = raw.topProfessions[k];
        const def = typeof id === "string" ? professionById(id) : undefined;
        if (def?.skill === k && def.under && def.under === picked[k])
          top[k] = id as string;
      }
    g.skills.loadTopProfessions(top);
  }
  const tiers = raw.toolTiers;
  if (isObject(tiers)) {
    for (const t of UPGRADABLE) {
      const v = tiers[t];
      if (isCount(v)) g.toolTiers[t] = Math.min(Math.floor(v), MAX_TIER);
    }
  }
  const order = raw.toolOrder;
  if (
    isObject(order) &&
    (UPGRADABLE as readonly unknown[]).includes(order.tool) &&
    isCount(order.tier) &&
    order.tier >= 1 &&
    order.tier <= MAX_TIER &&
    isCount(order.readyDay)
  )
    g.toolOrder = {
      tool: order.tool as Upgradable,
      tier: Math.floor(order.tier),
      readyDay: Math.floor(order.readyDay),
    };
  if (isCount(raw.houseTier))
    g.houseTier = Math.min(Math.floor(raw.houseTier), MAX_HOUSE_TIER);
  g.catalogue = raw.catalogue === true;
  if (raw.resumeMap === CELLAR_MAP) g.resumeMap = CELLAR_MAP;
  const build = raw.houseBuild;
  if (
    isObject(build) &&
    Number.isInteger(build.tier) &&
    Number.isInteger(build.daysLeft)
  ) {
    const tier = build.tier as number;
    const daysLeft = build.daysLeft as number;
    if (
      tier === g.houseTier + 1 &&
      tier <= MAX_HOUSE_TIER &&
      daysLeft >= 1 &&
      daysLeft <= BUILD_DAYS
    )
      g.houseBuild = { tier, daysLeft };
  }
  g.animals = loadAnimals(raw.animals);
  if (WEATHERS.includes(raw.tomorrow as Weather))
    g.tomorrow = raw.tomorrow as Weather;
  g.endSeen = raw.endSeen === true;
  if (Array.isArray(raw.festivalsJoined))
    g.festivalsJoined = raw.festivalsJoined.filter(
      (k): k is string => typeof k === "string",
    );
  const tokens = raw.showTokens;
  if (isObject(tokens) && isCount(tokens.year) && isCount(tokens.count))
    g.showTokens = { year: tokens.year, count: tokens.count };
  g.cave.load(raw.cave as Partial<CaveSave> | undefined);
  g.wardrobe.load(raw.wardrobe);
  // Saves from an older house frame keep furniture and chests by that frame.
  const layout = isCount(raw.houseLayout) ? raw.houseLayout : 1;
  g.furniture.load(raw.furniture, layout);
  migrateCatalogue(g);
  g.chests.load(raw.chests, layout);
  g.decor.load(raw.decor);
  g.achievements.load(raw.achievements);
  g.summit.load(raw.summit);
  g.mail.load(raw.mail);
  g.quests.load(raw.quests);
  g.fishing.load(raw.fishing);
  g.tackle.load(raw.tackle);
  g.pots.load(raw.pots);
  g.combat.load(raw.combat, g.skills);
  // Loading rechecks, so a goal met under an older save is granted (note 38).
  checkAchievements(g);
  return g;
}

export function saveGame(store: SaveStore, g: GameState): void {
  store.write(serialize(g));
}

export function loadGame(store: SaveStore): GameState | undefined {
  const text = store.read();
  return text === null ? undefined : deserialize(text);
}
