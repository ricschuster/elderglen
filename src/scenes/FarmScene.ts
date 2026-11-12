import {
  BARN_BUILT,
  BARN_FOOTPRINT,
  BARN_MAP,
  BARN_MAX_TIER,
  barnBlocks,
  stableBlocks,
  stableHome,
  siloBlocks,
  siloSite,
  SILO_FOOTPRINT,
  STABLE_FOOTPRINT,
  siteOf,
  depositHay,
  siloCapacity,
  HAY,
  barnSite,
  barnVisibleTier,
  animalSlots,
  COOP_BUILT,
  COOP_MAX_TIER,
  COOP_FOOTPRINT,
  INCUBATOR_TIER,
  COOP_MAP,
  GROW_DAYS,
  coopBlocks,
  coopSite,
  coopVisibleTier,
} from "../core/animals";
import { pondBlocks } from "../core/pond";
import { fertilizerById } from "../core/fertilizer";
import Phaser from "phaser";
import { saveSettings } from "../core/bindings";
import { sleep } from "../core/sleep";
import { areaOf, enterArea, isAreaMap, leaveArea } from "../core/areas";
import { eventAtTile } from "../core/eventrun";
import { declinedToday } from "./HeartEventScene";
import { meet, presentAt, villagersOn, type Present } from "../core/townfolk";
import { stageOf as fruitStageOf } from "../core/fruittrees";
import type { GameState } from "../core/save";
import { TOOLS, cycle, heldAt, nextRow, toolbarSize } from "../core/toolbar";
import { pendingChoice } from "../core/professions";
import { eat, type Outcome } from "../core/actions";
import { dateOf } from "../core/calendar";
import { clockText, darkness } from "../core/clock";
import {
  festivalOfMap,
  festivalOpen,
  festivalDayToday,
  festivalShutLine,
  festivalStepShut,
  isFestivalMap,
  sightLine,
} from "../core/festivals";
import { openChest } from "../core/maze";
import { rodById, waterAhead } from "../core/fishing";
import { holdsOf } from "../core/worldflags";
import { gateOpen, gateShutLine, parseGate } from "../core/gates";
import { mendTideBridge, TIDE_BRIDGE_WOOD } from "../core/tidebridge";
import { logCleared } from "../core/logs";
import { CAMP_LINE, HERMIT_LINE } from "../core/forestfolk";
import { SPIRIT_STATUE, giveToSpirit, hermitStock } from "../core/elderfruit";
import { STONEKEEPER_LINE } from "../core/smith";
import {
  campLine,
  QUARRY_BRIDGE_LINE,
  QUARRY_MAP,
  QUARRY_OPEN,
  YARD_EMPTY_LINE,
} from "../core/quarry";
import { COVE_TREASURE, FERRY_LINE, takeTreasure } from "../core/cove";
import { cropOfSeed, itemById } from "../core/items";
import { MIXED_SEED } from "../core/weeds";
import { NOTHING_TO_ACT_ON, act, reasonText, useHeld } from "../core/tools";
import { cropById } from "../core/crops";
import { mapFiles, maps } from "../content/maps";
import { START } from "../core/maps";
import { storeOf } from "../core/mapstore";
import { mapWithDoors } from "../core/placement";
import { farmMapOf, isFarmMap, resolveMapId } from "../core/farmtypes";
import {
  dismountSafely,
  horseBlocks,
  horseName,
  horseTile,
  mount,
  mountProblem,
  needsName,
  settleHorse,
  type ParkWorld,
  rideable,
  speedFactor,
} from "../core/horse";
import {
  CART_KIND,
  exitOpen,
  FarmMap,
  layersAtTier,
  layerShows,
  type Exit,
  type TiledLayer,
} from "../core/map";
import { counterShutLine, doorShutLine } from "../core/shophours";
import { roadNews } from "../core/roadnews";
import { traderProblem } from "../core/trader";
import {
  CART_IDLE_LINE,
  cartsRunning,
  herbStallProblem,
  stopOfService,
} from "../core/roomrewards";
import { exitLabel, serviceLabel, standInLine } from "../core/labels";
import {
  facingFrom,
  facingTile,
  move,
  tileOf,
  type Body,
  type Facing,
  type Vec,
} from "../core/movement";
import { aimAt } from "../core/aim";
import { createControls, type Controls } from "./controls";
import { planTap, planUse, type TapPlan } from "../core/pathing";
import { tapPick, tapUse } from "../core/tapuse";
import { tapReady, tapStatus, TAPPER } from "../core/tapper";
import {
  browserSettingsStore,
  browserStore,
  loadDeviceSettings,
} from "./storage";
import { saveGame } from "../core/save";
import {
  healthShown,
  isWeapon,
  swingTargets,
  weaponById,
  type WeaponDef,
} from "../core/combat";
import {
  creatureById,
  creatureTile,
  creatureXp,
  floorHasCreatures,
  hurtCreature,
  rollDrops,
  splitOff,
  stepCreature,
  swingDamage,
  type Creature,
} from "../core/creatures";
import { absoluteMinutes } from "../core/furnace";
import { jobDone, statusText } from "../core/machines";
import {
  CASK,
  caskDone,
  caskStatus,
  collectCask,
  handOnCask,
  loadCask,
  placeCask,
} from "../core/cask";
import { chestById, pickUpChest, placeChest, pushChest } from "../core/chests";
import {
  isLight,
  lightAt,
  lightLayer,
  lightMapKey,
  pickUpLight,
  placeLight,
} from "../core/lights";
import { drink, isDrink, oilCalms } from "../core/elixirs";
import { effectById } from "../core/effects";
import {
  type LitBomb,
  blastCreatures,
  blastPlayer,
  blastRocks,
  bombById,
  isBomb,
  placeBomb,
  tickBombs,
} from "../core/bombs";
import {
  LIGHTNING_ROD,
  packWaiting,
  pickUpRod,
  placeRod,
  rodAt,
  rollStrikes,
  takePack,
} from "../core/lightning";
import {
  POT_ITEM,
  baitPot,
  collectPot,
  pickUpPot,
  placePot,
} from "../core/pots";
import { baitById } from "../core/tackle";
import { greencoatDue, takeCampGift } from "../core/camp";
import {
  decorTiles,
  farmDecorAt,
  isFarmDecor,
  pickUpFarmDecor,
  placeFarmDecor,
} from "../core/farmdecor";
import {
  DYE_POTS_SERVICE,
  SEWING_SERVICE,
  tailoringLine,
} from "../core/tailoring";
import {
  CAVE_MAP,
  caveDehydratorDone,
  collectCaveDehydrator,
  hasCaveDehydrator,
  loadCaveDehydrator,
  pickBatFruit,
  pickMushroomBox,
} from "../core/cave";
import {
  BUILT_FLOORS,
  floorLayout,
  floorMapJson,
  mineFloorOf,
  mineMapId,
  minesOpen,
  type Floor,
} from "../core/mines";
import type { Rocks } from "../core/rocks";
import { ROOMS, applyDecor, decorById, roomTiles } from "../core/decor";
import {
  CATALOGUE_ITEM,
  carryFurniture,
  furnitureById,
  pickUpFurniture,
  placeFurniture,
} from "../core/furniture";
import { hatById } from "../core/hats";
import {
  GREENHOUSE_FOOTPRINT,
  greenhouseHolds,
  greenhouseRepaired,
  greenhouseSite,
} from "../core/greenhouse";
import {
  CELLAR_MAP,
  HOUSE_MAP,
  houseHolds,
  houseSpouse,
  houseVisibleTier,
  isHouseMap,
} from "../core/house";
import { SELECTED_KEY, STATE_KEY } from "./state";
import {
  cropKey,
  fertKey,
  fruitOnTreeKey,
  fruitTreeKey,
  sprinklerKey,
  furnitureKey,
  chestKey,
  farmDecorKey,
  lightKey,
  POT_KEY,
  POT_READY_KEY,
  machineKey,
  MACHINE_READY_KEY,
  forageKey,
  iconKey,
  LADDER_KEY,
  ROCK_KEYS,
  SPOT_KEY,
  soilKey,
  stageOf,
  treeKey,
  TWIG_KEY,
  WEED_KEY,
} from "./art";
import { giveItem, giveMoney } from "../core/debug";
import { pickupRadius } from "../core/ground";
import { Hud, HUD_FIT_W } from "./hud";
import { UI_SIZE_KEY, WORLD_ZOOM_KEY } from "./panel";
import {
  cameraBounds,
  cornerScroll,
  hudScale,
  pinchPercent,
  stepPercent,
  worldZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from "../core/view";
import {
  makePlaceholderTextures,
  PLAYER_KEY,
  TILES_KEY,
  TILESET_NAME,
} from "./placeholder-textures";

/** Real milliseconds per 10 game minutes (Stardew pace). */
const TICK_MS = 7000;
const TICK_MINUTES = 10;

/**
 * Dev builds only: `?speed=N` runs the world N times faster (walking, the
 * clock tick and the axe repeat) so scripted playtests finish sooner. It is 1
 * in production. Walking takes N sub-steps a frame, so a step stays small
 * enough not to cross a tile.
 */
const DEV_SPEED = import.meta.env.DEV
  ? Math.min(
      8,
      Math.max(
        1,
        Math.round(Number(new URLSearchParams(location.search).get("speed"))) ||
          1,
      ),
    )
  : 1;

/** World pixels per second. */
const SPEED = 80;
/** How far the rider is drawn above the ground, so the horse shows under them. */
const RIDER_LIFT = 6;
/** The map of every farm type: where the horse can be ridden, with the village green. */
/** A creature's feet box, in world pixels. */
const CREATURE_BODY: Body = { hw: 5, h: 5 };
/** Placeholder colours for the first creatures, until the art pass. */
const CREATURE_COLOURS: Record<string, number> = {
  pebbleback: 0x8c8c94,
  dustmoth: 0xd9c08a,
  "rock-crab": 0x7a6a5a,
  mossbeetle: 0x5f8f4a,
  gloop: 0x6fd16f,
  frostnibbler: 0xbfe6f5,
  "icicle-hopper": 0x8fc8e8,
  "cave-bat": 0x5a4a78,
  nabbler: 0xc99a52,
  "gloop-blue": 0x5f9fe8,
  "cinder-pup": 0xe8703a,
  lanternmoth: 0xf5d76e,
  "old-digger": 0xe8e0cc,
  "gloop-red": 0xe85a5a,
};
/** The player's feet box, in world pixels. */
const PLAYER: Body = { hw: 5, h: 6 };

/** While Use is held with the axe or pickaxe, swing again this often, in milliseconds. */
const REPEAT_MS = 400;

/** Wheel movement that makes one slot step: one notch of a mouse wheel. */
const WHEEL_STEP = 100;

/** Fade time when the player walks through an exit, in milliseconds. */
const FADE_MS = 200;
/** Most the night overlay darkens the farm. */
const NIGHT_ALPHA = 0.5;

/** Where the scene starts. Game state lives in the game registry, not here. */
interface SceneData {
  map: string;
  entry: string;
}

/**
 * A walkable map, a player and one `GameState`. The use key uses the held
 * tool, the end-day key sleeps (both rebindable, see `core/bindings.ts`). Walking through an exit restarts the scene on the next map; the
 * state and the selected toolbar slot survive in the game registry.
 */
/** The tile step a push takes for each way the farmer faces. */
const PUSH: Record<Facing, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export class FarmScene extends Phaser.Scene {
  private state!: GameState;
  private selected = 0;
  private mapId: string = START.map;
  private entryName: string = START.entry;
  private leaving = false;
  /** The mine floor this map is, if it is one. */
  private floor: number | undefined;
  private floorState: Floor | undefined;
  /** False right after arriving on a ladder, until the player steps off it. */
  private ladderArmed = true;
  /** True once the player has stood off every exit tile, so a walk onto one counts. */
  private exitArmed = false;
  /** The last tile a held hoe or can worked by mouse drag. */
  private dragTile: { x: number; y: number } | undefined;
  /** Conditions that currently hold, for gated exits: "mines-open" from spring 5. */
  private holds = new Set<string>();
  private message = "";
  /** True after the first Action press on the ruined footbridge, which asks first. */
  private mendAsked = false;
  private hud!: Hud;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private sprites!: Phaser.GameObjects.Container;
  private ground!: Phaser.GameObjects.Graphics;
  /** The light layer: glow rings of placed lights and the worn ring (note 89). */
  private glow!: Phaser.GameObjects.Graphics;
  /** Bombs lit and counting down on this map. Never saved: they go off at once on leaving (note 89). */
  private litBombs: LitBomb[] = [];
  private bombFx!: Phaser.GameObjects.Graphics;
  private wash!: Phaser.GameObjects.Graphics;
  /** Dusk over the farm: fades in toward nightfall, which moves by season. */
  private night!: Phaser.GameObjects.Rectangle;
  private map!: FarmMap;
  /** The building tier the map was loaded at: the house rooms built so far. */
  private tier = 0;
  /** Drawn layers that show only while a condition holds (`when` or `unless`), such as the log. */
  private conditional: {
    drawn: Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown };
    layer: TiledLayer;
  }[] = [];
  private controls!: Controls;
  private player!: Phaser.GameObjects.Image;
  private target!: Phaser.GameObjects.Rectangle;
  /** Placeholder hat drawn on the player. */
  private hat!: Phaser.GameObjects.Rectangle;
  /** One placeholder block per creature on this floor, by creature id. */
  private creatureSprites = new Map<number, Phaser.GameObjects.Rectangle>();
  /** The swing flash, drawn in the world. */
  private swingFx!: Phaser.GameObjects.Graphics;
  /** The scene time before which the next weapon swing is refused. */
  private swingReady = 0;
  /** Burn damage not yet a whole point of health. */
  private burnDebt = 0;
  /** True while the naming dialog is open for the first ride. */
  private namingHorse = false;
  /** The horse under the rider while mounted (a placeholder block). */
  private steed!: Phaser.GameObjects.Rectangle;
  private pos: Vec = { x: 0, y: 0 };
  private facing: Facing = "down";
  private heldMs = 0;
  /** Who aimed last: the cursor or the keys (note 46). Desktop only. */
  private mouseAim = false;
  /** True while the left button is held in the world, for the axe repeat. */
  private mouseHeld = false;
  /** Wheel movement not yet turned into a slot step, so a trackpad is not too fast. */
  private wheelDelta = 0;
  /** Tap-to-move (note 27): the route still to walk, and what to do at the end. */
  private tapPath: Vec[] = [];
  /** A tapped spot in the world the sling shoots at, for a moment. */
  private tapShot?: { x: number; y: number; until: number };
  /** Villagers on this map right now and the placeholder blocks that show them (#599). */
  private villagers: Present[] = [];
  private villagerSprites = new Map<
    string,
    { box: Phaser.GameObjects.Rectangle; tag: Phaser.GameObjects.Text }
  >();
  /** The tile last checked for a heart event. */
  private eventTile = "";
  private villagerStamp = -1;
  private tapAct?: Vec;
  /** True when the route ends in using the held item on `tapAct` (note 27). */
  private tapActUses = false;
  /** The tile the last tap asked for, drawn as the target; red if no route. */
  private tapMark?: {
    x: number;
    y: number;
    bad: boolean;
    /** Grey: the tap only walks, the held item has no use there. */
    walk?: boolean;
    until: number;
  };
  private tapDown = false;
  private tapSwinging = false;
  private tapStuckMs = 0;

  constructor() {
    super("farm");
  }

  init(data: Partial<SceneData>): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.mapId = resolveMapId(data.map ?? START.map, this.state.farmType);
    this.entryName = data.entry ?? START.entry;
    this.state = this.registry.get(STATE_KEY) as GameState;
    // An area map (the Forest) has its own trees, rocks and forage: set them in
    // the state while the player is here, and put the farm's back anywhere else.
    leaveArea(this.state);
    enterArea(this.state, this.mapId);
    this.selected =
      (this.registry.get(SELECTED_KEY) as number | undefined) ?? 0;
    this.leaving = false;
    this.ladderArmed = true;
    this.exitArmed = false;
    this.floor = mineFloorOf(this.mapId);
    this.floorState = undefined;
    // A bad effect never leaves the floor it was caught on (note 94).
    this.state.combat.effects.clear();
    this.conditional = [];
    this.refreshHolds();
    this.heldMs = 0;
    this.mouseAim = false;
    this.mouseHeld = false;
    this.wheelDelta = 0;
    this.tapPath = [];
    this.tapAct = undefined;
    this.tapMark = undefined;
    this.tapDown = false;
    this.tapSwinging = false;
    this.tapStuckMs = 0;
    this.message = "";
  }

  create(): void {
    if (!this.textures.exists(PLAYER_KEY)) makePlaceholderTextures(this);

    const problems = maps.problems();
    if (problems.length > 0) console.warn("Map problems:", problems.join("; "));
    const id = this.mapId;
    const day = this.state.day.clock.day;
    // A mine floor is made from the day and the floor, so it is built here and
    // cached under a key that holds the day.
    const mineLayout =
      this.floor === undefined ? undefined : floorLayout(this.floor, day);
    const json = mineLayout ? floorMapJson(mineLayout) : mapFiles[id]!;
    // The house is one map that grows: only the layers at or below the house
    // tier are read and drawn, and the rest is black void.
    this.tier = this.buildingTier(id);
    const holds = holdsOf(this.state);
    // The house's spouse, renovation and corner stair layers bake into the map
    // (collision too), so its holds must be here and not only in `refreshHolds`.
    // A renovation is ordered at the carpenter's, so the house is rebuilt on entry.
    for (const h of houseHolds(
      this.state.houseTier,
      houseSpouse(this.state),
      this.state.houseRenos,
    ))
      holds.add(h);
    this.map = mineLayout
      ? FarmMap.fromTiled(json)
      : maps.getWith(id, holds, this.tier);
    // The coop and barn doors stand where the buildings were placed.
    if (isFarmMap(id)) this.map = mapWithDoors(this.state, this.map, id);
    if (isHouseMap(id)) carryFurniture(this.state, this.map, id);
    if (this.floor !== undefined)
      this.floorState = this.state.mines.visit(this.floor, day);
    const cacheKey = mineLayout ? `${id}@${day}` : id;
    if (!this.cache.tilemap.exists(cacheKey))
      this.cache.tilemap.add(cacheKey, {
        format: Phaser.Tilemaps.Formats.TILED_JSON,
        data: json,
      });

    // World objects: the tile layers, the player and the facing marker.
    const tilemap = this.make.tilemap({ key: cacheKey });
    const tileset = tilemap.addTilesetImage(TILESET_NAME, TILES_KEY)!;
    const world: Phaser.GameObjects.GameObject[] = [];
    for (const layer of layersAtTier(json, this.tier, holds)) {
      if (layer.type !== "tilelayer" || layer.visible === false) continue;
      const drawn = tilemap.createLayer(layer.name, tileset);
      if (drawn) world.push(drawn);
      if (
        drawn &&
        layer.properties?.some((q) => q.name === "when" || q.name === "unless")
      )
        this.conditional.push({ drawn, layer });
    }

    const ts = this.map.tileSize;
    // Plots and forage sit on the tiles, under the player.
    this.ground = this.add.graphics();
    this.sprites = this.add.container(0, 0);
    this.wash = this.add.graphics();
    world.push(this.ground, this.sprites, this.wash);
    world.push(...this.drawLabels());
    let spawn: { x: number; y: number } = this.map.entry(this.entryName)!;
    // Coming up from below lands on the ladder that was taken down.
    const ladder = this.floorState?.ladder;
    if (this.entryName === "from_below" && ladder) {
      spawn = ladder;
      this.ladderArmed = false;
    }
    this.pos = { x: (spawn.x + 0.5) * ts, y: (spawn.y + 1) * ts - 2 };
    this.steed = this.add
      .rectangle(this.pos.x, this.pos.y, 26, 14, 0x8a5a33)
      .setOrigin(0.5, 1)
      .setVisible(false);
    world.push(this.steed);
    this.player = this.add
      .image(this.pos.x, this.pos.y, PLAYER_KEY)
      .setOrigin(0.5, 0.875);
    this.hat = this.add.rectangle(0, 0, 10, 5, 0xffffff).setVisible(false);
    this.target = this.add
      .rectangle(0, 0, ts, ts)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.6);
    world.push(this.player, this.hat, this.target);
    this.swingFx = this.add.graphics().setDepth(900);
    world.push(this.swingFx);
    this.litBombs = [];
    this.bombFx = this.add.graphics().setDepth(901);
    world.push(this.bombFx);
    this.events.once("shutdown", () => this.detonateAll(true));
    this.creatureSprites = new Map();
    this.syncCombatSettings();
    for (const c of this.floorState?.creatures ?? [])
      world.push(this.addCreatureSprite(c));
    this.villagers = [];
    this.villagerSprites = new Map();
    this.villagerStamp = -1;
    this.syncVillagers(world);
    const built = this.map.bounds;
    this.night = this.add
      .rectangle(
        built.x * ts,
        built.y * ts,
        built.w * ts,
        built.h * ts,
        0x0a1030,
      )
      .setOrigin(0)
      .setAlpha(0)
      .setDepth(1000);
    world.push(this.night);
    this.glow = this.add.graphics().setDepth(1001);
    world.push(this.glow);

    // UI objects, drawn by a second camera that does not zoom.
    const settings = loadDeviceSettings();
    this.hud = new Hud(
      this,
      (i) => this.select(i),
      () => this.use(),
      () => this.action(),
      () => this.open("skills"),
      () => this.open("crafting"),
      () => this.open("hats"),
      () => this.select(nextRow(this.state, this.selected)),
      () => this.open("debug"),
      settings,
    );
    this.controls = createControls(
      this,
      settings,
      {
        use: () => (this.keyAim(), this.use()),
        action: () => (this.keyAim(), this.action()),
        eat: () => this.eatHeld(),
        openSkills: () => this.open("skills"),
        openCraft: () => this.open("crafting"),
        openHats: () => this.open("hats"),
        endDay: () => this.endDay(),
        toggleHints: () => {
          settings.showHints = !settings.showHints;
          this.hud.setHintsShown(settings.showHints);
          saveSettings(browserSettingsStore, settings);
        },
        openDebug: () => this.open("debug"),
        nextSlot: () =>
          this.select(cycle(this.selected, 1, toolbarSize(this.state))),
        nextRow: () => this.select(nextRow(this.state, this.selected)),
        selectSlot: (i) => this.select(i),
      },
      (p) => this.hud.covers(p.x, p.y),
    );
    const ui = [...this.controls.objects, ...this.hud.objects];

    const { width, height } = this.scale.gameSize;
    const uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera = uiCamera;
    uiCamera.ignore(world);
    this.cameras.main.startFollow(this.player, true).ignore(ui);
    // The canvas is the window: zoom, bounds and the HUD follow its size and
    // the zoom and UI size settings (note 64).
    this.layoutView();
    const relayout = (): void => this.layoutView();
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);
    this.events.on(Phaser.Scenes.Events.RESUME, relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, relayout);
      this.events.off(Phaser.Scenes.Events.RESUME, relayout);
    });

    this.initZoomControl();

    // The mouse (note 46): moving the cursor hands it the aim, left-click uses
    // the held tool, right-click is Action. Touch pointers never count, and
    // the HUD gets its own clicks first.
    if (this.controls.profile === "desktop") {
      this.input.mouse?.disableContextMenu();
      const mine = (
        p: Phaser.Input.Pointer,
        over?: Phaser.GameObjects.GameObject[],
      ): boolean => !p.wasTouch && !over?.length && !this.hud.covers(p.x, p.y);
      const onMove = (p: Phaser.Input.Pointer): void => {
        if (mine(p)) this.mouseAim = true;
      };
      const onDown = (
        p: Phaser.Input.Pointer,
        over: Phaser.GameObjects.GameObject[],
      ): void => {
        if (!mine(p, over)) return;
        this.turnToAim();
        if (p.rightButtonDown()) this.action();
        else if (p.leftButtonDown()) {
          this.mouseHeld = true;
          this.dragTile = this.aimTile();
          this.use();
        }
      };
      const onUp = (p: Phaser.Input.Pointer): void => {
        if (!p.leftButtonDown()) this.mouseHeld = false;
      };
      // Wheel down is the next slot, up the previous (Stardew, from memory).
      const onWheel = (
        p: Phaser.Input.Pointer,
        _over: unknown,
        _dx: number,
        dy: number,
      ): void => {
        if (p.wasTouch) return;
        if (Math.sign(dy) !== Math.sign(this.wheelDelta)) this.wheelDelta = 0;
        this.wheelDelta += dy;
        while (Math.abs(this.wheelDelta) >= WHEEL_STEP) {
          const step = this.wheelDelta > 0 ? 1 : -1;
          this.wheelDelta -= step * WHEEL_STEP;
          this.select(cycle(this.selected, step, toolbarSize(this.state)));
        }
      };
      this.input.on("wheel", onWheel);
      this.input.on("pointermove", onMove);
      this.input.on("pointerdown", onDown);
      this.input.on("pointerup", onUp);
      const release = (): void => void (this.mouseHeld = false);
      // A button let go while a screen had the farm paused is never seen.
      this.events.on("resume", release);
      this.events.once("shutdown", () => {
        this.events.off("resume", release);
        this.input.off("wheel", onWheel);
        this.input.off("pointermove", onMove);
        this.input.off("pointerdown", onDown);
        this.input.off("pointerup", onUp);
      });
    }

    if (this.controls.profile === "touch" && settings.touchScheme === "tap")
      this.initTapInput();

    this.cameras.main.fadeIn(FADE_MS);
    // The villager at the door asks about the cave, once a morning.
    const today = this.state.day.clock.day;
    if (isFarmMap(this.mapId) && greencoatDue(this.state)) {
      this.time.delayedCall(400, () => this.open("greencoat"));
    } else if (isFarmMap(this.mapId) && this.state.cave.due(today)) {
      this.state.cave.shownDay = today;
      this.time.delayedCall(400, () => this.open("cave-choice"));
    } else if (isFarmMap(this.mapId) && this.state.orders.introDue(today)) {
      this.time.delayedCall(400, () => this.showOrdersIntro());
    }
    this.time.addEvent({
      delay: TICK_MS / DEV_SPEED,
      loop: true,
      callback: () => {
        // Time stands still on a festival map, as in Stardew.
        if (isFestivalMap(this.mapId)) return;
        this.state.day.act(0, TICK_MINUTES);
        this.strikeFlash(rollStrikes(this.state, TICK_MINUTES, Math.random));
        this.afterAction();
      },
    });
    // Restarting the scene keeps its event listeners, so drop this one on
    // shutdown or each map change would add another and run it twice.
    const resumed = (
      _sys: unknown,
      data?: { sleep?: boolean; goto?: { map: string; entry: string } },
    ) => {
      this.syncCombatSettings();
      if (data?.sleep) return this.endDay();
      if (data?.goto) return this.travel(data.goto.map, data.goto.entry);
      // Slept or passed out away from the farm: the night put the farm's world
      // back, so wake at home.
      if (isAreaMap(this.mapId) && areaOf(this.state) === undefined)
        return this.travel("farm", "from_house");
      if (this.namingHorse) {
        this.namingHorse = false;
        return this.getOn();
      }
      this.save();
      // A new day on a mine floor: the floor is gone, so wake at home.
      if (
        this.floor !== undefined &&
        !this.state.mines.today(this.floor, this.state.day.clock.day)
      )
        return this.travel("farm", "from_house");
      // A new house tier (the carpenter finished, or the debug menu) means
      // more rooms to draw: reload the house at its door.
      if (this.tier !== this.buildingTier(this.mapId)) {
        const data: SceneData = { map: this.mapId, entry: "door" };
        this.scene.restart(data);
        return;
      }
      this.message = "";
      this.render();
      // Fall 2 of year one: the orders board goes up, in any weather.
      if (
        isFarmMap(this.mapId) &&
        this.state.orders.introDue(this.state.day.clock.day)
      ) {
        this.showOrdersIntro();
        return;
      }
      // The debug menu can hand out XP that earns a profession choice.
      if (pendingChoice(this.state.skills)) this.open("profession");
    };
    this.events.on("resume", resumed);
    this.events.once("shutdown", () => this.events.off("resume", resumed));
    // A horse left here may now stand where it should not.
    settleHorse(
      this.state,
      this.mapId,
      this.parkWorld(),
      tileOf(this.pos, PLAYER, this.map.tileSize),
    );
    this.render();

    if (import.meta.env.DEV)
      (window as unknown as { farmGive: unknown }).farmGive = (
        id: string,
        n: number,
      ) => {
        const result = giveItem(this.state, id, n);
        this.render();
        return result;
      };
    if (import.meta.env.DEV)
      (window as unknown as { farmMoney: unknown }).farmMoney = (n: number) => {
        giveMoney(this.state, n);
        this.render();
      };
    // Dev hook for the playtest bot (#333): walk to a tile by the tap route, so
    // the bot does not time key holds. Returns false when there is no route.
    if (import.meta.env.DEV)
      (window as unknown as { farmWalk: unknown }).farmWalk = (
        x: number,
        y: number,
      ) => {
        this.cancelTap();
        const plan = this.planAt({ x, y });
        if (!plan) return false;
        this.tapPath = plan.path;
        return true;
      };
    // Dev hook for the playtest bot: an item's display name, to find its row
    // in a shop list by label.
    if (import.meta.env.DEV)
      (window as unknown as { farmItemName: unknown }).farmItemName = (
        id: string,
      ) => itemById(id)?.name;
    // Dev hook for the playtest bot (#333): every tile the farmer cannot stand
    // on now (walls, trees, rocks, machines, furniture), as "x,y" strings.
    if (import.meta.env.DEV)
      (window as unknown as { farmBlocked: unknown }).farmBlocked = () => {
        const out: string[] = [];
        for (let y = 0; y < this.map.height; y++)
          for (let x = 0; x < this.map.width; x++)
            if (this.tileBlocked(x, y)) out.push(`${x},${y}`);
        return out;
      };
    if (import.meta.env.DEV)
      (window as unknown as { farmDebug: () => unknown }).farmDebug = () => ({
        pos: this.pos,
        tile: tileOf(this.pos, PLAYER, ts),
        facing: this.facing,
        walking: this.tapPath.length > 0,
        selected: this.selected,
        target: this.aimTile(),
        map: this.mapId,
        exit: this.exitAtAim()?.id ?? null,
        zoom: this.cameras.main.zoom,
        energy: this.state.day.energy.current,
        plots: [...this.state.farm.each()].length,
        trees: this.state.trees.count,
        wood: this.state.inventory.count("wood"),
        seeds: this.state.inventory.count("parsnip-seed"),
        harvested: this.state.inventory.count("parsnip"),
        message: this.message,
        day: this.state.day.clock.day,
        money: this.state.money,
        houseTier: this.state.houseTier,
        houseBuild: this.state.houseBuild ?? null,
        mounted: this.state.animals.mounted,
        horse: this.state.animals.horse,
        health: this.state.combat.health.current,
        creatures: (this.floorState?.creatures ?? []).map((c) => ({
          uid: c.uid,
          kind: c.kind,
          x: c.x,
          y: c.y,
          hp: c.hp,
          state: c.state,
        })),
      });
  }

  update(_time: number, delta: number): void {
    // Cap the step so a stalled frame cannot throw the player across the map.
    const dt = Math.min(delta, 50) / 1000;
    this.night.setAlpha(
      this.outdoorSoil || festivalOfMap(this.mapId)?.activity === "maze"
        ? NIGHT_ALPHA *
            darkness(
              dateOf(this.state.day.clock.day).season,
              this.state.day.clock.minutes,
            )
        : 0,
    );
    this.drawGlow();
    this.updateBombs(dt);
    this.syncVillagers();
    this.checkHeartEvent();
    const walking = this.tapPath.length > 0;
    const v = walking ? this.tapVector(dt) : this.controls.vector();
    if (!walking && (v.x !== 0 || v.y !== 0)) this.cancelTap();
    this.facing = facingFrom(v, this.facing);
    if (v.x !== 0 || v.y !== 0) this.keyAim();
    const ts = this.map.tileSize;
    const before = { ...this.pos };
    const slowed = this.state.combat.effects.speedFactor();
    for (let i = 0; i < DEV_SPEED; i++)
      this.pos = move(
        this.pos,
        {
          x: v.x * SPEED * speedFactor(this.state) * slowed * dt,
          y: v.y * SPEED * speedFactor(this.state) * slowed * dt,
        },
        PLAYER,
        ts,
        (x, y) => this.tileBlocked(x, y),
      );
    const ahead = facingTile(this.pos, PLAYER, this.facing, ts);
    if (
      (v.x !== 0 || v.y !== 0) &&
      this.tileShutForFestival(ahead.x, ahead.y)
    ) {
      const line = festivalShutLine(this.state.day.clock.day);
      if (this.message !== line) {
        this.message = line;
        this.render();
      }
    }
    if (v.x !== 0 || v.y !== 0) {
      const g = this.map.gateAt(ahead.x, ahead.y);
      const rule = g && parseGate(g.rule);
      if (rule && this.gateShut(ahead.x, ahead.y)) {
        const line = gateShutLine(this.mapId, rule);
        if (this.message !== line) {
          this.message = line;
          this.render();
        }
      }
    }
    if (walking && this.tapPath.length > 0) {
      const moved = Math.hypot(this.pos.x - before.x, this.pos.y - before.y);
      this.tapStuckMs =
        moved < SPEED * dt * 0.2 ? this.tapStuckMs + dt * 1000 : 0;
      // A body in the way: give up after a short wait, as note 27 says.
      if (this.tapStuckMs > 600) {
        this.cancelTap();
        this.tapMark = undefined;
      }
    }
    const riding = this.state.animals.mounted;
    this.steed.setVisible(riding).setPosition(this.pos.x, this.pos.y);
    this.player.setPosition(this.pos.x, this.pos.y - (riding ? RIDER_LIFT : 0));
    this.drawHat();
    this.repeatUse(delta * DEV_SPEED);
    this.dragSoilWork();
    this.pickUp();
    this.updateCombat(dt);

    const mark = this.tapMark;
    if (mark && this.time.now > mark.until) this.tapMark = undefined;
    const front = this.tapMark ?? this.aimTile();
    this.target.setPosition(front.x * ts, front.y * ts);
    // Red when the mouse points at a tile that can never be used (note 46),
    // or a tap found no route (note 27).
    const blocked = this.tapMark
      ? this.tapMark.bad
      : this.mouseAim && this.map.isBlocked(front.x, front.y);
    const grey = !!this.tapMark?.walk;
    this.target.setStrokeStyle(
      1,
      blocked ? 0xff4040 : grey ? 0x909090 : 0xffffff,
      blocked ? 0.9 : grey ? 0.5 : 0.6,
    );

    const here = tileOf(this.pos, PLAYER, ts);
    const down = this.floorState?.ladder;
    if (down && here.x === down.x && here.y === down.y) {
      if (this.ladderArmed) return this.descend();
    } else this.ladderArmed = true;
    // Walking onto an open-land exit, or out of a building, takes it. Doors into buildings need opening (click or Action).
    const found = this.map.exitAt(here.x, here.y);
    const onExit = found && this.isWalkThrough(found) ? found : undefined;
    if (!onExit) this.exitArmed = true;
    else if (this.exitArmed && !this.leaving) {
      this.exitArmed = false;
      this.useDoor(onExit);
    }
  }

  /**
   * True for an exit you walk onto: one on the map edge that is three or more
   * tiles wide (open land), or any edge exit inside a building (leaving).
   * Going into a building still needs the door opened (click or Action).
   */
  private isWalkThrough(e: Exit): boolean {
    const edge =
      e.x === 0 ||
      e.y === 0 ||
      e.x + e.w >= this.map.width ||
      e.y + e.h >= this.map.height;
    return edge && (!this.outdoorWorld || Math.max(e.w, e.h) >= 3);
  }

  /** The tier layers a growing building map shows: the house rooms or the coop size built so far. */
  private buildingTier(id: string): number {
    if (isHouseMap(id)) return houseVisibleTier(this.state.houseTier);
    if (id === COOP_MAP) return coopVisibleTier(this.state.animals.tier);
    if (id === BARN_MAP) return barnVisibleTier(this.state.animals.barnTier);
    return 0;
  }

  /**
   * True if the farmer cannot stand on the tile: a wall, tree, rock, machine or
   * a horse left standing there (never one that is ridden or at the stable).
   */
  private tileBlocked(x: number, y: number): boolean {
    return (
      this.tileBlockedNoHorse(x, y) || horseBlocks(this.state, this.mapId, x, y)
    );
  }

  /** What the horse may and may not stand on here (note 59, "Blocking"). */
  private parkWorld(): ParkWorld {
    const home = stableHome(this.state, this.mapId);
    const near = (x: number, y: number): boolean => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const [tx, ty] = [x + dx, y + dy];
          if (
            this.map.exitAt(tx, ty) ||
            this.map.serviceAt(tx, ty) ||
            this.map.entries.some((e) => e.x === tx && e.y === ty) ||
            (home && home.x === tx && home.y === ty)
          )
            return true;
        }
      return false;
    };
    return {
      width: this.map.width,
      height: this.map.height,
      blocked: (x, y) => this.tileBlockedNoHorse(x, y),
      reserved: near,
    };
  }

  private tileBlockedNoHorse(x: number, y: number): boolean {
    const log = this.map.logAt(x, y);
    return (
      this.map.isBlocked(x, y) ||
      this.gateShut(x, y) ||
      this.tileShutForFestival(x, y) ||
      (log !== undefined && !logCleared(this.state, log)) ||
      (this.outdoorWorld && this.state.trees.blocks(x, y)) ||
      !!this.store.fruitTrees.at(x, y) ||
      !!this.rocks()?.at(x, y) ||
      this.furnaceAt(x, y) ||
      coopBlocks(this.state, this.mapId, x, y) ||
      barnBlocks(this.state, this.mapId, x, y) ||
      siloBlocks(this.state, this.mapId, x, y) ||
      stableBlocks(this.state, this.mapId, x, y) ||
      pondBlocks(this.state, this.mapId, x, y) ||
      ((this.mapId === COOP_MAP || this.mapId === BARN_MAP) &&
        animalSlots(this.state, this.mapId === COOP_MAP ? "coop" : "barn").some(
          (s) => s.x === x && s.y === y,
        )) ||
      this.state.furniture.blocks(this.mapId, x, y) ||
      (this.mapId === CELLAR_MAP && this.state.casks.at(x, y)) ||
      !!this.state.chests.at(this.mapId, x, y) ||
      !!this.state.placed.covering(lightMapKey(this.mapId), x, y) ||
      (isFarmMap(this.mapId) && !!rodAt(this.state, x, y)) ||
      this.map.serviceAt(x, y)?.kind === "camp-chest" ||
      !!this.store.sprinklers.at(x, y) ||
      (this.outdoorSoil && !!this.state.machines.at(x, y))
    );
  }

  /** The sprinklers, trees and soil of the map the player is on (`mapstore.ts`). */
  private get store() {
    return storeOf(this.state, this.map.indoors);
  }

  /** True on a map with the farm's soil: its trees, weeds, forage and machines live here. The greenhouse has its own soil. */
  private get outdoorSoil(): boolean {
    return this.map.hasSoil && !this.map.indoors;
  }

  /** True outdoors on the farm or an area map: the map whose trees, rocks and forage are the state's. */
  private get outdoorWorld(): boolean {
    return !this.map.indoors && (this.map.hasSoil || isAreaMap(this.mapId));
  }

  /** The tile under a screen point, in the world. */
  private tileAtPointer(p: Phaser.Input.Pointer): Vec {
    const ts = this.map.tileSize;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    return { x: Math.floor(w.x / ts), y: Math.floor(w.y / ts) };
  }

  /** Something a tap can act on: a thing that blocks the way, or a door. */
  private tapObject(x: number, y: number): boolean {
    if (this.map.isBlocked(x, y) && !this.map.serviceAt(x, y)) return false;
    return true;
  }

  /** Plan a tap on a tile, or undefined when there is no route (red target). */
  private planAt(tap: Vec): TapPlan | undefined {
    const ts = this.map.tileSize;
    const plan = planTap(
      {
        width: this.map.width,
        height: this.map.height,
        blocked: (x, y) => this.tileBlocked(x, y),
      },
      tileOf(this.pos, PLAYER, ts),
      tap,
      (x, y) => this.tapObject(x, y),
    );
    if (plan && !plan.act && this.map.exitAt(tap.x, tap.y)) plan.act = tap;
    return plan;
  }

  /** Stop walking by route and forget what the last tap wanted. */
  private cancelTap(): void {
    this.tapPath = [];
    this.tapAct = undefined;
    this.tapActUses = false;
    this.tapSwinging = false;
    this.tapStuckMs = 0;
  }

  /**
   * Tap-to-move (note 27): tap a spot and the farmer walks there by the
   * shortest route; tap an object and the farmer walks beside it and acts,
   * with the right tool for a tree or rock. A tap on the tile beside the
   * farmer faces it and uses the held tool, for careful tilling and placing.
   * Holding a finger down makes the farmer follow it.
   */
  private initTapInput(): void {
    const mine = (
      p: Phaser.Input.Pointer,
      over?: Phaser.GameObjects.GameObject[],
    ): boolean => !over?.length && !this.hud.covers(p.x, p.y) && !this.leaving;
    const aimAtTap = (p: Phaser.Input.Pointer, fresh: boolean): void => {
      // With a sling held on a mine floor a tap shoots at the spot, no walking.
      if (fresh && this.floorState && this.slingHeld()) {
        const w = this.cameras.main.getWorldPoint(p.x, p.y);
        this.cancelTap();
        this.keyAim();
        this.tapShot = { x: w.x, y: w.y, until: this.time.now + 300 };
        this.use();
        return;
      }
      const tap = this.tileAtPointer(p);
      const here = tileOf(this.pos, PLAYER, this.map.tileSize);
      const dx = tap.x - here.x;
      const dy = tap.y - here.y;
      const beside = Math.abs(dx) + Math.abs(dy) === 1;
      const held = heldAt(this.state, this.selected);
      // A tap on the farmer's own tile gets off the horse, else eats the held
      // food (note 27, "Tap makes the Action button obsolete").
      if (fresh && dx === 0 && dy === 0) {
        if (this.state.animals.mounted) {
          this.cancelTap();
          return this.getOff();
        }
        if (held.kind === "item" && itemById(held.id)?.energy !== undefined) {
          this.cancelTap();
          return this.eatHeld();
        }
      }
      // A ripe crop, forage or fruit, or the horse, is picked by hand first.
      const hand = this.tapHand(tap);
      // One rule (note 27): a soil-work item is used where it fits and the tap
      // only walks where it does not. Other items keep the old rule.
      const fit = hand
        ? "other"
        : tapUse(this.state, this.map, held, tap.x, tap.y);
      const thing =
        hand ||
        (this.tapObject(tap.x, tap.y) && this.tileBlocked(tap.x, tap.y));
      const exit = !!this.map.exitAt(tap.x, tap.y);
      // A tapper goes on a tree, whose tile is blocked (note 92).
      const tapper = held.kind === "item" && held.id === TAPPER;
      if (fit === "use" && (tapper || !this.tileBlocked(tap.x, tap.y))) {
        // A drag uses each new tile beside the farmer at once.
        if (beside) {
          this.cancelTap();
          this.keyAim();
          this.facing = facingFrom({ x: dx, y: dy }, this.facing);
          this.tapMark = { ...tap, bad: false, until: this.time.now + 300 };
          this.use();
          return;
        }
        const plan = planUse(
          {
            width: this.map.width,
            height: this.map.height,
            blocked: (x, y) => this.tileBlocked(x, y),
          },
          here,
          tap,
        );
        if (!plan) {
          this.cancelTap();
          this.tapMark = { ...tap, bad: true, until: this.time.now + 700 };
          return;
        }
        this.startRoute(plan, tap, false);
        return;
      }
      if (fresh && beside && (fit === "other" || thing || exit)) {
        // A tap beside the farmer: face it and use the held tool.
        this.cancelTap();
        this.keyAim();
        this.facing = facingFrom({ x: dx, y: dy }, this.facing);
        this.tapMark = { ...tap, bad: false, until: this.time.now + 300 };
        if (thing) this.actOn(tap);
        else if (exit) this.action();
        else this.use();
        return;
      }
      let plan = this.planAt(tap);
      if (hand && !this.tileBlocked(tap.x, tap.y)) {
        // Walk beside an open tile, then pick by hand (not use the held item).
        const beside = planUse(
          {
            width: this.map.width,
            height: this.map.height,
            blocked: (x, y) => this.tileBlocked(x, y),
          },
          here,
          tap,
        );
        plan = beside && { ...beside, use: false };
      }
      if (!plan) {
        this.cancelTap();
        this.tapMark = { ...tap, bad: true, until: this.time.now + 700 };
        return;
      }
      this.startRoute(plan, tap, fit === "walk");
    };
    const onDown = (
      p: Phaser.Input.Pointer,
      over: Phaser.GameObjects.GameObject[],
    ): void => {
      if (!mine(p, over)) return;
      this.tapDown = true;
      aimAtTap(p, true);
    };
    let last = "";
    const onMove = (p: Phaser.Input.Pointer): void => {
      if (!this.tapDown || !p.isDown || this.hud.covers(p.x, p.y)) return;
      const t = this.tileAtPointer(p);
      const k = `${t.x},${t.y}`;
      if (k === last) return;
      last = k;
      aimAtTap(p, false);
    };
    const onUp = (): void => {
      this.tapDown = false;
      last = "";
    };
    this.input.on("pointerdown", onDown);
    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
    this.events.once("shutdown", () => {
      this.input.off("pointerdown", onDown);
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);
    });
  }

  private slingHeld(): boolean {
    const h = heldAt(this.state, this.selected);
    return (
      h.kind === "item" &&
      isWeapon(h.id) &&
      weaponById(h.id)?.family === "sling"
    );
  }

  /**
   * Show the villagers the schedule puts on this map (#599). Runs each frame
   * but only does work when the game minute or day changes. Placeholder blocks
   * with a name tag; people jump between schedule stops (no walking yet).
   */
  private syncVillagers(world?: Phaser.GameObjects.GameObject[]): void {
    const clock = this.state.day.clock;
    const stamp = clock.day * 2000 + clock.minutes;
    if (stamp === this.villagerStamp) return;
    this.villagerStamp = stamp;
    // Time stands still on a festival map, and the festival routes are not built.
    this.villagers = isFestivalMap(this.mapId)
      ? []
      : villagersOn(this.state, this.mapId, clock.day, clock.minutes);
    const ts = this.map.tileSize;
    const here = new Set(this.villagers.map((v) => v.id));
    for (const [id, s] of this.villagerSprites)
      if (!here.has(id)) {
        s.box.destroy();
        s.tag.destroy();
        this.villagerSprites.delete(id);
      }
    for (const v of this.villagers) {
      let s = this.villagerSprites.get(v.id);
      if (!s) {
        let hash = 0;
        for (const ch of v.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        const colour = Phaser.Display.Color.HSLToColor(
          (hash % 360) / 360,
          0.5,
          0.55,
        ).color;
        const box = this.add
          .rectangle(0, 0, 10, 12, colour)
          .setOrigin(0.5, 1)
          .setStrokeStyle(1, 0x000000, 0.6)
          .setDepth(5);
        const tag = this.add
          .text(0, 0, v.name, {
            fontSize: "8px",
            color: "#ffffff",
            backgroundColor: "#000000aa",
            padding: { x: 2, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setDepth(900);
        if (world) world.push(box, tag);
        else this.uiCamera.ignore([box, tag]);
        s = { box, tag };
        this.villagerSprites.set(v.id, s);
      }
      const px = (v.x + 0.5) * ts;
      const py = (v.y + 1) * ts - 1;
      s.box.setPosition(px, py);
      s.tag.setPosition(px, py - 13);
    }
  }

  /** Talk to a villager, or give them the held item (#599, note 61). Returns false if nobody is on the tile. */
  private meetVillager(tile: Vec): boolean {
    const who = presentAt(this.villagers, tile.x, tile.y);
    if (!who) return false;
    const held = heldAt(this.state, this.selected);
    const r = meet(
      this.state,
      who.id,
      held.kind === "item" ? held.id : undefined,
    );
    this.message = r.message;
    this.render();
    return true;
  }

  /** True when a tap on the tile picks by hand: ripe crop, forage, fruit, or the horse. */
  private tapHand(tile: Vec): boolean {
    if (presentAt(this.villagers, tile.x, tile.y)) return true;
    if (tapPick(this.state, this.map, tile.x, tile.y)) return true;
    const spot = this.horseSpot();
    return (
      !this.state.animals.mounted &&
      !!spot &&
      spot.x === tile.x &&
      spot.y === tile.y
    );
  }

  /** Act on a tile beside the farmer: the axe for a tree, the pickaxe for a rock. */
  private actOn(tile: Vec): void {
    if (this.tapHand(tile)) return this.action();
    const tree =
      (!this.map.indoors && this.state.trees.at(tile.x, tile.y)) ||
      this.store.fruitTrees.at(tile.x, tile.y);
    const rock = this.rocks()?.at(tile.x, tile.y);
    if (tree || rock) {
      this.select(TOOLS.indexOf(tree ? "axe" : "pickaxe"));
      this.tapSwinging = true;
      this.heldMs = 0;
      this.use();
    } else this.action();
  }

  /** Follow a planned route and draw its target: white to use, grey to only walk. */
  private startRoute(plan: TapPlan, tap: Vec, walkOnly: boolean): void {
    this.tapPath = plan.path;
    this.tapAct = plan.act;
    this.tapActUses = !!plan.use;
    this.tapSwinging = false;
    this.tapStuckMs = 0;
    this.tapMark = {
      ...tap,
      bad: false,
      walk: walkOnly && !plan.act,
      until: Infinity,
    };
    if (plan.path.length === 0 && plan.act) this.arrive();
  }

  /** The farmer is where the route ended: face the target and act on it. */
  private arrive(): void {
    const act = this.tapAct;
    const uses = this.tapActUses;
    this.tapAct = undefined;
    this.tapActUses = false;
    this.tapMark = undefined;
    if (!act) return;
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    const dx = act.x - here.x;
    const dy = act.y - here.y;
    this.keyAim();
    if (dx !== 0 || dy !== 0)
      this.facing = facingFrom({ x: dx, y: dy }, this.facing);
    if (dx === 0 && dy === 0) return void this.action();
    if (uses) return this.use();
    this.actOn(act);
  }

  /** The push for this frame along the route, and the end of it on arrival. */
  private tapVector(dt: number): Vec {
    const next = this.tapPath[0];
    if (!next) return { x: 0, y: 0 };
    const ts = this.map.tileSize;
    const tx = (next.x + 0.5) * ts;
    const ty = (next.y + 0.5) * ts + PLAYER.h / 2;
    const dx = tx - this.pos.x;
    const dy = ty - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= Math.max(2, SPEED * dt * DEV_SPEED)) {
      this.tapPath.shift();
      this.tapStuckMs = 0;
      if (this.tapPath.length === 0) this.arrive();
      return { x: 0, y: 0 };
    }
    return { x: dx / dist, y: dy / dist };
  }

  /** A click turns the farmer toward the aim, on click only (note 46). */
  private turnToAim(): void {
    this.mouseAim = true;
    const ts = this.map.tileSize;
    const p = this.input.activePointer;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const cursor = { x: Math.floor(w.x / ts), y: Math.floor(w.y / ts) };
    this.facing = aimAt(
      tileOf(this.pos, PLAYER, ts),
      cursor,
      this.facing,
    ).facing;
  }

  /** A key press or a step hands the aim back to the faced tile. */
  private keyAim(): void {
    this.mouseAim = false;
  }

  /**
   * The tile a use, an action and the highlight work on: the faced tile, or in
   * mouse mode the tile under the cursor (note 46). The pointer is read each
   * call, so the aim follows the camera as the farmer walks.
   */
  private aimTile(): { x: number; y: number } {
    const ts = this.map.tileSize;
    if (!this.mouseAim) return facingTile(this.pos, PLAYER, this.facing, ts);
    const p = this.input.activePointer;
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const cursor = { x: Math.floor(w.x / ts), y: Math.floor(w.y / ts) };
    const here = tileOf(this.pos, PLAYER, ts);
    // The hoe, can and seeds work the tile the farmer stands on when the cursor is on it.
    if (cursor.x === here.x && cursor.y === here.y && this.heldSoilTool())
      return here;
    return aimAt(here, cursor, this.facing).tile;
  }

  /** True when the held thing is the hoe, the watering can or a seed packet. */
  private heldSoilTool(): boolean {
    const held = heldAt(this.state, this.selected);
    if (held.kind === "item")
      return !!cropOfSeed(held.id) || held.id === MIXED_SEED;
    return held.kind === "tool" && (held.tool === "hoe" || held.tool === "can");
  }

  /**
   * Holding the mouse with the hoe, can or seeds drags the work along: each new tile
   * the cursor reaches is dug, watered or planted at once.
   */
  private dragSoilWork(): void {
    if (!this.mouseHeld || !this.mouseAim || !this.heldSoilTool()) {
      this.dragTile = undefined;
      return;
    }
    const t = this.aimTile();
    const last = this.dragTile;
    if (last && last.x === t.x && last.y === t.y) return;
    this.dragTile = t;
    if (last) this.use();
  }

  /** Pull in goods lying on the ground near the player, as far as the bag has room. */
  private pickUp(): void {
    if (!this.outdoorSoil || this.state.ground.count === 0) return;
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    if (
      this.state.ground.collect(
        this.state.inventory,
        here,
        pickupRadius(this.state.equipment.magnetBonus()),
      )
    )
      this.render();
  }

  /**
   * Holding Use swings again every `REPEAT_MS`: the axe until the tree is
   * gone, the pickaxe until the rock is broken.
   */
  private repeatUse(delta: number): void {
    const held = heldAt(this.state, this.selected);
    const front = this.aimTile();
    // Holding carries on from a felled tree to its stump, as Stardew's held
    // tool does. It stops once there is nothing left on the tile.
    const axe =
      held.kind === "tool" &&
      held.tool === "axe" &&
      !!(
        (!this.map.indoors && this.state.trees.at(front.x, front.y)) ||
        this.store.fruitTrees.at(front.x, front.y)
      );
    const pick =
      held.kind === "tool" &&
      held.tool === "pickaxe" &&
      !!this.rocks()?.at(front.x, front.y);
    if (
      !(axe || pick) ||
      !(
        this.controls.useHeld() ||
        this.hud.useHeld ||
        this.mouseHeld ||
        this.tapSwinging
      )
    ) {
      this.heldMs = 0;
      if (!(axe || pick)) this.tapSwinging = false;
      return;
    }
    this.heldMs += delta;
    if (this.heldMs < REPEAT_MS) return;
    this.heldMs = 0;
    this.use();
  }

  /** The door on the faced tile, or the one under the player. */
  private exitAtAim(): Exit | undefined {
    const front = this.aimTile();
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    return this.map.exitAt(front.x, front.y) ?? this.map.exitAt(here.x, here.y);
  }

  /**
   * Open the door on the faced tile, or the one under the player. Returns
   * false when there is no door there. A door that is not open yet says so.
   */
  private useDoor(at: Exit | undefined = this.exitAtAim()): boolean {
    if (this.leaving) return false;
    const exit = at;
    if (!exit) return false;
    // The Larder may have been finished at the hall since the last morning.
    this.refreshHolds();
    const doorShut =
      this.mapId === "hearthwell" ? doorShutLine(this.state, exit.id) : "";
    if (doorShut) {
      this.message = doorShut;
      this.render();
    } else if (this.exitShutForFestival(exit)) {
      this.message = festivalShutLine(this.state.day.clock.day);
      this.render();
    } else if (exitOpen(exit, this.holds)) this.leave(exit);
    else {
      this.message =
        exit.id === "greenhouse"
          ? "The greenhouse is a ruin. Finish the Larder bundles at the village hall to repair it."
          : exit.id === "to_quarry"
            ? QUARRY_BRIDGE_LINE
            : exit.id === "ferry"
              ? FERRY_LINE
              : "It is shut.";
      this.render();
    }
    return true;
  }

  /** Where the player stands now, as a map and a tile. */
  private hereTile(): { map: string; x: number; y: number } {
    const t = tileOf(this.pos, PLAYER, this.map.tileSize);
    return { map: this.mapId, x: t.x, y: t.y };
  }

  /**
   * True when the exit lands in a festival place that is not open yet
   * (note 82 decision 12). Only exits whose target map is built are checked.
   * Placeholder: the hall counts as not restored until that is tracked.
   */
  private exitShutForFestival(exit: Exit): boolean {
    const target = maps.get(resolveMapId(exit.map, this.state.farmType));
    const at = target?.entry(exit.entry);
    if (!at) return false;
    const clock = this.state.day.clock;
    return festivalStepShut(clock.day, clock.minutes, this.hereTile(), {
      map: resolveMapId(exit.map, this.state.farmType),
      x: at.x,
      y: at.y,
    });
  }

  /** True when walking onto this tile of the current map is shut by a festival setting up. */
  /** True on a gated bedroom door the player has not earned the hearts for yet. */
  private gateShut(x: number, y: number): boolean {
    const g = this.map.gateAt(x, y);
    if (!g) return false;
    const rule = parseGate(g.rule);
    if (!rule) return false;
    return !gateOpen(this.mapId, rule, (id) =>
      this.state.friendship.hearts(id),
    );
  }

  private tileShutForFestival(x: number, y: number): boolean {
    const clock = this.state.day.clock;
    return festivalStepShut(clock.day, clock.minutes, this.hereTile(), {
      map: this.mapId,
      x,
      y,
    });
  }

  private leave(exit: Exit): void {
    this.travel(exit.map, exit.entry);
  }

  /**
   * In game zoom (note 64): the minus and plus keys step it, and two fingers
   * pinch it. Both apply at once and save for this device.
   */
  private initZoomControl(): void {
    const current = (): number =>
      (this.registry.get(WORLD_ZOOM_KEY) as number | undefined) ?? 100;
    const apply = (percent: number, save: boolean): void => {
      if (percent === current()) return;
      this.registry.set(WORLD_ZOOM_KEY, percent);
      this.layoutView();
      if (save) {
        const s = loadDeviceSettings();
        s.worldZoom = percent;
        saveSettings(browserSettingsStore, s);
      }
    };
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (e.code === "Minus" || e.code === "NumpadSubtract") {
        apply(stepPercent(current(), -1, ZOOM_MIN, ZOOM_MAX), true);
      } else if (e.code === "Equal" || e.code === "NumpadAdd") {
        apply(stepPercent(current(), 1, ZOOM_MIN, ZOOM_MAX), true);
      }
    };
    keys?.on("keydown", onKey);

    let startDist = 0;
    let startPercent = 100;
    const fingers = (): Phaser.Input.Pointer[] =>
      this.input.manager.pointers.filter((p) => p.isDown && p.wasTouch);
    const onMove = (): void => {
      const [a, b] = fingers();
      if (!a || !b) return;
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (startDist === 0) {
        startDist = dist;
        startPercent = current();
        return;
      }
      apply(pinchPercent(startPercent, startDist, dist), false);
    };
    const onUp = (): void => {
      if (startDist > 0 && fingers().length < 2) {
        startDist = 0;
        const s = loadDeviceSettings();
        s.worldZoom = current();
        saveSettings(browserSettingsStore, s);
      }
    };
    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
    this.events.once("shutdown", () => {
      keys?.off("keydown", onKey);
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);
    });
  }

  /**
   * Set the cameras and the HUD for the window size and the zoom and UI size
   * settings. A map smaller than the view is centred, and the rest is black.
   */
  private layoutView(): void {
    const { width, height } = this.scale.gameSize;
    const zoomPercent =
      (this.registry.get(WORLD_ZOOM_KEY) as number | undefined) ?? 100;
    const uiPercent =
      (this.registry.get(UI_SIZE_KEY) as number | undefined) ?? 100;
    const ts = this.map.tileSize;
    const scale = hudScale(
      uiPercent,
      this.controls.profile === "touch",
      width,
      HUD_FIT_W,
    );
    // On touch the toolbar is a column down the left, and the map is drawn
    // beside it, so no tile is ever under a button.
    const inset = Math.round(this.hud.insetLeft(scale));
    const viewW = width - inset;
    const zoom = worldZoom(zoomPercent, viewW, height);
    // The camera stops at the built rooms; unbuilt space stays black.
    const built = this.map.bounds;
    const b = cameraBounds(
      built.w * ts,
      built.h * ts,
      viewW / zoom,
      height / zoom,
      built.x * ts,
      built.y * ts,
    );
    this.cameras.main
      .setPosition(inset, 0)
      .setSize(viewW, height)
      .setBackgroundColor(0x000000)
      .setZoom(zoom)
      .setBounds(b.x, b.y, b.w, b.h);
    const corner = cornerScroll(width, height, scale);
    this.uiCamera
      .setSize(width, height)
      .setZoom(scale)
      .setScroll(corner.x, corner.y);
    this.hud.layout(width / scale, height / scale, scale);
    this.controls.setUiScale(scale);
  }

  /** Fade out and restart the scene on another map. */
  private travel(map: string, entry: string): void {
    if (this.leaving) return;
    this.leaving = true;
    // Doors and the Mines dismount: the horse waits outside (note 59).
    if (
      this.state.animals.mounted &&
      !rideable(maps.get(resolveMapId(map, this.state.farmType)))
    ) {
      const here = tileOf(this.pos, PLAYER, this.map.tileSize);
      dismountSafely(
        this.state,
        this.mapId,
        this.parkWorld(),
        here,
        facingTile(this.pos, PLAYER, this.facing, this.map.tileSize),
      );
      this.save();
    }
    const data: SceneData = { map, entry };
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once("camerafadeoutcomplete", () =>
      this.scene.restart(data),
    );
  }

  /** The tile the horse stands on here, when it is not being ridden. */
  private horseSpot(): { x: number; y: number } | undefined {
    return horseTile(
      this.state,
      this.mapId,
      stableHome(this.state, this.mapId),
    );
  }

  /** How the player gets off the horse: a tap on the farmer, or the Action key. */
  private getOffHint(): string {
    return this.controls.profile === "touch" &&
      loadDeviceSettings().touchScheme === "tap"
      ? "Tap yourself"
      : "Press Action";
  }

  /** Get on the horse. The first ride asks for a name (note 59). */
  private getOn(): void {
    const problem = mountProblem(this.state, this.map);
    if (problem !== undefined) {
      this.message = problem;
      return this.render();
    }
    if (needsName(this.state)) {
      // The naming dialog resumes the farm, which finishes getting on.
      this.namingHorse = true;
      return this.open("name-horse");
    }
    mount(this.state, this.map);
    this.message = `You are riding ${horseName(this.state)}. ${this.getOffHint()} to get off.`;
    this.save();
    this.render();
  }

  /** Get off where the rider stands. The horse waits there until morning. */
  private getOff(): void {
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    const spot = dismountSafely(
      this.state,
      this.mapId,
      this.parkWorld(),
      here,
      this.aimTile(),
    );
    this.message = spot
      ? `${horseName(this.state)} waits here.`
      : `${horseName(this.state)} trots back to the stable.`;
    this.save();
    this.render();
  }

  /** Take the ladder down. The last built floor has none. */
  private descend(): void {
    if (this.floor === undefined || this.floor >= BUILT_FLOORS) return;
    this.travel(mineMapId(this.floor + 1), "from_above");
  }

  /** The rocks on this map: the farm's, or this mine floor's. */
  private rocks(): Rocks | undefined {
    if (this.floorState) return this.floorState.rocks;
    return isFarmMap(this.mapId) || isAreaMap(this.mapId)
      ? this.state.rocks
      : undefined;
  }

  /** True on the furnace tile once the smith has given it. */
  private furnaceAt(x: number, y: number): boolean {
    return (
      this.state.furnace.gifted && this.map.serviceAt(x, y)?.kind === "furnace"
    );
  }

  private select(index: number): void {
    if (index < 0 || index >= toolbarSize(this.state)) return;
    this.selected = index;
    this.registry.set(SELECTED_KEY, index);
    this.message = "";
    this.render();
  }

  /** The worn hat, as a placeholder block on top of the player sprite. */
  private drawHat(): void {
    const worn = this.state.wardrobe.worn;
    const def = worn ? hatById(worn) : undefined;
    this.hat.setVisible(def !== undefined);
    if (!def) return;
    const lift = this.state.animals.mounted ? RIDER_LIFT : 0;
    const head = this.pos.y - lift - this.player.displayHeight * 0.875;
    this.hat
      .setFillStyle(Phaser.Display.Color.HexStringToColor(def.color).color)
      .setPosition(this.pos.x, head + 1);
  }

  /** The short scene that opens the Special Orders board (note 65). Shown once. */
  private showOrdersIntro(): void {
    this.state.orders.opened = true;
    this.save();
    this.open("orders", { intro: true });
  }

  /**
   * Stepping near an event's place starts its scene (note 62). The scene asks
   * first, and "not now" lets it wait. Checked when the tile changes.
   */
  private checkHeartEvent(): void {
    if (isFestivalMap(this.mapId) || this.state.animals.mounted) return;
    const t = tileOf(this.pos, PLAYER, this.map.tileSize);
    const key = `${t.x},${t.y}`;
    if (key === this.eventTile) return;
    this.eventTile = key;
    const day = this.state.day.clock.day;
    const event = eventAtTile(
      this.state,
      this.mapId,
      t.x,
      t.y,
      {
        day,
        weather: this.state.weather,
        minute: this.state.day.clock.minutes,
      },
      declinedToday(day),
    );
    if (event) this.open("heart-event", { id: event.id, warn: true });
  }

  /** Open a screen over the farm. The farm is paused until it closes. */
  private open(kind: string, data?: object): void {
    this.scene.launch(kind, data);
    this.scene.pause();
  }

  /** Use the held tool on the tile the player faces. Services are Action's. */
  private use(): void {
    if (this.leaving) return;
    if (this.useDoor()) return;
    if (this.state.animals.mounted) {
      this.message = `${this.getOffHint()} to get off ${horseName(this.state)} first.`;
      return this.render();
    }
    const front = this.aimTile();
    const carried = heldAt(this.state, this.selected);
    const weapon =
      carried.kind === "item" && isWeapon(carried.id)
        ? weaponById(carried.id)
        : undefined;
    if (weapon) return this.swing(weapon);
    if (this.map.serviceAt(front.x, front.y)) return;
    // A person is talked to, never worked on (the Action button or a tap does that).
    if (presentAt(this.villagers, front.x, front.y)) return;
    if (this.useSilo(front.x, front.y)) return;
    const held = heldAt(this.state, this.selected);
    if (held.kind === "item" && rodById(held.id)) return this.cast(held.id);
    // A pot goes on the water, bait goes in a pot, and the axe or pickaxe takes an empty one up.
    if (held.kind === "item" && held.id === POT_ITEM)
      return this.report(
        placePot(this.state, this.map, this.mapId, front.x, front.y),
      );
    if (
      held.kind === "item" &&
      baitById(held.id) &&
      this.state.pots.get(this.mapId, front.x, front.y)
    )
      return this.report(
        baitPot(this.state, this.mapId, front.x, front.y, held.id),
      );
    if (
      held.kind === "tool" &&
      (held.tool === "axe" || held.tool === "pickaxe") &&
      this.state.pots.get(this.mapId, front.x, front.y)
    )
      return this.report(pickUpPot(this.state, this.mapId, front.x, front.y));
    // A bomb is lit from the backpack and cannot be lifted (note 89).
    if (held.kind === "item" && isBomb(held.id)) {
      const lit = placeBomb(
        this.state,
        this.map,
        this.mapId,
        front.x,
        front.y,
        held.id,
        (x, y) =>
          !!this.rocks()?.at(x, y) ||
          this.litBombs.some((b) => b.x === x && b.y === y),
      );
      if (lit.ok) this.litBombs.push(lit.bomb);
      return this.report(lit.ok ? { ok: true } : lit);
    }
    // A farm decoration is stood down from the pack and lifted by hand, like a light (note 89).
    if (held.kind === "item" && isFarmDecor(held.id))
      return this.report(
        placeFarmDecor(
          this.state,
          this.map,
          this.mapId,
          front.x,
          front.y,
          held.id,
          (x, y) => !!this.rocks()?.at(x, y),
        ),
      );
    if (isFarmMap(this.mapId) && farmDecorAt(this.state, front.x, front.y))
      return this.report(pickUpFarmDecor(this.state, front.x, front.y));
    // A light is stood down from the backpack, and any tool or the empty hand lifts one.
    if (held.kind === "item" && isLight(held.id))
      return this.report(
        placeLight(
          this.state,
          this.map,
          this.mapId,
          front.x,
          front.y,
          held.id,
          (x, y) => !!this.rocks()?.at(x, y),
        ),
      );
    if (lightAt(this.state, this.mapId, front.x, front.y))
      return this.report(pickUpLight(this.state, this.mapId, front.x, front.y));
    // A lightning rod is stood down from the backpack, and any tool or the empty hand lifts one.
    if (held.kind === "item" && held.id === LIGHTNING_ROD)
      return this.report(
        placeRod(this.state, this.map, this.mapId, front.x, front.y),
      );
    if (isFarmMap(this.mapId) && rodAt(this.state, front.x, front.y))
      return this.report(pickUpRod(this.state, front.x, front.y));
    // A chest is stood down from the backpack, and the axe or pickaxe takes an empty one up.
    if (held.kind === "item" && chestById(held.id))
      return this.report(
        placeChest(this.state, this.map, this.mapId, front.x, front.y, held.id),
      );
    // The axe or pickaxe takes an empty chest up, and pushes one with items in
    // it one tile along (SC-56).
    if (
      held.kind === "tool" &&
      (held.tool === "axe" || held.tool === "pickaxe") &&
      this.state.chests.at(this.mapId, front.x, front.y)
    ) {
      const taken = pickUpChest(this.state, this.mapId, front.x, front.y);
      if (taken.ok || taken.reason !== "chest not empty")
        return this.report(taken);
      const step = PUSH[this.facing];
      return this.report(
        pushChest(
          this.state,
          this.map,
          this.mapId,
          front.x,
          front.y,
          step.x,
          step.y,
        ),
      );
    }
    if (this.mapId === CELLAR_MAP) {
      // Casks stand in the cellar: a held cask is stood down, a held good goes in,
      // and the axe or pickaxe takes a good out, or an empty cask up.
      const cask = this.state.casks.at(front.x, front.y);
      if (held.kind === "item" && held.id === CASK && !cask)
        return this.report(placeCask(this.state, this.map, front.x, front.y));
      if (cask && held.kind === "item")
        return this.report(loadCask(this.state, front.x, front.y, held.id));
      if (
        cask &&
        held.kind === "tool" &&
        (held.tool === "axe" || held.tool === "pickaxe")
      )
        return this.report(handOnCask(this.state, front.x, front.y));
    }
    if (isHouseMap(this.mapId)) {
      // In the house the held piece is stood down, and the axe or pickaxe takes one up.
      if (held.kind === "item" && decorById(held.id))
        return this.report(
          applyDecor(this.state, this.mapId, front.x, front.y, held.id),
        );
      if (held.kind === "item" && furnitureById(held.id))
        return this.report(
          placeFurniture(
            this.state,
            this.map,
            this.mapId,
            front.x,
            front.y,
            held.id,
          ),
        );
      if (
        held.kind === "tool" &&
        (held.tool === "axe" || held.tool === "pickaxe") &&
        this.state.furniture.at(this.mapId, front.x, front.y)
      )
        return this.report(
          pickUpFurniture(this.state, this.mapId, front.x, front.y),
        );
    }
    this.report(
      useHeld(this.state, this.map, held, front.x, front.y, this.floor),
    );
    // Chopping the massive log raises a world flag: open its exit, drop its art.
    this.refreshHolds();
  }

  /** Use a rod: it needs water in front of the player within the rod's range (note 21). */
  private cast(rodId: string): void {
    const rod = rodById(rodId)!;
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    const step = PUSH[this.facing];
    const water =
      isFarmMap(this.mapId) || isAreaMap(this.mapId)
        ? waterAhead(this.map, here.x, here.y, step.x, step.y, rod.range)
        : [];
    if (water.length === 0) {
      this.message = "Face the water to fish.";
      return this.render();
    }
    const first = water[0]!;
    const kind = this.map.waterKindAt(
      here.x + step.x * first,
      here.y + step.y * first,
    );
    this.open("fishing", { rod: rodId, water, at: here, kind });
  }

  /**
   * The Action button on the faced tile (note 47): open a service, else shake,
   * pick or harvest, else eat the held food. A tile with nothing on it, and
   * nothing edible held, does nothing and says nothing.
   */
  private action(): void {
    if (this.leaving) return;
    if (this.useDoor()) return;
    if (this.state.animals.mounted) return this.getOff();
    const front = this.aimTile();
    const spot = this.horseSpot();
    if (spot && spot.x === front.x && spot.y === front.y) return this.getOn();
    if (this.meetVillager(front)) return;
    const service = this.map.serviceAt(front.x, front.y);
    if (service?.kind !== "tide-bridge") this.mendAsked = false;
    const shut = service
      ? counterShutLine(this.state, this.mapId, service.kind)
      : "";
    if (shut) {
      this.message = shut;
      return this.render();
    }
    if (service?.kind === CART_KIND) return this.rideCart(service.id);
    if (
      service?.kind === SEWING_SERVICE ||
      service?.kind === DYE_POTS_SERVICE
    ) {
      const line = tailoringLine(this.state);
      if (line) {
        this.message = line;
        return this.render();
      }
      return this.open("tailor", {
        mode: service.kind === SEWING_SERVICE ? "sew" : "dye",
      });
    }
    if (service?.kind === "herb-stall") {
      const closed = herbStallProblem(this.state);
      if (closed) {
        this.message = closed;
        return this.render();
      }
      return this.open("shop", { stock: "herb" });
    }
    if (service?.kind === "fisher-shop")
      return this.open("shop", { stock: "fisher" });
    if (service?.kind === "pin-stall")
      return this.open("shop", { stock: "pin" });
    if (service?.kind === "keeper") return this.open("keeper");
    if (service?.kind === "hermit") {
      if (hermitStock(this.state).length > 0)
        return this.open("shop", { stock: "hermit" });
      this.message = HERMIT_LINE;
      return this.render();
    }
    if (service?.kind === SPIRIT_STATUE) {
      this.message = giveToSpirit(this.state);
      return this.render();
    }
    if (service?.kind === "camp") {
      this.message = CAMP_LINE;
      return this.render();
    }
    if (service?.kind === "tide-bridge") return this.mendBridge();
    if (service?.kind === "quarry-bridge") {
      this.message = QUARRY_BRIDGE_LINE;
      return this.render();
    }
    if (service?.kind === "board-news") {
      const g = this.state;
      this.message = roadNews(g.day.clock.day, g.tomorrow);
      return this.render();
    }
    if (service?.kind === "trader") {
      const g = this.state;
      const closed = traderProblem(g.day.clock.day, g.day.clock.minutes);
      if (closed) {
        this.message = closed;
        return this.render();
      }
      return this.open("shop", { stock: "trader" });
    }
    if (service && standInLine(service.kind)) {
      this.message = standInLine(service.kind) as string;
      return this.render();
    }
    if (service?.kind === COVE_TREASURE) return this.openTreasure();
    if (service?.kind === "stonekeeper") {
      this.refreshHolds();
      this.message =
        this.mapId === QUARRY_MAP
          ? campLine(this.state.day.clock.day)
          : this.holds.has(QUARRY_OPEN)
            ? YARD_EMPTY_LINE
            : STONEKEEPER_LINE;
      return this.render();
    }
    if (service?.kind === "festival") return this.openFestival();
    if (service?.kind === "camp-chest")
      return this.report(takeCampGift(this.state, this.floor));
    if (service?.kind === "ore-bin") return this.open("bin", { oreOnly: true });
    if (service?.kind === "trainer") return this.open("trainer");
    if (service?.kind === "dummy") {
      this.message = "The training dummy. Hold a weapon and swing at it.";
      return this.render();
    }
    if (service?.kind === "stairs")
      return this.travel(mineMapId(1), "from_above");
    if (service && isFestivalMap(this.mapId))
      return this.festivalAction(service);
    if (this.mapId === CAVE_MAP) return this.caveAction(front, service?.kind);
    if (service?.kind === "furnace") {
      if (!this.state.furnace.gifted) {
        this.message = "Nothing is here yet.";
        this.render();
        return;
      }
      return this.open("furnace");
    }
    const ladder = this.floorState?.ladder;
    if (ladder && ladder.x === front.x && ladder.y === front.y)
      return this.descend();
    if (service)
      return this.open(
        service.kind,
        service.kind === "hall" ? { room: service.id } : undefined,
      );
    if (this.mapId === CELLAR_MAP && this.state.casks.at(front.x, front.y)) {
      // Action reads a cask and takes a gold good out. Taking one out early is
      // the axe or pickaxe's job, so a stray press never resets the ageing.
      const cask = this.state.casks.get(front.x, front.y)!;
      if (!cask.job) return this.report({ ok: false, reason: "cask empty" });
      if (!caskDone(this.state, cask)) {
        this.message = caskStatus(this.state, front.x, front.y);
        return this.render();
      }
      return this.report(collectCask(this.state, front.x, front.y));
    }
    if (isFarmMap(this.mapId) && packWaiting(this.state, front.x, front.y))
      return this.report(takePack(this.state, front.x, front.y));
    if (this.state.pots.get(this.mapId, front.x, front.y))
      return this.report(
        collectPot(this.state, this.mapId, front.x, front.y, Math.random),
      );
    if (this.state.chests.at(this.mapId, front.x, front.y))
      return this.open("chest", {
        mapId: this.mapId,
        x: front.x,
        y: front.y,
      });
    if (
      isHouseMap(this.mapId) &&
      furnitureById(this.state.furniture.at(this.mapId, front.x, front.y))
        ?.station === "workbench"
    )
      return this.open("crafting", {
        bench: { mapId: this.mapId, x: front.x, y: front.y },
      });
    if (
      isHouseMap(this.mapId) &&
      this.state.furniture.at(this.mapId, front.x, front.y) === CATALOGUE_ITEM
    )
      return this.open("catalogue");
    if (
      isHouseMap(this.mapId) &&
      this.state.furniture.at(this.mapId, front.x, front.y)
    )
      return this.report(
        pickUpFurniture(this.state, this.mapId, front.x, front.y),
      );
    const result = act(this.state, this.map, front.x, front.y);
    if (!result.ok && result.reason === NOTHING_TO_ACT_ON) {
      const held = heldAt(this.state, this.selected);
      if (held.kind === "item" && itemById(held.id)?.energy !== undefined)
        this.eatHeld();
      return;
    }
    this.report(result);
  }

  /**
   * The ruined tide pool footbridge asks first, as a purchase does: the first
   * press says what it costs, the second hands in the wood. Mending reloads the
   * map, since the way through is a collision layer read at load (note 75).
   */
  private mendBridge(): void {
    if (!this.mendAsked) {
      this.mendAsked = true;
      this.message = `The footbridge is broken. Press Action again to mend it for ${TIDE_BRIDGE_WOOD} wood.`;
      return this.render();
    }
    this.mendAsked = false;
    const result = mendTideBridge(this.state);
    if (!result.ok) {
      this.message =
        result.reason === "not enough wood"
          ? `Mending the footbridge takes ${TIDE_BRIDGE_WOOD} wood.`
          : "The footbridge is already mended.";
      return this.render();
    }
    this.save();
    this.travel(this.mapId, "at_bridge");
  }

  /** The cove's hidden chest: one a season, opened with Action (note 76, decision 8). */
  /** The Hearth room's cart: free once it runs (note 16), an empty cart before. */
  private rideCart(serviceId: string): void {
    const stop = stopOfService(serviceId);
    if (!stop || !cartsRunning(this.state)) {
      this.message = CART_IDLE_LINE;
      return this.render();
    }
    this.open("cart", { from: stop.id });
  }

  private openTreasure(): void {
    const r = takeTreasure(this.state);
    if (r.ok) {
      const name = itemById(r.id)?.name ?? r.id;
      this.message = `A chest under the ledge. Inside: ${r.count} ${name}.`;
      this.save();
    } else
      this.message =
        r.reason === "taken"
          ? "The ledge is bare. Something may turn up next season."
          : "Your backpack is full.";
    this.render();
  }

  /** Action in the farm cave: pick bat fruit, pick a mushroom box, or use the free dehydrator. */
  private caveAction(front: Vec, kind: string | undefined): void {
    const g = this.state;
    const nothing = (text: string) => {
      this.message = text;
      this.render();
    };
    if (kind === "mushroom-box") {
      if (g.cave.choice !== "mushrooms") return nothing("");
      const index =
        Number(this.map.serviceAt(front.x, front.y)?.id.split("-")[1]) - 1;
      if (!g.cave.boxes[index]?.ready)
        return nothing("The mushrooms are not ready yet.");
      return this.report(pickMushroomBox(g, index));
    }
    if (kind === "cave-dehydrator") {
      if (!hasCaveDehydrator(g)) return nothing("");
      if (caveDehydratorDone(g)) return this.report(collectCaveDehydrator(g));
      if (g.cave.dehydrator)
        return nothing("The dehydrator is still drying its batch.");
      const held = heldAt(g, this.selected);
      if (held.kind !== "item")
        return nothing("Hold 5 fruit or mushrooms and press Action.");
      return this.report(loadCaveDehydrator(g, held.id));
    }
    if (g.cave.fruitAt(front.x, front.y))
      return this.report(pickBatFruit(g, front.x, front.y));
    nothing("");
  }

  /** Show what an action did, then settle the day, a level choice and the screen. */
  private report(result: Outcome): void {
    if (!result.ok) {
      const front = this.aimTile();
      this.message =
        result.reason === "machine busy"
          ? statusText(this.state, front.x, front.y)
          : result.reason === "cask busy"
            ? caskStatus(this.state, front.x, front.y)
            : result.reason === "tap busy"
              ? tapStatus(this.state, front.x, front.y)
              : reasonText(result.reason);
    } else if (result.note) {
      this.message = result.note;
    } else if (result.ladder) {
      this.message = "A ladder is revealed!";
    } else if (result.levelUp) {
      const { skill, level } = result.levelUp;
      this.message = `${skill} is now level ${level}.`;
    } else {
      this.message = "";
    }
    this.afterAction();
  }

  /**
   * A service on a festival map: the display table and counters open their
   * panel, the way home asks first, villagers and decorations speak, and the
   * hedge chest and cart finish the maze.
   */
  private festivalAction(service: { id: string; kind: string }): void {
    const f = festivalOfMap(this.mapId);
    if (!f) return;
    switch (service.kind) {
      case "showing":
        return this.open("festival", { mode: "panel", panel: "showing" });
      case "festival-counter":
        return this.open("festival", { mode: "panel", panel: "counter" });
      case "festival-leave":
        return this.open("festival", { mode: "leave" });
      case "hedge-chest":
        this.message = openChest(this.state);
        return this.render();
      case "hedge-cart":
        return this.travel(this.mapId, "door");
      case "sight":
        this.message = sightLine(f, service.id) ?? "";
        return this.render();
    }
  }

  /** Placeholder props on a festival map: tables, booths, villagers and the chest. */
  private drawFestivalProps(): void {
    const ts = this.map.tileSize;
    const colour: Record<string, number> = {
      showing: 0x8b5a2b,
      "festival-counter": 0xc0463a,
      "festival-leave": 0xf0e8d0,
      "hedge-chest": 0xe8c050,
      "hedge-cart": 0x7a5230,
    };
    for (const s of this.map.services) {
      const c =
        s.kind === "sight"
          ? s.id.startsWith("scare")
            ? 0xe8802a
            : 0x4a9fd8
          : colour[s.kind];
      if (c === undefined) continue;
      this.ground
        .fillStyle(c, 1)
        .fillRect(s.x * ts + 1, s.y * ts + 2, ts - 2, ts - 4);
      if (s.kind === "showing" && s.id === "judge")
        this.ground
          .fillStyle(0x203a8a, 1)
          .fillRect(s.x * ts + 4, s.y * ts + 4, ts - 8, ts - 8);
    }
  }

  /** The festival green: open only while today's festival is on. */
  private openFestival(): void {
    const f = festivalDayToday(this.state.day.clock.day);
    if (f && festivalOpen(f, this.state.day.clock.minutes))
      return this.open("festival");
    if (!f) this.message = "The green is quiet today.";
    else if (this.state.day.clock.minutes >= f.closes)
      this.message = `${f.name} is over for today.`;
    else
      this.message = `${f.name} runs from ${clockText(f.opens)} to ${clockText(f.closes)}.`;
    this.render();
  }

  /** Eat the held item, if it is food. */
  private eatHeld(): void {
    if (this.leaving) return;
    const held = heldAt(this.state, this.selected);
    const drinking = held.kind === "item" && isDrink(held.id);
    const result =
      held.kind === "item"
        ? drinking
          ? drink(this.state, held.id)
          : eat(this.state, held.id)
        : { ok: false as const, reason: "not food" };
    this.message = result.ok
      ? `${drinking ? "Drank" : "Ate"} ${itemById(held.kind === "item" ? held.id : "")?.name.toLowerCase()}.`
      : reasonText(result.reason);
    this.afterAction();
  }

  private afterAction(): void {
    if (this.state.day.over) this.endDay();
    else if (pendingChoice(this.state.skills)) this.open("profession");
    else this.render();
  }

  /** Save to the browser. The clock is not saved, so a reload is a new morning. */
  private save(): void {
    // A save made in the cellar loads there (`resumeAt`); anywhere else clears it.
    this.state.resumeMap = this.mapId === CELLAR_MAP ? CELLAR_MAP : undefined;
    saveGame(browserStore, this.state);
  }

  /** The conditions that open doors. Rebuilt after sleeping, when a building may have landed overnight. */
  private refreshHolds(): void {
    this.holds = new Set(holdsOf(this.state));
    if (minesOpen(this.state.day.clock.day)) this.holds.add("mines-open");
    if (this.state.cave.open) this.holds.add("cave-open");
    if (this.state.animals.coopBuilt) this.holds.add(COOP_BUILT);
    if (this.state.animals.barnBuilt) this.holds.add(BARN_BUILT);
    for (const h of houseHolds(
      this.state.houseTier,
      houseSpouse(this.state),
      this.state.houseRenos,
    ))
      this.holds.add(h);
    for (const h of greenhouseHolds(this.state)) this.holds.add(h);
    for (const c of this.conditional)
      c.drawn.setVisible(layerShows(c.layer, this.holds));
  }

  private endDay(): void {
    this.detonateAll(true);
    const g = this.state;
    const farmMap = farmMapOf(g);
    const report = sleep(g, farmMap.forageSpots, Math.random, farmMap);
    this.refreshHolds();
    this.message = "";
    this.save();
    this.render();
    // The shipping summary comes first when the bin paid; it opens the report.
    this.open(report.shipped.lines.length > 0 ? "shipping" : "report", {
      report,
    });
  }

  /**
   * Placeholder name tags over the doors and counters, so the owner can tell
   * what is what until the art pass (#58). Names come from `core/labels.ts`.
   */
  private drawLabels(): Phaser.GameObjects.Text[] {
    const ts = this.map.tileSize;
    const tags: { x: number; y: number; text: string }[] = [];
    for (const e of this.map.exits) {
      // The coop and barn doors have nothing behind them until built.
      if (
        (e.requires === COOP_BUILT || e.requires === BARN_BUILT) &&
        !exitOpen(e, this.holds)
      )
        continue;
      const text = exitLabel(e.id);
      if (text) tags.push({ x: e.x + e.w / 2, y: e.y, text });
    }
    for (const s of this.map.services) {
      // The furnace is only there once the smith has given it.
      if (s.kind === "furnace" && !this.state.furnace.gifted) continue;
      const text = serviceLabel(s.kind, s.id);
      if (text) tags.push({ x: s.x + 0.5, y: s.y, text });
    }
    return tags.map((t) => {
      const label = this.add
        .text(t.x * ts, t.y * ts - 2, t.text, {
          fontSize: "8px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(900);
      return label;
    });
  }

  /** Tint each built room's floor and walls with its wallpaper and flooring (note 10). */
  private drawDecor(): void {
    const json = mapFiles[this.mapId];
    if (!json) return;
    const ts = this.map.tileSize;
    for (const room of ROOMS) {
      if (room.tier > this.state.houseTier) continue;
      const cover = this.state.decor.get(room.id);
      const floor = decorById(cover.floor);
      const wall = decorById(cover.wallpaper);
      if (!floor && !wall) continue;
      const tiles = roomTiles(json, this.tier, room);
      for (const [def, cells] of [
        [floor, tiles.floor],
        [wall, tiles.wall],
      ] as const) {
        if (!def) continue;
        this.ground.fillStyle(
          Phaser.Display.Color.HexStringToColor(def.color).color,
          1,
        );
        for (const c of cells) this.ground.fillRect(c.x * ts, c.y * ts, ts, ts);
      }
    }
  }

  /**
   * The light layer (note 89): a soft warm ring for each placed light and the
   * worn ring. Placed lights show once it is dusk outdoors, and always in the
   * mines, where it is dark all day.
   */
  private drawGlow(): void {
    this.glow.clear();
    const dusk = this.outdoorSoil
      ? darkness(
          dateOf(this.state.day.clock.day).season,
          this.state.day.clock.minutes,
        )
      : 0;
    const dark = this.floor !== undefined ? 1 : dusk;
    if (dark <= 0) return;
    const ts = this.map.tileSize;
    const at = { x: this.pos.x / ts, y: (this.pos.y - ts / 2) / ts };
    for (const l of lightLayer(this.state, this.mapId, at)) {
      const cx = (l.worn ? l.x : l.x + 0.5) * ts;
      const cy = (l.worn ? l.y : l.y + 0.5) * ts;
      for (let i = 4; i >= 1; i--) {
        this.glow.fillStyle(0xffd27a, 0.06 * dark);
        this.glow.fillCircle(cx, cy, (l.radius * ts * i) / 4);
      }
    }
  }

  /** Tick the fuses, blink the lit bombs and set off the ones that are due. */
  private updateBombs(dt: number): void {
    this.bombFx.clear();
    if (this.litBombs.length === 0) return;
    const ts = this.map.tileSize;
    for (const b of this.litBombs) {
      const on = Math.floor(this.time.now / 120) % 2 === 0;
      this.bombFx.fillStyle(on ? 0xffffff : 0xff6a3a, on ? 0.7 : 0.45);
      this.bombFx.fillRect(b.x * ts + 2, b.y * ts + 2, ts - 4, ts - 4);
    }
    for (const b of tickBombs(this.litBombs, dt)) this.detonate(b, false);
  }

  /** Every lit bomb goes off at once (leaving the map or the day ending). */
  private detonateAll(quiet: boolean): void {
    const lit = this.litBombs;
    this.litBombs = [];
    for (const b of lit) this.detonate(b, quiet);
  }

  /**
   * A bomb goes off (note 89): rocks the Mining level allows break with their
   * usual drops, monsters and the player inside the circle are hurt, and
   * nothing else is touched. `quiet` skips the screen and the kill rewards,
   * for a bomb that goes off as the map is left.
   */
  private detonate(b: LitBomb, quiet: boolean): void {
    const def = bombById(b.id);
    if (!def) return;
    const g = this.state;
    const ts = this.map.tileSize;
    const rocks = this.rocks();
    const broken = rocks ? blastRocks(g, rocks, this.floor, b) : undefined;
    const floor = this.floorState;
    const dead = floor ? blastCreatures(floor.creatures, b, ts) : [];
    const lost = blastPlayer(g.combat.health, b, {
      x: Math.floor(this.pos.x / ts),
      y: Math.floor((this.pos.y - 1) / ts),
    });
    if (quiet) {
      if (floor)
        floor.creatures = floor.creatures.filter(
          (c) => !dead.some((d) => d.uid === c.uid),
        );
      return;
    }
    for (const c of dead) this.beaten(c);
    this.cameras.main.shake(200, 0.01);
    this.swingFx.clear().fillStyle(0xffb040, 0.5);
    this.swingFx.fillCircle(
      (b.x + 0.5) * ts,
      (b.y + 0.5) * ts,
      (def.radius + 0.5) * ts,
    );
    this.time.delayedCall(220, () => this.swingFx.clear());
    const got = Object.entries(broken?.items ?? {})
      .map(([id, n]) => `${n} ${itemById(id)?.name.toLowerCase() ?? id}`)
      .join(", ");
    this.message =
      `${def.name} goes off.` +
      (got ? ` Got ${got}.` : "") +
      (broken?.ladder ? " A ladder is revealed!" : "") +
      (lost > 0 ? ` It hurts you for ${lost}.` : "");
    if (lost > 0)
      this.floatText(this.pos.x, this.pos.y - 14, `-${lost}`, "#ff8080");
    this.render();
  }

  /** A strike falls: a white flash of the screen, and a bright block on each rod it hit (note 89). */
  private strikeFlash(r: {
    strikes: number;
    hits: { x: number; y: number }[];
  }) {
    if (r.strikes === 0 || this.floor !== undefined) return;
    this.cameras.main.flash(180, 255, 255, 255);
    if (!isFarmMap(this.mapId)) return;
    const ts = this.map.tileSize;
    this.swingFx.clear().fillStyle(0xffffaa, 0.8);
    for (const h of r.hits) this.swingFx.fillRect(h.x * ts, h.y * ts, ts, ts);
    this.time.delayedCall(220, () => this.swingFx.clear());
  }

  /** Draw plots, crops and forage on the tiles. */
  private drawGround(): void {
    this.ground.clear();
    this.sprites.removeAll(true);
    const ts = this.map.tileSize;
    const put = (x: number, y: number, key: string) => {
      const image = this.add.image(x * ts, y * ts, key).setOrigin(0);
      this.uiCamera.ignore(image); // the UI camera does not draw the world
      this.sprites.add(image);
      return image;
    };
    for (const r of this.rocks()?.each() ?? [])
      put(r.x, r.y, ROCK_KEYS[r.kind]);
    if (this.floor !== undefined) {
      const up = this.map.exits.find((e) => e.id === "up");
      if (up) put(up.x, up.y, LADDER_KEY).setAlpha(0.6);
      const down = this.floorState?.ladder;
      if (down) put(down.x, down.y, LADDER_KEY);
    }
    if (isHouseMap(this.mapId)) this.drawDecor();
    for (const p of this.state.furniture.each(this.mapId))
      put(p.x, p.y, furnitureKey(p.id));
    for (const s of this.map.services)
      if (s.kind === "camp-chest") put(s.x, s.y, chestKey("big-chest"));
    for (const c of this.state.chests.each(this.mapId))
      put(c.x, c.y, chestKey(c.id));
    for (const l of this.state.placed.each(lightMapKey(this.mapId))) {
      if (isFarmDecor(l.id))
        for (const t of decorTiles(l.id, l.x, l.y))
          put(t.x, t.y, farmDecorKey(l.id));
      else put(l.x, l.y, lightKey(l.id));
    }
    if (isFarmMap(this.mapId))
      for (const p of this.state.placed.each(lightMapKey(this.mapId)))
        if (p.id === LIGHTNING_ROD && p.state?.pack === true)
          put(p.x, p.y, MACHINE_READY_KEY);
    for (const p of this.state.pots.each(this.mapId)) {
      put(p.x, p.y, POT_KEY);
      if (p.catch) put(p.x, p.y, POT_READY_KEY);
    }
    if (this.mapId === CELLAR_MAP)
      for (const c of this.state.casks.each()) {
        put(c.x, c.y, machineKey(CASK));
        if (caskDone(this.state, c)) put(c.x, c.y, MACHINE_READY_KEY);
      }
    if (this.mapId === CAVE_MAP) this.drawCave(put);
    if (isFestivalMap(this.mapId)) this.drawFestivalProps();
    if (this.map.hasSoil) this.drawSoil(put);
    this.drawWorld(put);
  }

  /** The dug soil, crops, fertilizer, sprinklers and fruit trees of the map. */
  private drawSoil(
    put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
  ): void {
    const soil = this.map.indoors ? this.state.greenhouse : this.state.farm;
    for (const { x, y, plot } of soil.each()) {
      put(x, y, soilKey(plot.wateredToday));
      const fert = fertilizerById(plot.fertilizer);
      if (fert) put(x, y, fertKey(fert.line));
      const crop = plot.crop;
      const def = crop && cropById(crop.id);
      if (!crop || !def) continue;
      const stage = stageOf(crop.daysGrown / def.growDays, soil.isRipe(x, y));
      put(x, y, cropKey(crop.id, stage));
    }
    // Each map shows its own sprinklers and fruit trees.
    const here = this.store;
    for (const s of here.sprinklers.each()) put(s.x, s.y, sprinklerKey(s.id));
    for (const t of here.fruitTrees.each()) {
      put(t.x, t.y, fruitTreeKey(fruitStageOf(t.age)));
      if (t.fruit > 0) put(t.x, t.y, fruitOnTreeKey(t.id));
    }
  }

  /** What stands and lies outdoors: forage, weeds, twigs, machines, trees and goods on the ground. */
  private drawWorld(
    put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
  ): void {
    if (!this.outdoorWorld) return;
    for (const { x, y, id } of this.state.forage.each())
      put(x, y, forageKey(id));
    for (const s of this.state.spots.each()) put(s.x, s.y, SPOT_KEY);
    for (const w of this.state.weeds.each()) put(w.x, w.y, WEED_KEY);
    for (const t of this.state.twigs.each()) put(t.x, t.y, TWIG_KEY);
    for (const m of this.state.machines.each()) {
      put(m.x, m.y, machineKey(m.id));
      if (jobDone(this.state, m)) put(m.x, m.y, MACHINE_READY_KEY);
    }
    for (const t of this.state.trees.each()) {
      put(t.x, t.y, treeKey(t.stage, t.stump, t.large, t.regrow !== undefined));
      if (tapReady(this.state, t)) put(t.x, t.y, MACHINE_READY_KEY);
    }
    for (const p of this.state.ground.each()) {
      const key = iconKey(p.id);
      if (key) put(p.x, p.y, key);
    }
    this.drawBunting();
  }

  /** The cave: bat fruit on the floor, or mushroom boxes and the free dehydrator. */
  private drawCave(
    put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
  ): void {
    const cave = this.state.cave;
    const ts = this.map.tileSize;
    for (const f of cave.eachFruit()) {
      const key = iconKey(f.id);
      if (key) put(f.x, f.y, key);
    }
    if (cave.choice !== "mushrooms") return;
    for (const s of this.map.services) {
      if (s.kind === "mushroom-box") {
        const box = cave.boxes[Number(s.id.split("-")[1]) - 1];
        this.ground
          .fillStyle(0x6b4a2a, 1)
          .fillRect(s.x * ts + 1, s.y * ts + 3, ts - 2, ts - 5);
        this.ground
          .fillStyle(box?.ready ? 0xe8d8b0 : 0x3a2a1a, 1)
          .fillRect(s.x * ts + 4, s.y * ts + 5, ts - 8, ts - 9);
      } else if (s.kind === "cave-dehydrator") {
        put(s.x, s.y, machineKey("dehydrator"));
        if (caveDehydratorDone(this.state)) put(s.x, s.y, MACHINE_READY_KEY);
      }
    }
  }

  /** On a festival day, hang flags over the green so the village looks changed. */
  private drawBunting(): void {
    if (!festivalDayToday(this.state.day.clock.day)) return;
    const green = this.map.services.find((s) => s.kind === "festival");
    if (!green) return;
    const ts = this.map.tileSize;
    const colors = [0xd8503c, 0xf2d16b, 0x4a9fd8, 0x7ac05a];
    const g = this.ground;
    for (let i = -3; i <= 3; i++) {
      const x = (green.x + i) * ts;
      const y = (green.y - 1) * ts;
      g.fillStyle(0x6b4a2a).fillRect(x, y, ts, 2);
      g.fillStyle(colors[(i + 3) % colors.length]!).fillTriangle(
        x + 2,
        y + 2,
        x + ts - 2,
        y + 2,
        x + ts / 2,
        y + 10,
      );
    }
  }

  /**
   * The hall's progress display (docs/design/40_hall_layout.md): a room is
   * dim until it is done and warm after, a room that is not ready (locked or
   * with no bundles yet) is also greyed, and the plaque lights one mark per
   * finished room. Placeholder for the real ruined and restored tiles (#58).
   */
  private drawRooms(): void {
    const { regions, tileSize: ts } = this.map;
    this.wash.clear();
    const hall = this.state.hall;
    for (const r of regions) {
      // A region that names a forage table is a patch of ground, not a hall room.
      if (r.forage !== undefined) continue;
      if (r.id === "plaque") {
        hall.rooms.forEach((room, i) => {
          const lit = hall.roomComplete(room.id);
          this.wash
            .fillStyle(lit ? 0xf0c75e : 0x3a3028, 1)
            .fillRect((r.x + i) * ts + 3, r.y * ts + 5, ts - 6, ts - 10);
        });
        continue;
      }
      const status = hall.roomStatus(r.id);
      const [colour, alpha] =
        status === "done"
          ? [0xffd890, 0.12]
          : status === "ready"
            ? [0x1a1410, 0.4]
            : [0x606870, 0.6];
      this.wash
        .fillStyle(colour, alpha)
        .fillRect(r.x * ts, r.y * ts, r.w * ts, r.h * ts);
    }
  }

  /**
   * While the carpenter builds the next house tier, scaffold stands on the
   * outside wall, inside the house's footprint (docs/design/41_house.md), with
   * the carpenter at work in front. Placeholder shapes until the art pass (#58).
   */
  private drawBuild(): void {
    const house = this.map.exits.find((e) => e.map === HOUSE_MAP);
    if (!this.state.houseBuild || !house) return;
    const ts = this.map.tileSize;
    // The house block is 6 by 4 tiles, with its door on the bottom row.
    const left = (house.x - 2) * ts;
    const top = (house.y - 3) * ts;
    const g = this.wash;
    g.lineStyle(3, 0x8a6a45, 1);
    for (const dx of [0, 2 * ts])
      g.lineBetween(left + dx, top, left + dx, top + 4 * ts);
    for (let row = 0; row <= 4; row += 2)
      g.lineBetween(left, top + row * ts, left + 2 * ts, top + row * ts);
    g.fillStyle(0xd9a441, 1).fillRect(
      (house.x + 2) * ts + 4,
      (house.y + 1) * ts + 2,
      ts - 8,
      ts - 4,
    );
    g.fillStyle(0x6b4f35, 1).fillRect(
      (house.x + 2) * ts + ts - 6,
      (house.y + 1) * ts,
      4,
      ts / 2,
    );
  }

  /** The smith's furnace by the house, once given: dark iron, glowing while it smelts. */
  private drawFurnace(): void {
    const f = this.state.furnace;
    const spot = this.map.services.find((s) => s.kind === "furnace");
    if (!f.gifted || !spot) return;
    const ts = this.map.tileSize;
    const x = spot.x * ts;
    const y = spot.y * ts;
    const busy = f.job !== undefined;
    const done = busy && absoluteMinutes(this.state) >= f.job!.doneAt;
    const g = this.wash;
    g.fillStyle(0x3a3a42, 1).fillRect(x + 1, y + 2, ts - 2, ts - 2);
    g.fillStyle(0x23232a, 1).fillRect(x + 1, y + 2, ts - 2, 3);
    g.fillStyle(done ? 0x8fd18a : busy ? 0xf08a30 : 0x15151a, 1).fillRect(
      x + 4,
      y + 8,
      ts - 8,
      5,
    );
  }

  /** The farm mailbox: a post and box, with the flag up while mail waits (note 51). */
  private drawMailbox(): void {
    const spot = this.map.services.find((s) => s.kind === "mailbox");
    if (!spot) return;
    const ts = this.map.tileSize;
    const x = spot.x * ts;
    const y = spot.y * ts;
    const g = this.wash;
    g.fillStyle(0x6f4a22, 1).fillRect(x + 7, y + 8, 2, ts - 8);
    g.fillStyle(0x3f6f9a, 1).fillRect(x + 3, y + 3, 10, 6);
    g.fillStyle(0x2a4a6a, 1).fillRect(x + 3, y + 3, 10, 1);
    if (this.state.mail.flagUp)
      g.fillStyle(0xd8483a, 1)
        .fillRect(x + 12, y - 1, 2, 6)
        .fillRect(x + 12, y - 1, 4, 2);
    else g.fillStyle(0xd8483a, 1).fillRect(x + 12, y + 5, 3, 2);
  }

  /** A yellow mark over the request board while a request waits to be taken (note 50). */
  private drawRequestMark(): void {
    const spot = this.map.services.find((s) => s.kind === "requests");
    if (
      !spot ||
      this.state.quests.posted(this.state.day.clock.day).length === 0
    )
      return;
    const ts = this.map.tileSize;
    const x = spot.x * ts;
    const y = spot.y * ts - 12;
    this.wash
      .fillStyle(0xf2c94c, 1)
      .fillRect(x + 7, y, 3, 7)
      .fillRect(x + 7, y + 9, 3, 3);
  }

  /** A coop or barn on the farm: a plain block, scaffolding while it is built (note 23). */
  private drawFarmBuilding(
    site: { x: number; y: number } | undefined,
    size: { w: number; h: number },
    doorX: number,
    built: boolean,
    building: boolean,
    roof: number,
  ): void {
    if (!site || (!built && !building)) return;
    const ts = this.map.tileSize;
    const x = site.x * ts;
    const y = site.y * ts;
    const g = this.wash;
    if (!built) {
      g.lineStyle(3, 0x8a6a45, 1);
      for (let dx = 0; dx <= size.w; dx += 2)
        g.lineBetween(x + dx * ts, y, x + dx * ts, y + size.h * ts);
      return;
    }
    g.fillStyle(roof, 1).fillRect(x, y, size.w * ts, ts);
    g.fillStyle(0xc9a26b, 1).fillRect(
      x,
      y + ts,
      size.w * ts,
      (size.h - 1) * ts,
    );
    if (doorX >= 0)
      g.fillStyle(0x4a3220, 1).fillRect(
        x + doorX * ts + 3,
        y + (size.h - 1) * ts + 2,
        ts - 6,
        ts - 2,
      );
  }

  /**
   * The greenhouse on the farm, where it stands (note 60): a vine-grown ruin
   * with scaffold poles until the Larder is done, then a glass house. It is
   * drawn here, not in the map, so it can be moved. Placeholder art.
   */
  private drawGreenhouse(): void {
    if (!isFarmMap(this.mapId)) return;
    const ts = this.map.tileSize;
    const at = greenhouseSite(this.state);
    const { w, h, doorX } = GREENHOUSE_FOOTPRINT;
    const [x, y] = [at.x * ts, at.y * ts];
    const g = this.wash;
    if (greenhouseRepaired(this.state)) {
      g.fillStyle(0x4f8f6a, 1).fillRect(x, y, w * ts, ts);
      g.fillStyle(0xa9d8c6, 1).fillRect(x, y + ts, w * ts, (h - 1) * ts);
      g.lineStyle(2, 0x3f6f55, 1);
      for (let dx = 0; dx <= w; dx += 2)
        g.lineBetween(x + dx * ts, y + ts, x + dx * ts, y + h * ts);
    } else {
      g.fillStyle(0x6e7a5c, 1).fillRect(x, y, w * ts, h * ts);
      g.fillStyle(0x3a5a3a, 0.55).fillRect(x, y, w * ts, h * ts);
      g.lineStyle(3, 0x8a6a45, 1);
      for (let dx = 0; dx <= w; dx += 2)
        g.lineBetween(x + dx * ts, y, x + dx * ts, y + h * ts);
    }
    g.fillStyle(0x4a3220, 1).fillRect(
      x + doorX * ts + 3,
      y + (h - 1) * ts + 2,
      ts - 6,
      ts - 2,
    );
  }

  private drawCoop(): void {
    const a = this.state.animals;
    this.drawFarmBuilding(
      coopSite(this.state, this.mapId),
      COOP_FOOTPRINT,
      1,
      a.coopBuilt,
      a.build?.building === "coop" && !a.coopBuilt,
      0xb5563c,
    );
    this.drawFarmBuilding(
      barnSite(this.state, this.mapId),
      BARN_FOOTPRINT,
      3,
      a.barnBuilt,
      a.build?.building === "barn" && !a.barnBuilt,
      0x8f3b2e,
    );
    this.drawSilo();
    this.drawStable();
  }

  /** The stable and the horse beside it, or where it was left. Placeholder blocks. */
  private drawStable(): void {
    const a = this.state.animals;
    this.drawFarmBuilding(
      siteOf(this.state, "stable", this.mapId),
      STABLE_FOOTPRINT,
      -1,
      a.stableBuilt,
      a.build?.building === "stable" && !a.stableBuilt,
      0x7a5a3a,
    );
    const spot = this.horseSpot();
    if (!spot) return;
    const ts = this.map.tileSize;
    this.wash
      .fillStyle(0x8a5a33, 1)
      .fillRect(spot.x * ts + 3, spot.y * ts + ts - 14, ts - 6, 14);
    this.wash
      .fillStyle(0x5b3a1e, 1)
      .fillRect(spot.x * ts + ts - 8, spot.y * ts + ts - 18, 5, 6);
  }

  /** The silo: a round grey tower, scaffolding while it is built. */
  private drawSilo(): void {
    const site = siloSite(this.mapId);
    const a = this.state.animals;
    if (!site || (!a.silo && a.siloDays <= 0)) return;
    const ts = this.map.tileSize;
    const x = site.x * ts;
    const y = site.y * ts;
    const g = this.wash;
    if (!a.silo) {
      g.lineStyle(3, 0x8a6a45, 1);
      for (let dx = 0; dx <= SILO_FOOTPRINT.w; dx += 1)
        g.lineBetween(x + dx * ts, y, x + dx * ts, y + SILO_FOOTPRINT.h * ts);
      return;
    }
    g.fillStyle(0x9aa0a6, 1).fillRect(
      x + 4,
      y + ts,
      SILO_FOOTPRINT.w * ts - 8,
      (SILO_FOOTPRINT.h - 1) * ts,
    );
    g.fillStyle(0x6e747a, 1).fillRect(
      x + 2,
      y + 4,
      SILO_FOOTPRINT.w * ts - 4,
      ts,
    );
  }

  /** Facing the silo: tip the held hay in, or read how full it is. True if the tile is the silo. */
  private useSilo(tx: number, ty: number): boolean {
    if (!siloBlocks(this.state, this.mapId, tx, ty)) return false;
    const held = heldAt(this.state, this.selected);
    const cap = siloCapacity(this.state);
    if (held.kind === "item" && held.id === HAY) {
      const n = depositHay(this.state);
      this.message =
        n > 0
          ? `${n} hay into the silo (${this.state.animals.hay}/${cap}).`
          : "The silo is full.";
    } else
      this.message = `The silo holds ${this.state.animals.hay} of ${cap} hay. Hold hay to fill it.`;
    this.render();
    return true;
  }

  /** Inside the coop or barn: the feeding bench along the back wall and the animals as blocks. */
  private drawCoopInside(): void {
    const coop = this.mapId === COOP_MAP;
    if (!coop && this.mapId !== BARN_MAP) return;
    const ts = this.map.tileSize;
    const g = this.wash;
    const a = this.state.animals;
    if (coop) {
      g.fillStyle(0x8a6a45, 1).fillRect(3 * ts, 2 * ts + 4, 4 * ts, ts - 4);
      g.fillStyle(0xe0c068, 1).fillRect(2 * ts + 2, 2 * ts + 3, ts - 4, ts - 3);
      g.fillStyle(0x6fa8d0, 1).fillRect(7 * ts + 2, 2 * ts + 5, ts - 4, ts - 5);
      // The deluxe coop's auto-feeder: a metal chute on the back wall.
      if (a.tier >= COOP_MAX_TIER)
        g.fillStyle(0x9aa3ad, 1).fillRect(
          9 * ts + 2,
          2 * ts + 3,
          ts - 4,
          ts - 3,
        );
      // The big coop's incubator: a warm box, with a glow while an egg is in.
      if (a.tier >= INCUBATOR_TIER) {
        g.fillStyle(0xd9944a, 1).fillRect(
          12 * ts + 2,
          2 * ts + 3,
          ts - 4,
          ts - 3,
        );
        if (a.incubator)
          g.fillStyle(0xfff2b0, 1).fillRect(
            12 * ts + 5,
            2 * ts + 6,
            ts - 10,
            ts - 9,
          );
      }
    } else {
      g.fillStyle(0x8a6a45, 1).fillRect(4 * ts, 2 * ts + 4, 5 * ts, ts - 4);
      g.fillStyle(0xe0c068, 1).fillRect(3 * ts + 2, 2 * ts + 3, ts - 4, ts - 3);
      g.fillStyle(0x6fa8d0, 1).fillRect(9 * ts + 2, 2 * ts + 5, ts - 4, ts - 5);
      if (a.barnTier >= BARN_MAX_TIER)
        g.fillStyle(0x9aa3ad, 1).fillRect(
          10 * ts + 2,
          2 * ts + 3,
          ts - 4,
          ts - 3,
        );
      // The stall wing, bottom left: cosmetic only (note 23): straw on the floor.
      g.fillStyle(0xd8c070, 1).fillRect(
        ts + 3,
        10 * ts + 4,
        3 * ts - 6,
        2 * ts - 8,
      );
    }
    const colours: Record<string, number> = {
      chicken: 0xf4efe0,
      duck: 0xb59a6a,
      rabbit: 0xcfc6bd,
      cow: 0xf0f0f0,
      goat: 0xd8c8a8,
      sheep: 0xe8e4d8,
      pig: 0xe8a4a0,
    };
    for (const { animal: an, x, y } of animalSlots(
      this.state,
      coop ? "coop" : "barn",
    )) {
      const grown = an.age >= GROW_DAYS;
      const big = an.species === "cow" || an.species === "pig";
      const size = grown ? ts - (big ? 2 : 4) : ts - 8;
      g.fillStyle(
        grown ? (colours[an.species] ?? 0xffffff) : 0xf2d95c,
        1,
      ).fillRect(x * ts + (ts - size) / 2, y * ts + ts - size - 1, size, size);
      if (an.product)
        g.fillStyle(0xffffff, 1).fillRect(x * ts + 6, y * ts + ts, 4, 3);
    }
  }

  private render(): void {
    this.drawGround();
    // drawRooms clears the wash layer, so everything else draws after it.
    this.drawRooms();
    this.drawCoop();
    this.drawGreenhouse();
    this.drawCoopInside();
    this.drawFurnace();
    this.drawMailbox();
    this.drawRequestMark();
    this.drawBuild();
    this.hud.update(this.state, this.selected, this.message, this.showHealth());
  }

  /** True where health can be lost, so the bar shows (note 22, decision 17). */
  private showHealth(): boolean {
    return healthShown(
      this.floor !== undefined && floorHasCreatures(this.floor),
      this.state.combat.noCreatures,
    );
  }

  /** Read the combat settings from the device: assist and "no creatures". */
  private syncCombatSettings(): void {
    const s = loadDeviceSettings();
    this.state.combat.assist = s.combatAssist;
    this.state.combat.noCreatures = s.noCreatures;
    for (const block of this.creatureSprites.values())
      block.setVisible(!s.noCreatures);
  }

  /** Step every creature on the floor, take hits and handle a knock out. */
  private updateCombat(dt: number): void {
    const combat = this.state.combat;
    const floor = this.floorState;
    this.player.setAlpha(
      combat.health.grace > 0 && Math.floor(this.time.now / 90) % 2 ? 0.4 : 1,
    );
    if (!floor || combat.noCreatures) return;
    combat.sync(this.state.skills);
    combat.health.tick(dt);
    const burn = combat.effects.tick(dt);
    if (burn > 0) {
      this.burnDebt += burn;
      if (this.burnDebt >= 1) {
        const whole = Math.floor(this.burnDebt);
        this.burnDebt -= whole;
        const lost = combat.health.drain(whole);
        if (lost > 0)
          this.floatText(this.pos.x, this.pos.y - 14, `-${lost}`, "#ff9a40");
      }
    } else this.burnDebt = 0;
    const ts = this.map.tileSize;
    for (const c of floor.creatures) {
      const result = stepCreature(c, dt, {
        player: this.pos,
        walk: (cr, dx, dy) =>
          move(
            { x: cr.x, y: cr.y },
            { x: dx, y: dy },
            CREATURE_BODY,
            ts,
            (x, y) => this.tileBlockedNoHorse(x, y),
          ),
        random: Math.random,
        assist: combat.assist,
        tileSize: ts,
        calm: oilCalms(this.state, c.kind),
      });
      if (result.hit) {
        const lost = combat.health.hurt(
          result.hit,
          combat.assist,
          this.state.equipment.defense(),
        );
        if (lost > 0) {
          this.message = `${creatureById(c.kind)?.name ?? "It"} hits you for ${lost}.`;
          const inflicts = creatureById(c.kind)?.inflicts;
          if (inflicts && Math.random() < inflicts.chance) {
            const eq = this.state.equipment;
            const r = combat.effects.inflict(inflicts.effect, Math.random, {
              immunity: eq.immunity(),
              slimeProof: eq.slimeProof(),
              halfLength: eq.halvesEffects(),
            });
            const name = effectById(inflicts.effect)?.name.toLowerCase();
            if (r === "afflicted") this.message += ` You are ${name}.`;
            else if (r === "resisted")
              this.message += ` You shrug off ${name}.`;
          }
          this.floatText(this.pos.x, this.pos.y - 14, `-${lost}`, "#ff8080");
          this.render();
        }
      }
      this.drawCreature(c);
    }
    if (combat.health.down && !combat.defeatPending) this.knockedOut();
  }

  /** One placeholder block for a creature, kept in `creatureSprites`. */
  private addCreatureSprite(c: Creature): Phaser.GameObjects.Rectangle {
    const block = this.add
      .rectangle(
        c.x,
        c.y,
        c.small ? 8 : 12,
        c.small ? 7 : 10,
        CREATURE_COLOURS[c.kind] ?? 0xffffff,
      )
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x000000, 0.6)
      .setVisible(!this.state.combat.noCreatures);
    this.creatureSprites.set(c.uid, block);
    return block;
  }

  private drawCreature(c: Creature): void {
    const block = this.creatureSprites.get(c.uid);
    if (!block) return;
    block.setPosition(c.x, c.y);
    // The wind up is the warning: a swelling, blinking block (note 22).
    const winding = c.state === "windup";
    block.setScale(winding ? 1.35 : 1);
    block.setFillStyle(
      winding && Math.floor(this.time.now / 100) % 2
        ? 0xff9a40
        : c.state === "stagger"
          ? 0xffffff
          : (CREATURE_COLOURS[c.kind] ?? 0xffffff),
    );
    // A sleeping rock crab looks like a dull rock until the player comes near.
    const asleep = creatureById(c.kind)?.sleeper && c.state === "wander";
    block.setAlpha(c.state === "recover" ? 0.6 : asleep ? 0.55 : 1);
  }

  /** Health ran out: the day ends and the defeat rule runs overnight (note 22). */
  private knockedOut(): void {
    this.state.combat.defeatPending = true;
    this.message = "";
    this.endDay();
  }

  /** A short number that rises and fades in the world. */
  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontSize: "10px", color })
      .setOrigin(0.5)
      .setDepth(950);
    this.uiCamera.ignore(t);
    this.tweens.add({
      targets: t,
      y: y - 14,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  /**
   * Swing the held weapon (note 22). The training dummy takes the hit and shows
   * the number. Otherwise every creature in reach is hit, and a beaten one drops
   * its goods and may reveal a ladder.
   */
  private swing(weapon: WeaponDef): void {
    if (this.time.now < this.swingReady) return;
    this.swingReady =
      this.time.now +
      weapon.cooldown * this.state.combat.effects.swingFactor() * 1000;
    const ts = this.map.tileSize;
    // The sling shoots toward the mouse pointer, or the tapped spot on touch
    // (note 22, SC-94). Everything else, and a sling with no aim, goes the faced way.
    const aim = weapon.family === "sling" ? this.shotAim() : undefined;
    if (aim) this.facing = facingFrom(aim, this.facing);
    const aimLen = aim ? Math.hypot(aim.x, aim.y) : 0;
    const unit = aim ? { x: aim.x / aimLen, y: aim.y / aimLen } : undefined;
    const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
      this.facing
    ];
    // A flash of the swing: a short line for a shot, a block for a swing.
    this.swingFx.clear().fillStyle(0xffffff, 0.35);
    const mid = { x: this.pos.x, y: this.pos.y - 6 };
    const len =
      weapon.family === "sling" ? weapon.reach * ts : weapon.reach * ts * 0.8;
    if (unit) {
      this.swingFx.lineStyle(3, 0xffffff, 0.35);
      this.swingFx.lineBetween(
        mid.x,
        mid.y,
        mid.x + unit.x * len,
        mid.y + unit.y * len,
      );
    } else
      this.swingFx.fillRect(
        mid.x + (f[0]! > 0 ? 0 : f[0]! < 0 ? -len : -len / 2),
        mid.y + (f[1]! > 0 ? 0 : f[1]! < 0 ? -len : -len / 2),
        f[0] !== 0 ? len : weapon.family === "sling" ? 3 : len,
        f[1] !== 0 ? len : weapon.family === "sling" ? 3 : len,
      );
    this.time.delayedCall(90, () => this.swingFx.clear());

    // The dummy: in front, as far as the weapon reaches.
    const here = tileOf(this.pos, PLAYER, ts);
    for (let i = 1; i <= Math.max(1, Math.floor(weapon.reach)); i++) {
      const tx = here.x + f[0]! * i;
      const ty = here.y + f[1]! * i;
      const kind = this.map.serviceAt(tx, ty)?.kind;
      if (kind === "dummy") {
        this.floatText((tx + 0.5) * ts, ty * ts, `${weapon.damage}`, "#ffffff");
        this.message = `The dummy takes ${weapon.damage}. Swing again in ${weapon.cooldown} seconds.`;
        return this.render();
      }
      if (this.tileBlocked(tx, ty)) break;
    }

    const floor = this.floorState;
    if (!floor || this.state.combat.noCreatures) return;
    const hits = swingTargets(
      weapon,
      this.facing,
      this.pos,
      floor.creatures,
      ts,
      aim,
    );
    for (const c of hits) {
      const damage = swingDamage(c, weapon.damage, weapon.family, this.pos);
      this.floatText(
        c.x,
        c.y - 12,
        damage < weapon.damage ? `${damage} (armour)` : `${damage}`,
        "#ffffff",
      );
      if (hurtCreature(c, damage)) this.beaten(c);
      else {
        const next =
          1 + floor.creatures.reduce((m, o) => Math.max(m, o.uid), 0);
        const small = splitOff(c, next);
        if (small) {
          floor.creatures.push(small);
          this.addCreatureSprite(small);
          this.uiCamera.ignore(this.creatureSprites.get(small.uid)!);
        }
      }
    }
  }

  /**
   * The direction from the farmer to where a sling shot is aimed, or undefined
   * for the faced way: a fresh tap on touch, else the mouse pointer in mouse mode.
   */
  private shotAim(): Vec | undefined {
    let w: Vec | undefined;
    if (this.tapShot && this.time.now < this.tapShot.until) w = this.tapShot;
    else if (this.mouseAim) {
      const p = this.input.activePointer;
      w = this.cameras.main.getWorldPoint(p.x, p.y);
    }
    this.tapShot = undefined;
    if (!w) return undefined;
    const aim = { x: w.x - this.pos.x, y: w.y - (this.pos.y - 6) };
    return Math.hypot(aim.x, aim.y) < 1 ? undefined : aim;
  }

  /** A creature is beaten: its goods, the kill tally and a ladder roll. */
  private beaten(c: Creature): void {
    const floor = this.floorState!;
    const def = creatureById(c.kind);
    floor.creatures = floor.creatures.filter((o) => o.uid !== c.uid);
    this.creatureSprites.get(c.uid)?.destroy();
    this.creatureSprites.delete(c.uid);
    if (!def) return;
    this.state.combat.noteKill(c.kind);
    const levelUp = this.state.skills.gain("combat", creatureXp(c));
    const got: string[] = [];
    let left = false;
    const bonus = this.state.mines.killBonus(
      this.floor!,
      this.state.day.clock.day,
    );
    if (bonus.extraKill) this.state.combat.noteKill(c.kind);
    const rolls = [
      ...rollDrops(def, Math.random),
      ...(bonus.extraDrop ? rollDrops(def, Math.random) : []),
    ];
    for (const d of rolls) {
      if (this.state.inventory.add(d.id, d.count))
        got.push(`${d.count} ${itemById(d.id)?.name.toLowerCase() ?? d.id}`);
      else left = true;
    }
    const tile = creatureTile(c, this.map.tileSize);
    const ladder = this.state.mines.creatureBeaten(
      this.floor!,
      this.state.day.clock.day,
      tile.x,
      tile.y,
      Math.random,
    );
    this.message = `${def.name} beaten.${levelUp ? ` Combat is now level ${levelUp}.` : ""}${got.length ? ` Got ${got.join(", ")}.` : ""}${left ? " Your pack is full, so something was left behind." : ""}${ladder ? " A ladder is revealed!" : ""}`;
    this.render();
    if (levelUp && pendingChoice(this.state.skills)) this.open("profession");
  }
}
