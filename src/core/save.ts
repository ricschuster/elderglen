import { Day } from "./day";
import { Farm } from "./farm";
import { Trees, type Tree } from "./trees";
import { GroundItems, type Pile } from "./ground";
import { Weeds, type Weed } from "./weeds";
import { Rocks, type Rock, ROCK_KINDS } from "./rocks";
import { Mines, type MinesSave } from "./mines";
import { FruitTrees, fruitTreeById, type PlacedFruitTree } from "./fruittrees";
import { Sprinklers, sprinklerById, type PlacedSprinkler } from "./sprinklers";
import { Machines, type PlacedMachine } from "./machines";
import { FarmCave, type CaveSave } from "./cave";
import { machineById } from "./processing";
import { Furnace, type FurnaceSave } from "./furnace";
import { Chests, type ChestSave } from "./chests";
import {
  Achievements,
  checkAchievements,
  type AchievementsSave,
} from "./achievements";
import { ShippingBin, type BinLine, type BinSave } from "./shipping";
import { maps } from "../content/maps";
import { DEFAULT_FARM_TYPE, farmTypeById } from "./farmtypes";
import { ForageField } from "./forage";
import { type Weather, WEATHERS } from "./weather";
import { Hall, type HallProgress } from "./bundles";
import { Inventory } from "./inventory";
import { Skills, SKILLS, type Skill } from "./skills";
import { professionById } from "./professions";
import { Furniture, type FurnitureSave } from "./furniture";
import { Wardrobe, type WardrobeSave } from "./hats";
import {
  BUILD_DAYS,
  HOUSE_LAYOUT,
  MAX_HOUSE_TIER,
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
  /** Rocks on the farm, broken with the pickaxe. */
  rocks: Rocks;
  /** The mine: deepest floor, dry streak, today's floors. */
  mines: Mines;
  /** Sprinklers standing on the farm. */
  sprinklers: Sprinklers;
  /** Fruit trees planted on the farm. */
  fruitTrees: FruitTrees;
  /** Machines standing on the farm. */
  machines: Machines;
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
  /** The upgrade the carpenter is building, if any. */
  houseBuild: HouseBuild | undefined;
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
  /** Chests standing on the farm and in the house. */
  chests: Chests;
  /** Achievements earned and the different recipes crafted. */
  achievements: Achievements;
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
    trees: new Trees(farmMap.trees),
    ground: new GroundItems(),
    weeds: new Weeds(),
    rocks: new Rocks(farmMap.rocks),
    mines: new Mines(),
    sprinklers: new Sprinklers(),
    fruitTrees: new FruitTrees(),
    machines: new Machines(),
    furnace: new Furnace(),
    bin: new ShippingBin(),
    skills: new Skills(),
    toolTiers: { hoe: 0, can: 0, pickaxe: 0 },
    toolOrder: undefined,
    hall: new Hall(),
    houseTier: 0,
    houseBuild: undefined,
    weather: "sunny",
    tomorrow: "sunny",
    endSeen: false,
    festivalsJoined: [],
    showTokens: { year: 0, count: 0 },
    cave: new FarmCave(),
    wardrobe: new Wardrobe(),
    furniture: new Furniture(),
    chests: new Chests(),
    achievements: new Achievements(),
    forage: new ForageField(),
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
  /** Absent in saves made before the mines: the map's starting rocks. */
  rocks?: Rock[];
  /** Absent in saves made before the mines. */
  mines?: MinesSave;
  /** Absent in saves made before sprinklers. */
  sprinklers?: PlacedSprinkler[];
  /** Absent in saves made before fruit trees. */
  fruitTrees?: PlacedFruitTree[];
  /** Absent in saves made before machines. */
  machines?: PlacedMachine[];
  /** Absent in saves made before the mines. */
  furnace?: FurnaceSave;
  /** Absent in saves made before the shipping bin. */
  bin?: BinSave;
  skills: ReturnType<Skills["save"]>;
  hall: HallProgress;
  /** Absent in saves made before professions existed. */
  professions?: ReturnType<Skills["saveProfessions"]>;
  /** Absent in saves made before tool upgrades existed. */
  toolTiers?: ToolTiers;
  /** Absent when no tool is at the smith, and in older saves. */
  toolOrder?: ToolOrder;
  /** Absent in saves made before the house had tiers. */
  houseTier?: number;
  /** Absent when no upgrade is being built, and in older saves. */
  houseBuild?: HouseBuild;
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
  /** Absent in saves made before chests. */
  chests?: ChestSave[];
  /** Absent in saves made before achievements. */
  achievements?: AchievementsSave;
}

