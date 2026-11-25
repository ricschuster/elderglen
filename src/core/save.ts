import { cropById } from "./crops";
import { FARM_STORE, GREENHOUSE_STORE } from "./mapstore";
import {
  PlacedStore,
  collectPlaced,
  nativePlaced,
  splitPlaced,
  type PlacedSave,
} from "./placedstore";
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
import { Grass, type GrassTile } from "./grass";
import { Twigs, type Twig } from "./debris";
import { Orders, orderById, type OrdersSave } from "./orders";
import { Rocks, type Rock, ROCK_KINDS } from "./rocks";
import { Mines, type MinesSave } from "./mines";
import { Combat, type CombatSave } from "./combat";
import { loadCreature, saveCreature, type CreatureSave } from "./creatures";
import { FruitTrees, fruitTreeById, type PlacedFruitTree } from "./fruittrees";
import { TeaBushes, type PlacedTeaBush } from "./teabush";
import { LIGHTNING_ROD } from "./lightning";
import { Sprinklers, sprinklerById, type PlacedSprinkler } from "./sprinklers";
import { QUALITIES, type Quality } from "./quality";
import { Casks, caskTakes, type PlacedCask } from "./cask";
import { Machines, type MachineJob, type PlacedMachine } from "./machines";
import { FarmCave, type CaveSave } from "./cave";
import { machineById } from "./processing";
import { isIndoorMachineMap } from "./placeables";
import { Furnace, type FurnaceSave } from "./furnace";
import { Chests, type ChestSave } from "./chests";
import {
  Achievements,
  checkAchievements,
  type AchievementsSave,
} from "./achievements";
import { SummitCall, type SummitSave } from "./summit";
import { Shrine, type ShrineSave } from "./shrine";
import { ShippingBin, type BinLine, type BinSave } from "./shipping";
import { maps } from "../content/maps";
import { DEFAULT_FARM_TYPE, farmTypeById } from "./farmtypes";
import { ForageField, type ForageSave } from "./forage";
import { ARTIFACT_AREAS, ArtifactSpots } from "./artifacts";
import { homeWorld, newAreas, type World } from "./areas";
import { type Weather, WEATHERS } from "./weather";
import { Hall, type HallProgress } from "./bundles";
import { Inventory } from "./inventory";
import { ensureTools } from "./toolitems";
import { Skills, SKILLS, type Skill } from "./skills";
import { professionById } from "./professions";
import { Decor, type DecorSave } from "./decor";
import {
  LOCAL_PLAYER,
  Players,
  WALLET_MODES,
  localView,
  loadPlayerInto,
  savePlayer,
  type PlayerSave,
  type WalletMode,
} from "./players";
import { Furniture, migrateCatalogue, type FurnitureSave } from "./furniture";
import type { Mailbox, MailEntry } from "./mail";
import { loadCabinBook, type CabinBook } from "./cabins";
import { loadLostFound, saveLostFound, type LostFound } from "./lostfound";
import type { Friendship } from "./friendship";
import { Marriage, exSpouses, type MarriageSave } from "./marriage";
import { ELDERFRUIT_TOTAL, maxEnergyFor } from "./elderfruit";
import { GALLERY_TOTAL, inGallery } from "./gallery";
import type { HeartEvents, HeartEventsSave } from "./heartevents";
import { Quests, type QuestsSave } from "./quests";
import { FishLog, type FishingSave } from "./fishing";
import { Guide } from "./guide";
import { Tackle, type TackleSave } from "./tackle";
import { Pots, type PotsSave } from "./pots";
import { Equipment } from "./equipment";
import {
  loadPlayerMarriage,
  newPlayerMarriageBook,
  savePlayerMarriage,
  type PlayerMarriageBook,
  type PlayerMarriageSave,
} from "./playermarriage";
import { canCapacity } from "./canwater";
import type { Wardrobe, WardrobeSave } from "./hats";
import {
  BUILD_DAYS,
  HOUSE_LAYOUT,
  MAX_HOUSE_TIER,
  CELLAR_MAP,
  type HouseBuild,
  validRenos,
} from "./house";
import {
  UPGRADABLE,
  MAX_TIER,
  type ToolOrder,
  type ToolTiers,
  type Upgradable,
} from "./upgrades";
import { isObject } from "./guards";
import { loadGuestFields, type BuildRule } from "./buildrule";

/**
 * The world: everything that is shared in multiplayer (note 53). The per-player
 * records live in `players` (`core/players.ts`). `GameState` is this plus the
 * local player's view of their own record.
 */
export interface WorldState {
  /** The farm type id, chosen at a new game and never changed (`core/farmtypes.ts`). */
  farmType: string;
  day: Day;
  farm: Farm;
  /** Trees and stumps on the farm. */
  trees: Trees;
  /** Goods that did not fit the backpack, waiting to be picked up. */
  ground: GroundItems;
  /** Weeds on the farm. */
  weeds: Weeds;
  /** Grass on the home farm (note 103). Only the scythe cuts it. */
  grass: Grass;
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
  /** Tea bushes of the farm and the greenhouse (note 97). Not kept in areas. */
  teaBushes: TeaBushes;
  greenhouseTeaBushes: TeaBushes;
  /** Where the repaired greenhouse stands, once moved at the carpenter. Unset: its ruin site. */
  greenhouseSite?: { x: number; y: number };
  /** World flags that are up, such as `secret-log-cleared` (`core/worldflags.ts`). Absent until one is. */
  flags?: string[];
  /** Items donated to the library gallery, shared by the farm (`core/gallery.ts`, note 104). Absent until one is. */
  gallery?: string[];
  /** Where donated items stand on the shelf: item id to slot. Absent until one is moved. */
  galleryPlaced?: Record<string, number>;
  /** Gallery reward keys the host has collected. Per player in multiplayer (M4); guests' lists are `galleryClaimedBy`. */
  galleryClaimed?: string[];
  /** Gallery reward keys each guest has collected, by player id (note 108 group 5). Absent until a guest collects one. */
  galleryClaimedBy?: Record<string, string[]>;
  /** The tool each guest has at the smithy, by player id (note 108 group 5); the host's is `toolOrder`. */
  toolOrdersBy?: Record<string, ToolOrder>;
  /** Who ordered each farm building, by key (`coop`, `barn`, `stable`, `silo`, `pond:x,y`); absent means the host (note 108 rule 7). */
  buildOwners?: Record<string, string>;
  /** Who may move or take down a building besides its owner (note 108 rule 9). Absent means own only. */
  buildRule?: BuildRule;
  /**
   * The worlds of the area maps by map id (`areas.ts`): their trees, rocks,
   * weeds, twigs and goods on the ground. The fields above are the farm's, or
   * the area's while `away` is set.
   */
  areas: Record<string, World>;
  /** Set while the player is in an area: which one, and the farm's world set aside. */
  away?: { mapId: string; home: World };
  /**
   * Placeables that have no typed list of their own (lights so far), by map
   * (`placedstore.ts`). Sprinklers, machines and chests are saved with these.
   */
  placed: PlacedStore;
  /** Machines standing on the farm. */
  machines: Machines;
  /** The greenhouse's soil: grows in any season (note 31). */
  greenhouse: Farm;
  /** The casks in the cellar (note 24). */
  casks: Casks;
  /** The machines on house and shed floors, by map and tile (owner 2026-11-25). */
  indoorMachines: Machines;
  /** The furnace the smith gives. */
  furnace: Furnace;
  /** Goods shipped today, paid when the day ends. */
  bin: ShippingBin;
  /** The tool the smith is upgrading, if any. */
  toolOrder: ToolOrder | undefined;
  hall: Hall;
  /** House tier, 0 for the start room only. */
  houseTier: number;
  /** Owns the Furniture Catalogue (note 41). */
  catalogue: boolean;
  /** The cellar marker of saves from before `at`. Read, never written (`resumeAt`). */
  resumeMap?: string;
  /** Where the player stood when a resume record was written (note 52). */
  at?: ResumeSpot;
  /** The upgrade the carpenter is building, if any. */
  houseBuild: HouseBuild | undefined;
  /** The renovations built, by id (`core/house.ts`, note 85). Each is the condition `reno-<id>`. */
  houseRenos: string[];
  /** The coop, its animals and the hay silo (note 23). */
  animals: AnimalsState;
  /** Today's weather. */
  weather: Weather;
  /** Tomorrow's weather, known a day ahead (the forecast). */
  tomorrow: Weather;
  /** True once the end screen has been shown, so it shows only once. */
  endSeen: boolean;
  /** Elderfruit eaten, each +34 maximum energy (`elderfruit.ts`, note 39). */
  elderfruit: number;
  /** Festivals joined, as `joinKey` strings. */
  festivalsJoined: string[];
  /** Show tokens from the Harvest Showing, good for the year they were won. */
  showTokens: { year: number; count: number };
  /** The farm cave: earnings, the offer and what grows there. */
  cave: FarmCave;
  /** Hats and clothes owned and worn. The local player's own (`players.local.wardrobe`, note 53). */
  wardrobe: Wardrobe;
  /** Rings worn (note 37). */
  equipment: Equipment;
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
  /** The ancestors' shrine: candles, the year 3 scene and the statue (note 83). */
  shrine: Shrine;
  /** Letters sent, delivered and taken (note 51). The local player's own (`players.local.mail`). */
  mail: Mailbox;
  /** Board requests taken and finished (note 50). */
  quests: Quests;
  /** Friendship points, talks and gifts per villager (note 61). */
  friendship: Friendship;
  /** Courtship, spouse, wedding day and children, per farm (note 12). */
  marriage: Marriage;
  /** Heart events seen, story flags and the day of the last event (note 62). */
  heartEvents: HeartEvents;
  /** Fish caught, with the longest of each (note 21). */
  fishing: FishLog;
  /** What the in-game Guide has seen (note 101). */
  guide: Guide;
  /** Bait and lures on each rod (note 21). */
  tackle: Tackle;
  /** Shellfish pots on the water, and the shellfish landed. */
  pots: Pots;
  /** Health, the trainer and the kill tally (note 22). */
  combat: Combat;
  /** Wild goods on the ground today. Not saved: it respawns each morning. */
  forage: ForageField;
  /** Artifact spots lying on the current map today. Not saved: they roll each morning. */
  spots: ArtifactSpots;
}