/** Where saves live. The scene supplies one backed by the browser. */
export interface SaveStore {
  read(): string | null;
  write(text: string): void;
}

/** Save as text, including the time of day, so a reload mid day resumes it. */
export function serialize(g: GameState): string {
  const data: SaveData = {
    version: SAVE_VERSION,
    farmType: g.farmType,
    day: g.day.clock.day,
    energy: g.day.energy.current,
    minutes: g.day.clock.minutes,
    money: g.money,
    inventory: g.inventory.save(),
    farm: g.farm.save(),
    trees: g.trees.save(),
    ground: g.ground.save(),
    weeds: g.weeds.save(),
    rocks: g.rocks.save(),
    mines: g.mines.save(),
    sprinklers: g.sprinklers.save(),
    fruitTrees: g.fruitTrees.save(),
    machines: g.machines.save(),
    furnace: g.furnace.save(),
    bin: g.bin.save(),
    skills: g.skills.save(),
    professions: g.skills.saveProfessions(),
    hall: g.hall.save(),
    toolTiers: { ...g.toolTiers },
    toolOrder: g.toolOrder ? { ...g.toolOrder } : undefined,
    houseTier: g.houseTier,
    houseBuild: g.houseBuild ? { ...g.houseBuild } : undefined,
    weather: g.weather,
    tomorrow: g.tomorrow,
    endSeen: g.endSeen,
    festivalsJoined: [...g.festivalsJoined],
    showTokens: { ...g.showTokens },
    cave: g.cave.save(),
    wardrobe: g.wardrobe.save(),
    houseLayout: HOUSE_LAYOUT,
    furniture: g.furniture.save(),
    chests: g.chests.save(),
    achievements: g.achievements.save(),
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
  // A save from before mining has no mining row.
  if (
    !SKILLS.every(
      (k) => isCount(skills[k]) || (k === "mining" && skills[k] === undefined),
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
  g.skills.load(skills as ReturnType<Skills["save"]>);
  if (Array.isArray(raw.trees)) {
    const valid = raw.trees.filter(
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
    g.trees.load(valid);
  }
  if (Array.isArray(raw.ground)) {
    g.ground.load(
      raw.ground.filter(
        (p): p is Pile =>
          isObject(p) &&
          Number.isInteger(p.x) &&
          Number.isInteger(p.y) &&
          typeof p.id === "string" &&
          isCount(p.count) &&
          (p.count as number) > 0,
      ),
    );
  }
  if (Array.isArray(raw.weeds)) {
    g.weeds.load(
      raw.weeds.filter(
        (w): w is Weed =>
          isObject(w) && Number.isInteger(w.x) && Number.isInteger(w.y),
      ),
    );
  }
  if (Array.isArray(raw.sprinklers)) {
    g.sprinklers.load(
      raw.sprinklers.filter(
        (s): s is PlacedSprinkler =>
          isObject(s) &&
          Number.isInteger(s.x) &&
          Number.isInteger(s.y) &&
          typeof s.id === "string" &&
          sprinklerById(s.id) !== undefined,
      ),
    );
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
            ? { output: job.output, count: job.count, doneAt: job.doneAt }
            : undefined,
      });
    }
    g.machines.load(valid);
  }
  if (Array.isArray(raw.fruitTrees)) {
    g.fruitTrees.load(
      raw.fruitTrees
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
        })),
    );
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
  // Saves from before the merged house map keep furniture and chests by the old frame.
  const legacyHouse = raw.houseLayout !== HOUSE_LAYOUT;
  g.furniture.load(raw.furniture, legacyHouse);
  g.chests.load(raw.chests, legacyHouse);
  g.achievements.load(raw.achievements);
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