/**
 * Everything the player owns and has done. The scene holds one of these: the
 * world plus a `players` list, with the local player's record also readable and
 * writable as `money`, `inventory`, `skills`, `toolTiers` and `canWater`
 * (accessors onto `players.local`, so single-player code is unchanged).
 */
export interface GameState extends WorldState {
  /** Per-player records keyed by player id (`core/players.ts`, note 53). */
  players: Players;
  /** Player to player bonds (note 12, two-player steps), kept on the host and carried in the snapshot. */
  playerMarriage: PlayerMarriageBook;
  /**
   * Who owns which cabin, where, in which style and tier (note 110). Set when the world is hosted; absent in single
   * player and in saves made before it (optional field within version 4).
   */
  cabins?: CabinBook;
  /** Things waiting at the village hall for a player whose cabin was demolished (note 110). Absent when empty. */
  lostFound?: LostFound;
  money: number;
  inventory: Inventory;
  skills: Skills;
  /** Tier of the hoe and can, 0 for basic. */
  toolTiers: ToolTiers;
  /** Water left in the can (note 103). */
  canWater: number;
  /**
   * Random source for tool outcomes (issue 977). Unset means Math.random. Never
   * saved; tests and replays set it to a fixed or seeded function.
   */
  rng?: () => number;
}

/** A map and a tile, where Continue puts the player after a mid-day resume. */
export interface ResumeSpot {
  map: string;
  x: number;
  y: number;
}

/** Starting cash for a new game. */
export const START_MONEY = 500;

export function newGame(
  farmType: string = DEFAULT_FARM_TYPE,
  walletMode: WalletMode = "shared",
): GameState {
  const farmMap = maps.get(farmTypeById(farmType).map);
  const day = new Day();
  const players = new Players(START_MONEY, day.energy);
  players.walletMode = walletMode;
  const world = {
    players,
    farmType: farmTypeById(farmType).id,
    day,
    farm: new Farm(),
    greenhouse: new Farm(true),
    trees: new Trees(farmMap.trees),
    ground: new GroundItems(),
    weeds: new Weeds(),
    grass: new Grass(),
    twigs: new Twigs(),
    orders: new Orders(),
    rocks: new Rocks(farmMap.rocks),
    mines: new Mines(),
    sprinklers: new Sprinklers(),
    fruitTrees: new FruitTrees(),
    greenhouseSprinklers: new Sprinklers(),
    greenhouseFruitTrees: new FruitTrees(),
    teaBushes: new TeaBushes(),
    greenhouseTeaBushes: new TeaBushes(),
    placed: new PlacedStore(),
    machines: new Machines(),
    casks: new Casks(),
    indoorMachines: new Machines(),
    furnace: new Furnace(),
    bin: new ShippingBin(),
    toolOrder: undefined,
    hall: new Hall(),
    houseTier: 0,
    catalogue: false,
    houseBuild: undefined,
    houseRenos: [],
    animals: newAnimals(),
    weather: "sunny",
    tomorrow: "sunny",
    endSeen: false,
    elderfruit: 0,
    festivalsJoined: [],
    showTokens: { year: 0, count: 0 },
    cave: new FarmCave(),
    wardrobe: players.get(LOCAL_PLAYER).wardrobe,
    equipment: players.get(LOCAL_PLAYER).equipment,
    furniture: new Furniture(),
    decor: new Decor(),
    chests: new Chests(),
    achievements: new Achievements(),
    summit: new SummitCall(),
    shrine: new Shrine(),
    mail: players.get(LOCAL_PLAYER).mail,
    friendship: players.get(LOCAL_PLAYER).friendship,
    marriage: new Marriage(),
    playerMarriage: newPlayerMarriageBook(),
    heartEvents: players.get(LOCAL_PLAYER).heartEvents,
    quests: new Quests(),
    fishing: new FishLog(),
    guide: new Guide(),
    tackle: new Tackle(),
    pots: new Pots(),
    combat: players.get(LOCAL_PLAYER).combat,
    forage: new ForageField(),
    spots: new ArtifactSpots(),
    areas: newAreas(),
  } satisfies WorldState & {
    players: Players;
    playerMarriage: PlayerMarriageBook;
  };
  // Accessors, not a spread: a spread would copy the values and cut the link.
  Object.defineProperties(
    world,
    Object.getOwnPropertyDescriptors(localView(players)),
  );
  return world as unknown as GameState;
}

/**
 * 3 added marriage (note 12). 4 added the player list and wallet mode (notes 52
 * and 53). Version 2 and 3 saves load with the defaults: the flat fields are
 * player "p1", shared wallet.
 */
export const SAVE_VERSION = 4;
const OLDEST_SAVE_VERSION = 2;

interface SaveData {
  version: number;
  /** Absent in saves made before farm types: Standard. */
  farmType?: string;
  day: number;
  /** Can be negative while exhausted (note 07). */
  energy: number;
  /** Energy hit 0 today: the morning after is half energy. Absent in older saves: false. */
  exhausted?: boolean;
  /** A skill leveled up today: the morning after is full energy. Absent in older saves: false. */
  levelled?: boolean;
  /** Minutes since midnight. Absent in saves made before the clock was saved. */
  minutes?: number;
  money: number;
  /** Money mode, chosen at creation. Absent before version 4: shared. */
  walletMode?: WalletMode;
  /** Every player's record. The host's flat fields below stay authoritative for "p1". Absent before version 4. */
  players?: PlayerSave[];
  inventory: ReturnType<Inventory["save"]>;
  farm: ReturnType<Farm["save"]>;
  /** Absent in saves made before trees existed: the map's starting trees. */
  trees?: Tree[];
  /** Absent in saves made before goods could lie on the ground. */
  ground?: Pile[];
  /** Absent in saves made before weeds existed. */
  weeds?: Weed[];
  /** Absent in saves made before grass (note 103). */
  grass?: GrassTile[];
  /** Absent in saves made before seasonal debris. */
  twigs?: Twig[];
  /** Absent in saves made before Special Orders. */
  orders?: OrdersSave;
  /** Absent in saves made before the mines: the map's starting rocks. */
  rocks?: Rock[];
  /** Absent in saves made before the mines. */
  mines?: MinesSave;
  /** Older saves: the rod list, now kept in `placed` (read once on load). */
  rods?: { x: number; y: number; hit: boolean }[];
  /**
   * Sprinklers and fruit trees by map id (`mapstore.ts`). Absent in saves made
   * before the greenhouse took them: those hold the farm's in `sprinklers` and
   * `fruitTrees` below, which load as the farm's.
   */
  mapItems?: Record<
    string,
    {
      sprinklers?: PlacedSprinkler[];
      fruitTrees?: PlacedFruitTree[];
      teaBushes?: PlacedTeaBush[];
    }
  >;
  /**
   * Sprinklers, machines and chests by map id (`placedstore.ts`). Absent in
   * saves made before the placed store: those hold the three lists below,
   * which load the same way.
   */
  placed?: PlacedSave;
  /** Old saves only: the farm's sprinklers, before `mapItems`. */
  sprinklers?: PlacedSprinkler[];
  /** Old saves only: the farm's fruit trees, before `mapItems`. */
  fruitTrees?: PlacedFruitTree[];
  /** Absent until the greenhouse is moved. */
  greenhouseSite?: { x: number; y: number };
  /** Absent until a world flag is raised. */
  flags?: string[];
  /** Absent until something is donated (note 104). */
  gallery?: string[];
  galleryPlaced?: Record<string, number>;
  galleryClaimed?: string[];
  galleryClaimedBy?: Record<string, string[]>;
  toolOrdersBy?: Record<string, ToolOrder>;
  buildOwners?: Record<string, string>;
  buildRule?: BuildRule;
  /** Absent in saves made before the Forest: each area's starting world. */
  areas?: Record<string, AreaSave>;
  /** Absent in saves made before machines. */
  machines?: PlacedMachine[];
  /** Absent in saves made before the greenhouse. */
  greenhouse?: ReturnType<Farm["save"]>;
  /** Absent in saves made before casks. */
  casks?: PlacedCask[];
  /** Absent in saves made before machines could stand indoors. */
  indoorMachines?: PlacedMachine[];
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
  /** Absent in saves made before the can held water (they start full). */
  canWater?: number;
  /** Absent when no tool is at the smith, and in older saves. */
  toolOrder?: ToolOrder;
  /** Absent in saves made before the house had tiers. */
  houseTier?: number;
  /** Absent in saves made before the catalogue. */
  catalogue?: boolean;
  /** Saves from before `at` set this in the cellar. No longer written. */
  resumeMap?: string;
  /** Which record this is. Absent on saves from before the split: read as night. */
  kind?: "night" | "resume";
  /** Wall clock ms when written. Display only, never game logic. */
  savedAt?: number;
  /** Resume only: where the player stands. Absent in the mines and combat areas. */
  at?: ResumeSpot;
  /** The farm field's wild goods, stored so a load does not roll them again. */
  forage?: ForageSave;
  /** Absent when no upgrade is being built, and in older saves. */
  houseBuild?: HouseBuild;
  /** Absent when no renovation is built, and in older saves. */
  houseRenos?: string[];
  /** Absent in saves made before animals. */
  animals?: AnimalsState;
  weather: Weather;
  /** Absent in saves made before the forecast existed. */
  tomorrow?: Weather;
  /** Absent in saves made before the end screen existed. */
  endSeen?: boolean;
  /** Absent until one is eaten. */
  elderfruit?: number;
  /** Absent in saves made before festivals existed. */
  festivalsJoined?: string[];
  /** Absent in saves made before the Harvest Showing. */
  showTokens?: { year: number; count: number };
  /** Absent in saves made before the farm cave. */
  cave?: CaveSave;
  /** Absent in saves made before hats. */
  wardrobe?: WardrobeSave;
  /** Absent in saves made before the ring slots. */
  equipment?: unknown;
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
  /** Absent in saves made before the shrine. */
  shrine?: ShrineSave;
  /** Absent in saves made before mail. */
  mail?: MailEntry[];
  /** Absent in saves made before friendship: nobody met, no points. */
  friendship?: ReturnType<Friendship["save"]>;
  /** Absent in saves made before marriage (version 2): unmarried. */
  marriage?: MarriageSave;
  /** Absent before two-player marriage (added within version 4): no bonds. */
  playerMarriage?: PlayerMarriageSave;
  /** Absent before the guest's cabin (note 110, added within version 4): no cabins. */
  cabins?: CabinBook;
  lostFound?: LostFound;
  /** Absent in saves made before heart events: none seen. */
  heartEvents?: HeartEventsSave;
  /** Absent in saves made before the request board. */
  quests?: QuestsSave;
  /** Absent in saves made before fishing. */
  fishing?: FishingSave;
  /** Absent in saves made before the Guide. */
  guide?: string[];
  guidePlaces?: string[];
  guideShops?: string[];
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
  creatures?: CreatureSave[];
  creaturesDay?: number;
  forage?: ForageSave;
  /** The day's artifact spots (areas that have them), stored so a load does not roll them again. */
  spots?: { x: number; y: number }[];
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

/** The tea bushes of a saved list that are well formed. */
function validTeaBushes(raw: unknown): PlacedTeaBush[] {
  return Array.isArray(raw)
    ? raw
        .filter(
          (b): b is PlacedTeaBush =>
            isObject(b) &&
            Number.isInteger(b.x) &&
            Number.isInteger(b.y) &&
            Number.isInteger(b.age),
        )
        .map((b) => ({
          ...b,
          age: Math.max(b.age, 0),
          leaves: Number.isInteger(b.leaves) ? Math.max(b.leaves, 0) : 0,
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
export function serialize(
  g: GameState,
  record?: { kind: "night" | "resume"; at?: ResumeSpot },
): string {
  // The farm's world is saved as the top-level fields, even from inside an area.
  const home = homeWorld(g);
  const data: SaveData = {
    version: SAVE_VERSION,
    farmType: g.farmType,
    day: g.day.clock.day,
    energy: g.day.energy.current,
    ...(g.day.energy.wasExhausted ? { exhausted: true } : {}),
    ...(g.skills.levelledToday ? { levelled: true } : {}),
    minutes: g.day.clock.minutes,
    // The host's own gold, even when the pool is shared (it is the pool).
    money: g.players.get(LOCAL_PLAYER).money,
    walletMode: g.players.walletMode,
    players: g.players.each().map(savePlayer),
    inventory: g.players.get(LOCAL_PLAYER).inventory.save(),
    farm: home.farm.save(),
    greenhouse: g.greenhouse.save(),
    trees: home.trees.save(),
    ground: home.ground.save(),
    weeds: home.weeds.save(),
    grass: g.grass.save(),
    twigs: home.twigs.save(),
    orders: g.orders.save(),
    rocks: home.rocks.save(),
    mines: g.mines.save(),
    mapItems: {
      [FARM_STORE]: {
        fruitTrees: home.fruitTrees.save(),
        teaBushes: g.teaBushes.save(),
      },
      [GREENHOUSE_STORE]: {
        fruitTrees: g.greenhouseFruitTrees.save(),
        teaBushes: g.greenhouseTeaBushes.save(),
      },
    },
    placed: collectPlaced(g).save(),
    ...(g.greenhouseSite ? { greenhouseSite: { ...g.greenhouseSite } } : {}),
    ...(g.flags?.length ? { flags: [...g.flags] } : {}),
    ...(g.gallery?.length ? { gallery: [...g.gallery] } : {}),
    ...(g.galleryPlaced && Object.keys(g.galleryPlaced).length
      ? { galleryPlaced: { ...g.galleryPlaced } }
      : {}),
    ...(g.galleryClaimed?.length
      ? { galleryClaimed: [...g.galleryClaimed] }
      : {}),
    ...(g.galleryClaimedBy && Object.keys(g.galleryClaimedBy).length
      ? {
          galleryClaimedBy: Object.fromEntries(
            Object.entries(g.galleryClaimedBy).map(([k, v]) => [k, [...v]]),
          ),
        }
      : {}),
    ...(g.toolOrdersBy && Object.keys(g.toolOrdersBy).length
      ? {
          toolOrdersBy: Object.fromEntries(
            Object.entries(g.toolOrdersBy).map(([k, v]) => [k, { ...v }]),
          ),
        }
      : {}),
    ...(g.buildOwners && Object.keys(g.buildOwners).length
      ? { buildOwners: { ...g.buildOwners } }
      : {}),
    ...(g.buildRule !== undefined ? { buildRule: g.buildRule } : {}),
    areas: Object.fromEntries(
      Object.entries(g.areas).map(([id, w]) => [
        id,
        {
          trees: w.trees.save(),
          ground: w.ground.save(),
          weeds: w.weeds.save(),
          twigs: w.twigs.save(),
          rocks: w.rocks.save(),
          forage: w.forage.save(),
          ...(ARTIFACT_AREAS.includes(id) ? { spots: w.spots.save() } : {}),
          ...(w.creatures
            ? {
                creatures: w.creatures.map(saveCreature),
                creaturesDay: w.creaturesDay,
              }
            : {}),
        },
      ]),
    ),
    casks: g.casks.save(),
    indoorMachines: g.indoorMachines.save(),
    furnace: g.furnace.save(),
    bin: g.bin.save(),
    skills: g.skills.save(),
    professions: g.skills.saveProfessions(),
    topProfessions: g.skills.saveTopProfessions(),
    hall: g.hall.save(),
    toolTiers: { ...g.toolTiers },
    canWater: g.canWater,
    toolOrder: g.toolOrder ? { ...g.toolOrder } : undefined,
    houseTier: g.houseTier,
    catalogue: g.catalogue,
    ...(record
      ? {
          kind: record.kind,
          savedAt: Date.now(),
          ...(record.at ? { at: { ...record.at } } : {}),
        }
      : {}),
    forage: home.forage.save(),
    houseBuild: g.houseBuild ? { ...g.houseBuild } : undefined,
    houseRenos: [...g.houseRenos],
    animals: saveAnimals(g.animals),
    weather: g.weather,
    tomorrow: g.tomorrow,
    endSeen: g.endSeen,
    ...(g.elderfruit > 0 ? { elderfruit: g.elderfruit } : {}),
    festivalsJoined: [...g.festivalsJoined],
    showTokens: { ...g.showTokens },
    cave: g.cave.save(),
    wardrobe: g.players.get(LOCAL_PLAYER).wardrobe.save(),
    equipment: g.players.get(LOCAL_PLAYER).equipment.save(),
    houseLayout: HOUSE_LAYOUT,
    furniture: g.furniture.save(),
    decor: g.decor.save(),
    achievements: g.achievements.save(),
    summit: g.summit.save(),
    shrine: g.shrine.save(),
    mail: g.mail.save(),
    friendship: g.players.get(LOCAL_PLAYER).friendship.save(),
    marriage: g.marriage.save(),
    ...(g.playerMarriage.bonds.length || g.playerMarriage.unseenWedding.length
      ? { playerMarriage: savePlayerMarriage(g.playerMarriage) }
      : {}),
    ...(g.cabins && g.cabins.cabins.length ? { cabins: g.cabins } : {}),
    ...(saveLostFound(g) ? { lostFound: saveLostFound(g) } : {}),
    heartEvents: g.players.get(LOCAL_PLAYER).heartEvents.save(),
    quests: g.quests.save(),
    fishing: g.fishing.save(),
    guide: (g.guide.sweep(g), g.guide.save()),
    guidePlaces: g.guide.savePlaces(),
    guideShops: g.guide.saveShops(),
    tackle: g.tackle.save(),
    pots: g.pots.save(),
    combat: g.players.get(LOCAL_PLAYER).combat.save(),
  };
  return JSON.stringify(data);
}

const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

const isEnergy = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

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

/** The plots of a saved soil that are well formed: bad entries are dropped, not thrown. */
function validPlots(raw: Record<string, unknown>): ReturnType<Farm["save"]> {
  const plots = Object.entries(raw).filter(
    ([k, p]) =>
      /^\d+,\d+$/.test(k) &&
      isObject(p) &&
      p.tilled === true &&
      typeof p.wateredToday === "boolean" &&
      (p.fertilizer === undefined || typeof p.fertilizer === "string") &&
      (p.crop === undefined ||
        (isObject(p.crop) &&
          typeof p.crop.id === "string" &&
          cropById(p.crop.id) !== undefined &&
          isCount(p.crop.daysGrown) &&
          isCount(p.crop.harvests))),
  );
  return Object.fromEntries(plots) as ReturnType<Farm["save"]>;
}

/** The machines of a saved list that are well formed (an indoor one keeps its map). */
function validMachines(rows: unknown[]): PlacedMachine[] {
  const valid: PlacedMachine[] = [];
  for (const m of rows) {
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
      ...(typeof m.map === "string" ? { map: m.map } : {}),
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
  return valid;
}

/**
 * True when the record was written by a newer game than this build
 * (its `version` is above `SAVE_VERSION`). `deserialize` refuses such a
 * record; this says why, so the title can say "newer version" and nothing
 * overwrites it.
 */
export function isNewerSave(text: string): boolean {
  try {
    const raw: unknown = JSON.parse(text);
    return isObject(raw) && isCount(raw.version) && raw.version > SAVE_VERSION;
  } catch {
    return false;
  }
}

export function deserialize(text: string): GameState | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (
    !isObject(raw) ||
    !isCount(raw.version) ||
    raw.version < OLDEST_SAVE_VERSION ||
    raw.version > SAVE_VERSION
  )
    return undefined;
  const { day, energy, money, inventory, farm, skills, hall, weather } = raw;
  if (!isCount(day) || day < 1 || !isEnergy(energy) || !isCount(money))
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
  if (isCount(raw.elderfruit)) {
    g.elderfruit = Math.min(raw.elderfruit, ELDERFRUIT_TOTAL);
    g.day.energy.max = maxEnergyFor(g.elderfruit);
  }
  g.day.restore(day, energy, isCount(raw.minutes) ? raw.minutes : undefined);
  g.day.energy.wasExhausted = raw.exhausted === true;
  g.skills.levelledToday = raw.levelled === true;
  g.players.get(LOCAL_PLAYER).money = money;
  if (WALLET_MODES.includes(raw.walletMode as WalletMode))
    g.players.walletMode = raw.walletMode as WalletMode;
  if (Array.isArray(raw.players))
    for (const rec of raw.players) loadPlayerInto(g.players, rec);
  g.weather = weather as Weather;
  g.inventory.load(inventory as ReturnType<Inventory["save"]>);
  // Saves from before note 102 kept the tools apart: put them in the pack.
  ensureTools(g.inventory);
  g.farm.load(validPlots(farm));
  if (isObject(raw.greenhouse)) g.greenhouse.load(validPlots(raw.greenhouse));
  g.skills.load(skills as ReturnType<Skills["save"]>);
  if (Array.isArray(raw.trees)) g.trees.load(validTrees(raw.trees));
  if (Array.isArray(raw.ground)) g.ground.load(validPiles(raw.ground));
  if (Array.isArray(raw.weeds)) g.weeds.load(validWeeds(raw.weeds));
  if (Array.isArray(raw.grass)) g.grass.load(validWeeds(raw.grass));
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
      w.forage.load(a.forage);
      w.spots.load(a.spots);
      if (Array.isArray(a.creatures) && isCount(a.creaturesDay)) {
        w.creatures = a.creatures.flatMap((c) =>
          isObject(c) ? (loadCreature(c as unknown as CreatureSave) ?? []) : [],
        );
        w.creaturesDay = a.creaturesDay;
      }
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
  // A save with `placed` holds sprinklers, machines and chests there; an older one in three lists.
  const placed = isObject(raw.placed) ? splitPlaced(raw.placed) : undefined;
  if (isObject(raw.placed)) g.placed = nativePlaced(raw.placed);
  // The older rod list: rods now live in the placed store. A struck one keeps its strike.
  else if (Array.isArray(raw.rods))
    for (const r of raw.rods)
      if (isObject(r) && isCount(r.x) && isCount(r.y))
        g.placed.add(FARM_STORE, {
          x: r.x,
          y: r.y,
          id: LIGHTNING_ROD,
          state: { hit: r.hit === true, pack: false },
        });
  g.sprinklers.load(
    validSprinklers(placed ? placed.farmSprinklers : farmItems.sprinklers),
  );
  g.greenhouseSprinklers.load(
    validSprinklers(
      placed ? placed.greenhouseSprinklers : houseItems.sprinklers,
    ),
  );
  g.fruitTrees.load(validFruitTrees(farmItems.fruitTrees));
  g.greenhouseFruitTrees.load(validFruitTrees(houseItems.fruitTrees));
  g.teaBushes.load(validTeaBushes(farmItems.teaBushes));
  g.greenhouseTeaBushes.load(validTeaBushes(houseItems.teaBushes));
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
  loadGallery(g, raw);
  const machineRows = placed ? placed.machines : raw.machines;
  if (Array.isArray(machineRows)) g.machines.load(validMachines(machineRows));
  if (Array.isArray(raw.indoorMachines))
    g.indoorMachines.load(
      validMachines(raw.indoorMachines).filter(
        (m) => m.map !== undefined && isIndoorMachineMap(m.map),
      ),
    );
  if (Array.isArray(raw.casks)) {
    const valid: PlacedCask[] = [];
    for (const c of raw.casks) {
      if (!isObject(c) || !Number.isInteger(c.x) || !Number.isInteger(c.y))
        continue;
      const job = c.job;
      valid.push({
        x: c.x as number,
        y: c.y as number,
        map: typeof c.map === "string" ? c.map : CELLAR_MAP,
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
    g.casks.load(valid);
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
          ...(Array.isArray(f.ground) ? { ground: validPiles(f.ground) } : {}),
          ...(f.dangerous === true ? { dangerous: true } : {}),
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
      campOpened: Array.isArray(mines.campOpened)
        ? mines.campOpened.filter(isCount).map(Math.floor)
        : undefined,
      dangerous: mines.dangerous === true ? true : undefined,
      dangerousTomorrow:
        typeof mines.dangerousTomorrow === "boolean"
          ? mines.dangerousTomorrow
          : undefined,
      rareMisses: Array.isArray(mines.rareMisses)
        ? mines.rareMisses.filter(isCount).map(Math.floor)
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
    const legacyTop: Partial<Record<Skill, string>> = {};
    for (const k of SKILLS) {
      const id = raw.professions[k];
      const def = typeof id === "string" ? professionById(id) : undefined;
      if (def?.skill === k && !def.under) picked[k] = id as string;
      // Agriculturist was a level 5 pick before the farming tree grew a level 10 tier.
      else if (id === "agriculturist" && k === "farming") {
        picked[k] = "tiller";
        legacyTop[k] = "agriculturist";
      }
      // Botanist was a level 5 pick before the foraging tree grew a level 10 tier.
      else if (id === "botanist" && k === "foraging") {
        picked[k] = "gatherer";
        legacyTop[k] = "botanist";
      }
    }
    g.skills.loadProfessions(picked);
    // A level 10 pick only stands under the level 5 pick it grows from.
    const top: Partial<Record<Skill, string>> = {};
    Object.assign(top, legacyTop);
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
  g.canWater = isCount(raw.canWater)
    ? Math.min(raw.canWater, canCapacity(g))
    : canCapacity(g);
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
  g.houseRenos = validRenos(
    g.houseTier,
    Array.isArray(raw.houseRenos) ? raw.houseRenos : [],
  );
  g.catalogue = raw.catalogue === true;
  if (raw.resumeMap === CELLAR_MAP) g.resumeMap = CELLAR_MAP;
  const at = raw.at;
  if (
    isObject(at) &&
    typeof at.map === "string" &&
    maps.ids.includes(at.map) &&
    isCount(at.x) &&
    isCount(at.y) &&
    Number.isInteger(at.x) &&
    Number.isInteger(at.y) &&
    at.x < maps.get(at.map).width &&
    at.y < maps.get(at.map).height
  )
    g.at = { map: at.map, x: at.x, y: at.y };
  g.forage.load(raw.forage);
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
  g.players.get(LOCAL_PLAYER).wardrobe.load(raw.wardrobe);
  g.players.get(LOCAL_PLAYER).equipment.load(raw.equipment);
  // Saves from an older house frame keep furniture and chests by that frame.
  const layout = isCount(raw.houseLayout) ? raw.houseLayout : 1;
  g.furniture.load(raw.furniture, layout);
  migrateCatalogue(g);
  g.chests.load(placed ? placed.chests : raw.chests, layout);
  g.decor.load(raw.decor);
  g.achievements.load(raw.achievements);
  g.summit.load(raw.summit);
  g.shrine.load(raw.shrine);
  g.mail.load(raw.mail);
  g.marriage.load(raw.marriage);
  g.playerMarriage = loadPlayerMarriage(raw.playerMarriage, (id) =>
    g.players.has(id),
  );
  // The married cap must be known before friendship loads, or points above the bouquet cap are clamped.
  g.cabins = loadCabinBook(raw.cabins);
  g.lostFound = loadLostFound(raw.lostFound);
  const hostFriends = g.players.get(LOCAL_PLAYER).friendship;
  hostFriends.setSpouse(g.marriage.married ? g.marriage.spouse : null);
  hostFriends.setExes(exSpouses(g));
  hostFriends.load(raw.friendship);
  g.players.get(LOCAL_PLAYER).heartEvents.load(raw.heartEvents);
  g.quests.load(raw.quests);
  g.fishing.load(raw.fishing);
  g.guide.load(raw.guide, raw.guidePlaces, raw.guideShops);
  g.guide.sweep(g);
  g.tackle.load(raw.tackle);
  g.pots.load(raw.pots);
  g.players
    .get(LOCAL_PLAYER)
    .combat.load(raw.combat, g.players.get(LOCAL_PLAYER).skills);
  // Loading rechecks, so a goal met under an older save is granted (note 38).
  checkAchievements(g);
  return g;
}

/** Read the gallery fields (note 104). Unknown ids and bad slots are dropped. */
function loadGallery(g: GameState, raw: Record<string, unknown>): void {
  const strings = (v: unknown): string[] =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter((x): x is string => typeof x === "string" && x !== ""),
          ),
        ]
      : [];
  const donated = strings(raw.gallery).filter(inGallery);
  if (donated.length > 0) g.gallery = donated;
  if (isObject(raw.galleryPlaced)) {
    const placed: Record<string, number> = {};
    for (const [id, slot] of Object.entries(raw.galleryPlaced))
      if (
        donated.includes(id) &&
        Number.isInteger(slot) &&
        (slot as number) >= 0 &&
        (slot as number) < GALLERY_TOTAL
      )
        placed[id] = slot as number;
    if (Object.keys(placed).length > 0) g.galleryPlaced = placed;
  }
  const claimed = strings(raw.galleryClaimed);
  if (claimed.length > 0) g.galleryClaimed = claimed;
  loadGuestFields(g, raw);
}
