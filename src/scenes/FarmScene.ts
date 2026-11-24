import { feastGive, lanternOn } from "../core/feastexchange";
import { playFeastReveal } from "./farm-feast-reveal";
import {
  BARN_BUILT,
  BARN_MAP,
  stableHome,
  barnVisibleTier,
  COOP_BUILT,
  COOP_MAP,
  coopVisibleTier,
} from "../core/animals";
import { DEBUG_TOOLS } from "../core/debugtools";
import {
  resolveAction,
  resolveUse,
  type ActionIntent,
  type UseContext,
} from "../core/interact";
import { LOCAL_PLAYER } from "../core/players";

import Phaser from "phaser";

import { saveSettings, type TouchScheme } from "../core/bindings";
import { sleep, type SleepReport } from "../core/sleep";
import {
  areaOf,
  ensureMapCreatures,
  enterArea,
  isAreaMap,
  leaveArea,
} from "../core/areas";

import { eventAtTile, placesAt } from "../core/eventrun";
import { huntOffer, type HuntState } from "../core/seedhunt";
import {
  awardIcePrize,
  finishIceFishing,
  iceCounter,
  iceOffer,
  isHole,
  lakeShut,
  startIceFishing,
  type IceFishing,
} from "../core/icefishing";

import { meet, presentAt, talkTarget, type Present } from "../core/townfolk";

import type { GameState } from "../core/save";
import {
  cycle,
  heldAt,
  isLiftTool,
  nextRow,
  toolbarSize,
} from "../core/toolbar";
import { pendingChoice } from "../core/professions";
import { eat, type Outcome } from "../core/actions";
import { dateOf } from "../core/calendar";
import { darkness } from "../core/clock";
import {
  festivalOfMap,
  festivalDayToday,
  festivalGateHolds,
  festivalShutLine,
  walkIntoFestival,
  walkIntoPlace,
  festivalStepShut,
  isFestivalMap,
} from "../core/festivals";
import { nicheLine } from "../core/maze";

import { festivalHolds } from "../core/festivalroutes";
import { marketHolds, stallOf } from "../core/nightmarket";
import { holdsOf } from "../core/worldflags";
import { gateShutLine, parseGate } from "../core/gates";
import { mendTideBridge, TIDE_BRIDGE_WOOD } from "../core/tidebridge";
import { HERMIT_LINE } from "../core/forestfolk";
import { hermitStock } from "../core/elderfruit";
import { STONEKEEPER_LINE } from "../core/smith";
import {
  hasDiamond,
  placeDiamond,
  shrineNote,
  useStatue,
} from "../core/shrine";
import {
  campLine,
  QUARRY_BRIDGE_LINE,
  QUARRY_MAP,
  QUARRY_OPEN,
  YARD_EMPTY_LINE,
} from "../core/quarry";
import { FERRY_LINE, takeTreasure } from "../core/cove";
import { cropOfSeed, itemById } from "../core/items";
import { MIXED_SEED } from "../core/weeds";
import { reasonText } from "../core/tools";

import { mapFiles, maps } from "../content/maps";
import { START, safeSpawn } from "../core/maps";
import { HAT_KEY } from "./art-people";
import { DEPTH, sortDepth } from "./depth";
import {
  WalkState,
  syncVillagers as syncVillagerSprites,
  type VillagerSprite,
} from "./farm-walkers";
import { drawMapArt } from "./mapart";
import { MAP_PASSES } from "./map-passes";

import { storeOf } from "../core/mapstore";
import { mapWithDoors } from "../core/placement";
import { farmMapOf, isFarmMap, resolveMapId } from "../core/farmtypes";
import { pondCovering, pondStep } from "../core/pond";
import {
  dismountSafely,
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
  exitOpen,
  FarmMap,
  layersAtTier,
  layerShows,
  type Exit,
  type TiledLayer,
} from "../core/map";
import { counterShutLine, doorShopId, doorShutLine } from "../core/shophours";

import { traderProblem } from "../core/trader";
import { sellerProblem } from "../core/courtship";
import { PROPS_MARK, propsOf, spouseId } from "../core/spouse";
import { weddingId, weddingMorning } from "../core/courtship";
import {
  CART_IDLE_LINE,
  cartsRunning,
  herbStallProblem,
  stopOfService,
} from "../core/roomrewards";
import {
  exitLabel,
  mergeTags,
  serviceLabel,
  stackOffsets,
} from "../core/labels";
import { festivalPropBlocks } from "../core/festivalprops";
import {
  facingFrom,
  facingTile,
  move,
  tileOf,
  type Facing,
  type Vec,
} from "../core/movement";
import { aimAt } from "../core/aim";
import { tileScreenRect } from "../core/tipanchor";
import { createControls, type Controls } from "./controls";
import { DEFAULT_SCHEME, schemeById, usesTap } from "../core/controlschemes";

import { tapStatus } from "../core/tapper";
import {
  browserSettingsStore,
  loadDeviceSettings,
  nightSave,
  resumeSave,
  setSpotProvider,
  takeSaveNotice,
} from "./storage";
import { ResumeGate } from "../core/records";
import { serialize, type ResumeSpot } from "../core/save";
import { spawnTableOf } from "../core/spawns";
import { hallRestored } from "../core/bundles";
import { isWeapon, weaponById } from "../core/combat";
import {} from "../core/creatures";

import { jobDone, statusText } from "../core/machines";
import { caskStatus } from "../core/cask";

import { type Glow, lightLayer } from "../core/lights";
import { drink, isDrink } from "../core/elixirs";

import { type LitBomb } from "../core/bombs";
import { rollStrikes } from "../core/lightning";

import { greencoatDue } from "../core/camp";

import {
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
import { DECOR_ROOMS, decorById, roomTiles, zoneHolds } from "../core/decor";
import { carryFurniture, furnitureById } from "../core/furniture";
import { hatById } from "../core/hats";
import { greenhouseHolds } from "../core/greenhouse";
import {
  houseHolds,
  houseSpouse,
  houseVisibleTier,
  isHouseMap,
} from "../core/house";
import { SELECTED_KEY, STATE_KEY } from "./state";
import { placedChestTip } from "../core/itemtip";
import {} from "./art";
import { pickupRadius } from "../core/ground";
import { Hud } from "./hud";
import { PANEL_BOTTOM, PANEL_LEFT_BASE } from "./hudpanel";
import { UI_SIZE_KEY, WORLD_ZOOM_KEY } from "./panel";
import {
  cameraBounds,
  cornerScroll,
  hudScale,
  hudSlot,
  SLOT_SMALL,
  hudContentW,
  pinchPercent,
  stepPercent,
  worldZoom,
  ZOOM_MAX,
  ZOOM_MIN,
} from "../core/view";
import { makePlaceholderTextures, PLAYER_KEY } from "./placeholder-textures";
import { guestMayOpen } from "../core/menupages";
import type { ScreenRef } from "../core/screens";
import type { ShopStock } from "../core/shopoffers";
import { openShared } from "./guestlive";
import { bedNotice } from "../core/bednotice";
import { exhaustedSpeed, tiredWarning } from "../core/energyrules";
import { audio } from "../audio/engine";
import { setFarmProbe } from "../audio/director";
import { doorSoundFor, footstepFor } from "../core/audio";
import type { BedStatus } from "../core/room";
import { weddingWaiting } from "../core/marriagecard";
import { proposalFor } from "../core/playermarriage";
import { PlayerBlocking, resolveBlocking } from "../net/interp";
import {
  currentSession,
  GuestSession,
  HostSession,
  isGuest,
  noteHostLost,
  sendWorldIntent,
  type NetSession,
} from "../net/session";
import {
  gateShut,
  outdoorSoil,
  outdoorWorld,
  tileBlocked,
  tileBlockedNoHorse,
  type BlockWorld,
} from "../core/blocking";

import {
  drawGround,
  drawRooms,
  drawBuild,
  drawFurnace,
  drawShrine,
  drawMailbox,
  drawRequestMark,
  drawGreenhouse,
  drawCoop,
  drawCoopInside,
} from "./farm-draw";
import { drawTracker } from "./farm-tracker";
import {
  tileAtPointer,
  planAt,
  cancelTap,
  initTapInput,
  tapVector,
  initTapDuration,
} from "./farm-tap";
import {
  DEV_SPEED,
  PLAYER,
  SPEED,
  STEP_PX,
  TICK_MINUTES,
  TICK_MS,
} from "./farm-consts";
import {
  updateParade,
  festivalAction,
  pierKeeper,
  pierFloat,
  onLaunchLine,
  launchLanternAt,
  updateHunt,
  openFestival,
} from "./farm-festival";
import {
  updateParts,
  updateAttack,
  cast,
  updateBombs,
  detonateAll,
  strikeFlash,
  fightState,
  showHealth,
  syncCombatSettings,
  updateCombat,
  addCreatureSprite,
  floatText,
  swing,
} from "./farm-combat";
import { RemotePlayerLayer } from "./remoteplayers";
import { installDebugHooks, type DebugContext } from "./farm-debug";

/** How far the rider is drawn above the ground, so the horse shows under them. */
const RIDER_LIFT = 6;

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
  /** A tile to stand on (a resumed day, note 52), if it is still open. */
  x?: number;
  y?: number;
}

/**
 * A walkable map, a player and one `GameState`. The use key uses the held
 * tool, the end-day key sleeps (both rebindable, see `core/bindings.ts`). Walking through an exit restarts the scene on the next map; the
 * state and the selected toolbar slot survive in the game registry.
 */
export class FarmScene extends Phaser.Scene {
  state!: GameState;
  selected = 0;
  mapId: string = START.map;
  private entryName: string = START.entry;
  private restoreTile: { x: number; y: number } | undefined;
  private gate = new ResumeGate();
  leaving = false;
  /** The mine floor this map is, if it is one. */
  floor: number | undefined;
  floorState: Floor | undefined;
  /** False right after arriving on a ladder, until the player steps off it. */
  private ladderArmed = true;
  /** True once the player has stood off every exit tile, so a walk onto one counts. */
  private exitArmed = false;
  /** The last tile a held hoe or can worked by mouse drag. */
  private dragTile: { x: number; y: number } | undefined;
  /** Conditions that currently hold, for gated exits: "mines-open" from spring 5. */
  private holds = new Set<string>();
  message = "";
  /** True while the Hat Parade script holds the farmer in the line (input off, note 82). */
  marching = false;
  /** True after the first Action press on the ruined footbridge, which asks first. */
  private mendAsked = false;
  hud!: Hud;
  uiCamera!: Phaser.Cameras.Scene2D.Camera;
  /** The placeholder map labels and the world x each is centred on. */
  private glowDark = -1;
  private glowLights: Glow[] = [];
  private labelView = "";
  private hatTint = { id: "", color: 0 };
  labelTags: { o: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  /** The pictures of things on the map, redrawn by `drawGround`. */
  sprites: Phaser.GameObjects.Image[] = [];
  ground!: Phaser.GameObjects.Graphics;
  /** The light layer: glow rings of placed lights and the worn ring (note 89). */
  private glow!: Phaser.GameObjects.Graphics;
  /** Bombs lit and counting down on this map. Never saved: they go off at once on leaving (note 89). */
  litBombs: LitBomb[] = [];
  bombFx!: Phaser.GameObjects.Graphics;
  wash!: Phaser.GameObjects.Graphics;
  /** Tracker arrows at the screen edge, on the UI camera (note 07). */
  trackerGfx!: Phaser.GameObjects.Graphics;
  /** Dusk over the farm: fades in toward nightfall, which moves by season. */
  private night!: Phaser.GameObjects.Rectangle;
  map!: FarmMap;
  /** The building tier the map was loaded at: the house rooms built so far. */
  private tier = 0;
  /** Drawn layers that show only while a condition holds (`when` or `unless`), such as the log. */
  private conditional: {
    drawn: { setVisible(v: boolean): unknown };
    layer: TiledLayer;
  }[] = [];
  controls!: Controls;
  player!: Phaser.GameObjects.Image;
  /** The jam rule for walking into other players, and who we may walk through now (note 53). */
  private readonly blocking = new PlayerBlocking();
  private passList: string[] = [];
  /** The multiplayer session, if any, and the other players it shows (note 53). */
  private net: NetSession | undefined;
  /** Until this time (ms) no marriage card opens. */
  private cardQuiet = 0;
  private remote: RemotePlayerLayer | undefined;
  private target!: Phaser.GameObjects.Rectangle;
  /** Placeholder hat drawn on the player. */
  private hat!: Phaser.GameObjects.Image;
  /** One placeholder block per creature on this floor, by creature id. */
  creatureSprites = new Map<number, Phaser.GameObjects.Image>();
  /** The swing flash, drawn in the world. */
  swingFx!: Phaser.GameObjects.Graphics;
  /** The scene time before which the next weapon swing is refused. */
  swingReady = 0;
  /** The weapon last swung, for auto-attack's equip pick (note 27). */
  lastWeapon: string | undefined;
  /** Burn damage not yet a whole point of health. */
  burnDebt = 0;
  /** True while the naming dialog is open for the first ride. */
  private namingHorse = false;
  /** The horse under the rider while mounted (a placeholder block). */
  private steed!: Phaser.GameObjects.Image;
  animalImages: Phaser.GameObjects.Image[] = [];
  pos: Vec = { x: 0, y: 0 };
  facing: Facing = "down";
  heldMs = 0;
  /** Who aimed last: the cursor or the keys (note 46). Desktop only. */
  mouseAim = false;
  /** True while the left button is held in the world, for the axe repeat. */
  private mouseHeld = false;
  /** Wheel movement not yet turned into a slot step, so a trackpad is not too fast. */
  private wheelDelta = 0;
  /** Tap-to-move (note 27): the route still to walk, and what to do at the end. */
  tapPath: Vec[] = [];
  /** A tapped spot in the world the sling shoots at, for a moment. */
  scheme: TouchScheme = DEFAULT_SCHEME;
  tapShot?: { x: number; y: number; until: number };
  /** Villagers on this map right now and the placeholder blocks that show them (#599). */
  villagers: Present[] = [];
  villagerSprites = new Map<string, VillagerSprite>();
  /** Where each walker is behind their schedule, and the sprites a script has taken over (note 79). */
  walkers = new WalkState();
  /** The tile last checked for a heart event. */
  private eventTile = "";
  villagerStamp = -1;
  /** When the game clock last ticked (scene time), to walk the parade between ticks. */
  tickAt = 0;
  /** The running Seedswap hunt (placeholder markers and countdown). */
  hunt?: HuntState;
  huntGfx?: Phaser.GameObjects.Graphics;
  lanternGfx?: Phaser.GameObjects.Graphics;
  propsGfx: Phaser.GameObjects.Graphics[] = [];
  huntText?: Phaser.GameObjects.Text;
  /** The Frostday ice fishing count (placeholder, note 82). */
  private ice?: IceFishing;
  tapAct?: Vec;
  /** True when the route ends in using the held item on `tapAct` (note 27). */
  tapActUses = false;
  /** The tile the last tap asked for, drawn as the target; red if no route. */
  tapMark?: {
    x: number;
    y: number;
    bad: boolean;
    /** Grey: the tap only walks, the held item has no use there. */
    walk?: boolean;
    until: number;
  };
  tapDown = false;
  tapSwinging = false;
  tapStuckMs = 0;

  constructor() {
    super("farm");
  }

  init(data: Partial<SceneData>): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.net = currentSession();
    // A new map load is a new entry: the next area test offers its event (note 62, point 6).
    this.eventTile = "";
    const wanted = safeSpawn(
      {
        map: resolveMapId(data.map ?? START.map, this.state.farmType),
        entry: data.entry ?? START.entry,
        x: data.x,
        y: data.y,
      },
      (id) => mapFiles[id] !== undefined || mineFloorOf(id) !== undefined,
      resolveMapId(START.map, this.state.farmType),
    );
    // An old save may name a map that is gone: start at the farm instead.
    if (wanted.replaced)
      console.warn(`Unknown map "${data.map}": starting at the farm instead.`);
    this.mapId = wanted.spawn.map;
    this.entryName = wanted.spawn.entry;
    this.restoreTile =
      wanted.spawn.x !== undefined && wanted.spawn.y !== undefined
        ? { x: wanted.spawn.x, y: wanted.spawn.y }
        : undefined;
    this.gate = new ResumeGate();
    this.gate.seed(serialize(this.state));
    // An area map (the Forest) has its own trees, rocks and forage: set them in
    // the state while the player is here, and put the farm's back anywhere else.
    leaveArea(this.state);
    enterArea(this.state, this.mapId);
    this.state.guide.visit(this.mapId);
    this.selected =
      (this.registry.get(SELECTED_KEY) as number | undefined) ?? 0;
    this.leaving = false;
    this.marching = false;
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
    // The audio director reads the world through this (note 107).
    setFarmProbe(() => ({
      day: this.state.day.clock.day,
      minutes: this.state.day.clock.minutes,
      weather: this.state.weather,
      mapId: this.mapId,
      floor: this.floor,
      ground: this.state.ground.count,
      machinesDone: [...this.state.machines.each()].filter((m) =>
        jobDone(this.state, m),
      ).length,
    }));
    if (isFestivalMap(id)) audio.sfx("festival.start");
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
    // A festival day shows its layout on the map (note 82).
    for (const h of festivalHolds(day, hallRestored(this.state.hall)))
      holds.add(h);
    // The Winter Night Market's stalls stand all three days (note 14).
    for (const h of marketHolds(day)) holds.add(h);
    this.map = mineLayout
      ? FarmMap.fromTiled(json)
      : maps.getWith(id, holds, this.tier);
    // The coop and barn doors stand where the buildings were placed.
    if (isFarmMap(id)) this.map = mapWithDoors(this.state, this.map, id);
    if (isHouseMap(id)) carryFurniture(this.state, this.map, id);
    if (this.floor !== undefined)
      this.floorState = this.state.mines.visit(this.floor, day);
    // World objects: the painted map, the player and the facing marker.
    const world: Phaser.GameObjects.GameObject[] = [];
    const painted = drawMapArt(
      this,
      {
        mapId: id,
        json,
        layers: layersAtTier(json, this.tier, holds).filter(
          (layer) => layer.type === "tilelayer" && layer.visible !== false,
        ),
        // Every map under the sky has an `objects` layer; interiors and caves do not.
        outdoors: json.layers.some((layer) => layer.name === "objects"),
        floor: this.floor,
        season: dateOf(day).season,
      },
      MAP_PASSES,
    );
    for (const drawn of painted) {
      world.push(...drawn.objects);
      if (
        drawn.layer.properties?.some(
          (q) => q.name === "when" || q.name === "unless",
        )
      )
        this.conditional.push({ drawn, layer: drawn.layer });
    }

    const ts = this.map.tileSize;
    // Plots and forage sit on the tiles, under the player.
    this.ground = this.add.graphics().setDepth(DEPTH.decal);
    this.sprites = [];
    this.wash = this.add.graphics().setDepth(DEPTH.decal + 1);
    world.push(this.ground, this.wash);
    // A floor made in dangerous mode takes a red tint over the ground (placeholder).
    if (this.floorState?.dangerous)
      world.push(
        this.add
          .rectangle(
            0,
            0,
            this.map.width * ts,
            this.map.height * ts,
            0x8a1a1a,
            0.18,
          )
          .setOrigin(0)
          .setDepth(DEPTH.decal + 3),
      );
    world.push(...this.drawLabels());
    world.push(...this.drawSpouseProps(holds));
    let spawn: { x: number; y: number } = this.map.entry(this.entryName) ??
      this.map.entries[0] ?? { x: 1, y: 1 };
    // A resumed day puts the player back on the tile they left, if it is open.
    const back = this.restoreTile;
    if (back && !this.map.isBlocked(back.x, back.y)) spawn = back;
    // Coming up from below lands on the ladder that was taken down.
    const ladder = this.floorState?.ladder;
    if (this.entryName === "from_below" && ladder) {
      spawn = ladder;
      this.ladderArmed = false;
    }
    this.pos = { x: (spawn.x + 0.5) * ts, y: (spawn.y + 1) * ts - 2 };
    this.steed = this.add
      .image(this.pos.x, this.pos.y, "steed")
      .setOrigin(0.5, 1)
      .setVisible(false);
    world.push(this.steed);
    this.player = this.add
      .image(this.pos.x, this.pos.y, PLAYER_KEY)
      .setOrigin(0.5, 0.875);
    this.hat = this.add.image(0, 0, HAT_KEY).setVisible(false);
    this.target = this.add
      .rectangle(0, 0, ts, ts)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setDepth(DEPTH.decal + 2);
    world.push(this.player, this.hat, this.target);
    this.remote = this.net
      ? new RemotePlayerLayer(this, this.net, this.mapId, (o) =>
          this.uiCamera.ignore(o),
        )
      : undefined;
    if (this.net instanceof GuestSession) {
      this.net.onHostLost(() => this.hostLost());
      // The guest's farm copy changes only when the host's `applied` comes back (no prediction).
      this.net.onChange = () => this.render();
      this.net.onNight = (n) => {
        this.inBed = false;
        this.open("report", { lines: n.lines, day: n.day });
      };
      const guest = this.net;
      guest.onBeds = () => this.showBeds(guest.beds);
      this.net.onRejected = (reason) => {
        this.message = `The host said no: ${reason}.`;
        this.render();
      };
    } else if (this.net instanceof HostSession) {
      // The typed-address fallback (a router that blocks broadcasts) needs the real port.
      const { address, port } = this.net.host;
      if (address) this.message = `Others can join at ${address}:${port}`;
    }
    this.swingFx = this.add.graphics().setDepth(900);
    world.push(this.swingFx);
    this.litBombs = [];
    this.bombFx = this.add.graphics().setDepth(901);
    world.push(this.bombFx);
    this.events.once("shutdown", () => detonateAll(this, true));
    this.creatureSprites = new Map();
    syncCombatSettings(this);
    // A map with a creature spawn table (the Secret Woods) places its morning's creatures.
    if (isAreaMap(this.mapId))
      ensureMapCreatures(this.state, this.mapId, Math.random, {
        x: Math.floor(this.pos.x / this.map.tileSize),
        y: Math.floor(this.pos.y / this.map.tileSize),
      });
    for (const c of fightState(this)?.creatures ?? [])
      world.push(addCreatureSprite(this, c));
    this.hunt = this.huntGfx = this.huntText = undefined;
    this.ice = undefined;
    this.villagers = [];
    this.villagerSprites = new Map();
    this.walkers = new WalkState();
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
    this.glowDark = -1;
    this.glowLights = [];
    world.push(this.glow);

    // UI objects, drawn by a second camera that does not zoom.
    const settings = loadDeviceSettings();
    this.scheme = settings.touchScheme;
    this.hud = new Hud(
      this,
      (i) => this.select(i),
      () => this.use(),
      () => this.action(),
      () => this.openMenu("pack"),
      () => this.openMenu("crafting"),
      () => this.open("hats"),
      () => this.openJournal(),
      () => this.select(nextRow(this.state, this.selected)),
      () => this.open("debug"),
      settings,
    );
    // Esc opens the menu (fixed key, note 45).
    this.events.on("resume", () => {
      this.resumedAt = performance.now();
      this.campScreenOpen = false; // never stale: closed unless its screen is up
    });
    this.input.keyboard?.on("keydown-ESC", () => this.openMenu("pack"));
    this.controls = createControls(
      this,
      settings,
      {
        use: () => (this.keyAim(), this.use()),
        action: () => (this.keyAim(), this.action()),
        eat: () => this.eatHeld(),
        openSkills: () => this.openMenu("skills"),
        openCraft: () => this.openMenu("crafting"),
        openMenu: () => this.openMenu("pack"),
        openHats: () => this.open("hats"),
        openJournal: () => this.openJournal(),
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
    this.trackerGfx = this.add.graphics().setDepth(9000);
    const ui = [...this.controls.objects, ...this.hud.objects, this.trackerGfx];

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

    // The resume record (note 52): written when the page is hidden or closed.
    // Both writes are synchronous, which is why they work in `pagehide`.
    setSpotProvider(() => this.resumeSpot());
    const hidden = (): void => {
      if (document.visibilityState === "hidden") this.saveResume(true);
    };
    const closing = (): void => this.saveResume(true);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", closing);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", closing);
      setSpotProvider(undefined);
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

    if (this.controls.profile === "touch" && usesTap(settings.touchScheme))
      initTapInput(this);

    if (
      this.controls.profile === "touch" &&
      schemeById(settings.touchScheme).tapDuration
    )
      initTapDuration(this);

    this.initWorldTips();

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
    this.tickAt = this.time.now;
    this.time.addEvent({
      delay: TICK_MS / DEV_SPEED,
      loop: true,
      callback: () => {
        // Time stands still on a festival map, as in Stardew.
        if (isFestivalMap(this.mapId)) return;
        // A guest's clock follows the host's day message, so it does not tick (note 53).
        if (this.net instanceof GuestSession) return;
        this.tickAt = this.time.now;
        this.state.day.act(0, TICK_MINUTES);
        strikeFlash(this, rollStrikes(this.state, TICK_MINUTES, Math.random));
        this.afterAction();
      },
    });
    // Restarting the scene keeps its event listeners, so drop this one on
    // shutdown or each map change would add another and run it twice.
    const resumed = (
      _sys: unknown,
      data?: { sleep?: boolean; goto?: { map: string; entry: string } },
    ) => {
      syncCombatSettings(this);
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
      this.saveResume();
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

    if (DEBUG_TOOLS) installDebugHooks(this.debugContext());
  }

  /** What the dev hooks need from this scene (`farm-debug.ts`). */
  private debugContext(): DebugContext {
    return {
      state: () => this.state,
      restart: (data) => this.scene.restart(data),
      setState: (state) => this.registry.set(STATE_KEY, state),
      render: () => this.render(),
      mapId: () => this.mapId,
      entryName: () => this.entryName,
      startMap: START.map,
      startEntry: START.entry,
      mapSize: () => ({ width: this.map.width, height: this.map.height }),
      tileBlocked: (x, y) => this.tileBlocked(x, y),
      cancelTap: () => cancelTap(this),
      walkTo: (x, y) => {
        cancelTap(this);
        const plan = planAt(this, { x, y });
        if (!plan) return false;
        this.tapPath = plan.path;
        return true;
      },
      snapshot: () => ({
        pos: this.pos,
        tile: tileOf(this.pos, PLAYER, this.map.tileSize),
        facing: this.facing,
        walking: this.tapPath.length > 0,
        selected: this.selected,
        target: this.aimTile(),
        exit: this.exitAtAim(),
        zoom: this.cameras.main.zoom,
        message: this.message,
        creatures: fightState(this)?.creatures ?? [],
      }),
    };
  }

  update(_time: number, delta: number): void {
    this.clampLabels();
    drawTracker(this);
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
    updateBombs(this, dt);
    this.syncVillagers(undefined, dt);
    updateHunt(this, dt);
    this.checkHeartEvent();
    this.checkWedding();
    const marching = updateParade(this, dt);
    if (marching) cancelTap(this);
    const parts = updateParts(this);
    const stick = marching ? { x: 0, y: 0 } : this.controls.vector();
    // A push on the stick overrides a tap route (tap and stick schemes).
    if (stick.x !== 0 || stick.y !== 0) cancelTap(this);
    const walking = !marching && this.tapPath.length > 0;
    const v = marching ? { x: 0, y: 0 } : walking ? tapVector(this, dt) : stick;
    updateAttack(this, parts);
    if (!walking && (v.x !== 0 || v.y !== 0)) cancelTap(this);
    this.facing = facingFrom(v, this.facing);
    if (v.x !== 0 || v.y !== 0) this.keyAim();
    const ts = this.map.tileSize;
    const before = { ...this.pos };
    const slowed =
      this.state.combat.effects.speedFactor() *
      this.state.combat.killSpeedFactor() *
      exhaustedSpeed(this.state.day.energy.current);
    const remotes = this.net?.remotes() ?? [];
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
    if (this.net) {
      // Other players block, until the jam rule lets us through (note 53, Q5). Untested in a browser.
      const r = resolveBlocking(
        this.blocking,
        dt * 1000,
        before,
        this.pos,
        this.mapId,
        remotes,
      );
      this.pos = { x: r.x, y: r.y };
      this.passList = r.pass;
    }
    this.stepSound(Math.hypot(this.pos.x - before.x, this.pos.y - before.y));
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
        cancelTap(this);
        this.tapMark = undefined;
      }
    }
    const riding = this.state.animals.mounted;
    const depth = sortDepth(this.pos.y);
    this.steed
      .setVisible(riding)
      .setPosition(this.pos.x, this.pos.y)
      .setDepth(depth);
    this.player
      .setPosition(this.pos.x, this.pos.y - (riding ? RIDER_LIFT : 0))
      .setDepth(depth);
    this.hat.setDepth(depth);
    this.drawHat();
    this.syncNet();
    // Until intents exist a guest can only walk and look (note 53).
    if (!isGuest()) {
      this.repeatUse(delta * DEV_SPEED);
      this.dragSoilWork();
      this.pickUp();
      updateCombat(this, dt);
    }

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
    this.walkIntoPlaceHere(here);
    if (!onExit) this.exitArmed = true;
    else if (this.exitArmed && !this.leaving && !this.marching) {
      this.exitArmed = false;
      this.useDoor(onExit);
    }
  }

  /** The distance walked since the last footstep sound, in pixels. */
  private stride = 0;

  /** A footstep every few tiles of walking, by the surface under the feet (note 107). */
  private stepSound(moved: number): void {
    if (moved <= 0 || this.state.animals.mounted) return;
    this.stride += moved;
    if (this.stride < STEP_PX) return;
    this.stride = 0;
    const t = tileOf(this.pos, PLAYER, this.map.tileSize);
    audio.sfx(
      footstepFor(this.mapId, this.floor, {
        water: this.map.isWater(t.x, t.y),
        tilled: isFarmMap(this.mapId) && !!this.state.farm.plotAt(t.x, t.y),
      }),
    );
  }

  /**
   * True for an exit you walk onto: one on the map edge that is three or more
   * tiles wide (open land), or any edge exit inside a building, or its door (leaving).
   * Going into a building still needs the door opened (click or Action).
   */
  private isWalkThrough(e: Exit): boolean {
    const edge =
      e.x === 0 ||
      e.y === 0 ||
      e.x + e.w >= this.map.width ||
      e.y + e.h >= this.map.height;
    // Rebuilt interiors keep their door a tile inside the walls, so the way out is the exit named "door".
    if (!this.outdoorWorld && e.id === "door") return true;
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
  tileBlocked(x: number, y: number): boolean {
    return tileBlocked(this.blockWorld(), x, y);
  }

  tileBlockedNoHorse(x: number, y: number): boolean {
    return tileBlockedNoHorse(this.blockWorld(), x, y);
  }

  /** What `core/blocking.ts` reads of this scene. */
  private blockWorld(): BlockWorld {
    return {
      state: this.state,
      map: this.map,
      mapId: this.mapId,
      rocks: this.rocks(),
      festivalShut: (x, y) => this.tileShutForFestival(x, y),
    };
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

  /** The sprinklers, trees and soil of the map the player is on (`mapstore.ts`). */
  get store() {
    return storeOf(this.state, this.map.indoors);
  }

  /** True on a map with the farm's soil: its trees, weeds, forage and machines live here. The greenhouse has its own soil. */
  get outdoorSoil(): boolean {
    return outdoorSoil(this.map);
  }

  /** True outdoors on the farm or an area map: the map whose trees, rocks and forage are the state's. */
  get outdoorWorld(): boolean {
    return outdoorWorld(this.map, this.mapId);
  }

  /**
   * The tip over a placed chest: a mouse hover on desktop, a held finger on
   * touch (about half a second, no travel). Shown in the HUD's tooltip.
   */
  private initWorldTips(): void {
    const tipAt = (p: Phaser.Input.Pointer): void => {
      if (this.hud.covers(p.x, p.y) || this.leaving) return this.hud.hideTip();
      const t = tileAtPointer(this, p);
      const chest = this.state.chests.get(this.mapId, t.x, t.y);
      if (chest) {
        const cam = this.cameras.main;
        this.hud.showTipOver(
          placedChestTip(chest),
          tileScreenRect(t.x, t.y, this.map.tileSize, cam.worldView, cam.zoom),
        );
      } else this.hud.hideTip();
    };
    let timer: Phaser.Time.TimerEvent | undefined;
    let from = { x: 0, y: 0 };
    const stop = (): void => {
      timer?.remove();
      timer = undefined;
      this.hud.hideTip();
    };
    const onMove = (p: Phaser.Input.Pointer): void => {
      if (!p.wasTouch) return tipAt(p);
      if (Math.hypot(p.x - from.x, p.y - from.y) > 12) stop();
    };
    const onDown = (p: Phaser.Input.Pointer): void => {
      if (!p.wasTouch) return;
      from = { x: p.x, y: p.y };
      timer?.remove();
      timer = this.time.delayedCall(450, () => tipAt(p));
    };
    this.input.on("pointermove", onMove);
    this.input.on("pointerdown", onDown);
    this.input.on("pointerup", stop);
    this.events.once("shutdown", () => {
      timer?.remove();
      this.input.off("pointermove", onMove);
      this.input.off("pointerdown", onDown);
      this.input.off("pointerup", stop);
    });
  }

  slingHeld(): boolean {
    const h = heldAt(this.state, this.selected);
    return (
      h.kind === "item" &&
      isWeapon(h.id) &&
      weaponById(h.id)?.family === "sling"
    );
  }

  /**
   * Show the villagers the schedule puts on this map (#599). Runs each frame;
   * people walk between their stops (note 79, `farm-walkers.ts`).
   */
  private syncVillagers(world?: Phaser.GameObjects.GameObject[], dt = 0): void {
    syncVillagerSprites(this, dt, !(this.net instanceof GuestSession), world);
  }

  /** The villager Action last talked to, to settle a tie between two people beside the faced tile. */
  lastTalkedId: string | undefined;

  /** Talk to a villager, or give them the held item (#599, note 61). Returns false if nobody is on or beside the faced tile. */
  private meetVillager(tile: Vec): boolean {
    const who = talkTarget(
      this.villagers,
      tile,
      tileOf(this.pos, PLAYER, this.map.tileSize),
      this.lastTalkedId,
      // A service on the faced tile wins over someone standing beside it.
      !!this.map.serviceAt(tile.x, tile.y),
    );
    if (!who) return false;
    this.lastTalkedId = who.id;
    this.walkers.hold(who.id, this.time.now);
    // In a hedge niche a villager says their one Hollow Eve line (note 82).
    if (festivalOfMap(this.mapId)?.activity === "maze") {
      const line = nicheLine(who.id);
      if (line) {
        this.message = `${who.name}: ${line}`;
        this.render();
        return true;
      }
    }
    const offer = this.hunt
      ? undefined
      : huntOffer(
          festivalDayToday(this.state.day.clock.day),
          this.mapId,
          who.id,
          this.state.day.clock.day,
          this.state.day.clock.minutes,
        );
    if (offer) {
      this.hunt = offer.state;
      this.message = offer.message ?? "";
      this.render();
      return true;
    }
    if (this.iceTalk(who.id)) return true;
    const held = heldAt(this.state, this.selected);
    const hall = hallRestored(this.state.hall);
    const feast = feastGive(
      this.state,
      this.mapId,
      who.id,
      held.kind === "item" ? held.id : undefined,
      hall,
    );
    if (feast) {
      this.message = feast.message;
      if (feast.giver && feast.present)
        playFeastReveal(this, who.id, feast.giver, feast.present);
      this.render();
      return true;
    }
    const r = meet(
      this.state,
      who.id,
      held.kind === "item" ? held.id : undefined,
    );
    this.message = r.message;
    if (r.consumed) audio.sfx(r.taste === "love" ? "gift.loved" : "gift.give");
    if (r.kiss) audio.sfx("heart.up");
    if (lanternOn(this.state, this.mapId, hall, who.id))
      this.message +=
        " A lantern hangs over this seat: hold a gift and give it.";
    if (r.kiss)
      floatText(
        this,
        (tile.x + 0.5) * this.map.tileSize,
        tile.y * this.map.tileSize - 4,
        "\u2665",
        "#ff7aa8",
      );
    this.render();
    return true;
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
  keyAim(): void {
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
    // A mine floor has its own ground; elsewhere the farm or an area map outdoors.
    const ground = this.floorState
      ? this.floorState.ground
      : this.outdoorWorld
        ? this.state.ground
        : undefined;
    if (!ground || ground.count === 0) return;
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    if (
      ground.collect(
        this.state.inventory,
        here,
        pickupRadius(this.state.equipment.magnetBonus()),
      )
    ) {
      audio.sfx("item.pickup");
      this.render();
    }
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
        this.store.fruitTrees.at(front.x, front.y) ||
        this.store.teaBushes.at(front.x, front.y)
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
    if (this.leaving || this.marching) return false;
    const exit = at;
    if (!exit) return false;
    // The Larder may have been finished at the hall since the last morning.
    this.refreshHolds();
    const doorShut =
      this.mapId === "hearthwell" ? doorShutLine(this.state, exit.id) : "";
    if (!doorShut && this.mapId === "hearthwell") {
      const sid = doorShopId(exit.id);
      if (sid) this.state.guide.visitShop(sid);
    }
    if (doorShut) {
      audio.sfx("door.locked");
      this.message = doorShut;
      this.render();
    } else if (this.exitShutForFestival(exit)) {
      audio.sfx("door.locked");
      this.message = festivalShutLine(this.state.day.clock.day);
      this.render();
    } else if (exitOpen(exit, this.holds)) this.leave(exit);
    else {
      audio.sfx("door.locked");
      this.message = exit.requires?.startsWith("festival-gate")
        ? "Nothing is on there today."
        : exit.id === "greenhouse"
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
  hereTile(): { map: string; x: number; y: number } {
    const t = tileOf(this.pos, PLAYER, this.map.tileSize);
    return { map: this.mapId, x: t.x, y: t.y };
  }

  /**
   * True when the exit lands in a festival place that is not open yet
   * (note 82 decision 12). Only exits whose target map is built are checked.
   * The hall's restored state is derived from the bundles (`hallRestored`).
   */
  private exitShutForFestival(exit: Exit): boolean {
    const target = maps.get(resolveMapId(exit.map, this.state.farmType));
    const at = target?.entry(exit.entry);
    if (!at) return false;
    const clock = this.state.day.clock;
    return festivalStepShut(
      clock.day,
      clock.minutes,
      this.hereTile(),
      {
        map: resolveMapId(exit.map, this.state.farmType),
        x: at.x,
        y: at.y,
      },
      hallRestored(this.state.hall),
    );
  }

  /** True on a gated bedroom door the player has not earned the hearts for yet. */
  private gateShut(x: number, y: number): boolean {
    return gateShut(this.state, this.map, this.mapId, x, y);
  }

  /** The last tile checked for walking into a festival held in place. */
  private placeTile = "";

  /** Standing in today's festival place while it is open joins it (note 82 decision 11). */
  private walkIntoPlaceHere(here: { x: number; y: number }): void {
    const key = `${this.mapId}:${here.x},${here.y}`;
    if (key === this.placeTile) return;
    this.placeTile = key;
    const f = walkIntoPlace(
      this.state,
      this.mapId,
      here.x,
      here.y,
      hallRestored(this.state.hall),
    );
    if (f) {
      this.message = `You join the ${f.name}.`;
      this.render();
    }
  }

  private tileShutForFestival(x: number, y: number): boolean {
    const clock = this.state.day.clock;
    if (
      festivalPropBlocks(
        clock.day,
        this.mapId,
        hallRestored(this.state.hall),
        x,
        y,
      )
    )
      return true;
    return festivalStepShut(
      clock.day,
      clock.minutes,
      this.hereTile(),
      {
        map: this.mapId,
        x,
        y,
      },
      hallRestored(this.state.hall),
    );
  }

  private leave(exit: Exit): void {
    // Walking onto a festival map joins the festival (note 82 decision 11).
    if (!isFestivalMap(this.mapId)) {
      const problem = walkIntoFestival(this.state, exit.map);
      if (problem) {
        this.message = problem;
        return this.render();
      }
    }
    const door = doorSoundFor(this.mapId, exit.map);
    if (door) audio.sfx(door);
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
    const touchProfile = this.controls.profile === "touch";
    const slot = hudSlot(uiPercent, touchProfile, width, height);
    const scale = hudScale(
      uiPercent,
      touchProfile,
      width,
      // The touch column is not a bar: keep the small bar width as the limit.
      hudContentW(touchProfile ? SLOT_SMALL : slot),
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
    this.hud.layout(width / scale, height / scale, scale, slot);
    this.controls.setUiScale(scale);
  }

  /** Fade out and restart the scene on another map. */
  travel(map: string, entry: string): void {
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
      this.saveResume();
    }
    const data: SceneData = { map, entry };
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once("camerafadeoutcomplete", () =>
      this.scene.restart(data),
    );
  }

  /** The tile the horse stands on here, when it is not being ridden. */
  horseSpot(): { x: number; y: number } | undefined {
    return horseTile(
      this.state,
      this.mapId,
      stableHome(this.state, this.mapId),
    );
  }

  /** How the player gets off the horse: a tap on the farmer, or the Action key. */
  private getOffHint(): string {
    return this.controls.profile === "touch" && usesTap(this.scheme)
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
    audio.sfx("animal.horse");
    this.message = `You are riding ${horseName(this.state)}. ${this.getOffHint()} to get off.`;
    this.saveResume();
    this.render();
  }

  /** Get off where the rider stands. The horse waits there until morning. */
  getOff(): void {
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
    this.saveResume();
    this.render();
  }

  /** Take the ladder down. The last built floor has none. */
  private descend(): void {
    if (this.floor === undefined || this.floor >= BUILT_FLOORS) return;
    audio.sfx("mine.stairs");
    this.travel(mineMapId(this.floor + 1), "from_above");
  }

  /** The rocks on this map: the farm's, or this mine floor's. */
  rocks(): Rocks | undefined {
    if (this.floorState) return this.floorState.rocks;
    return isFarmMap(this.mapId) || isAreaMap(this.mapId)
      ? this.state.rocks
      : undefined;
  }

  select(index: number): void {
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
    if (this.hatTint.id !== def.id)
      this.hatTint = {
        id: def.id,
        color: Phaser.Display.Color.HexStringToColor(def.color).color,
      };
    this.hat.setTint(this.hatTint.color).setPosition(this.pos.x, head + 1);
  }

  /** The short scene that opens the Special Orders board (note 65). Shown once. */
  private showOrdersIntro(): void {
    this.state.orders.opened = true;
    this.saveResume();
    this.open("orders", { intro: true });
  }

  private weddingDay = -1;

  /**
   * The wedding morning (note 12, 84): once a day, when it is the wedding day
   * the scene starts at once. A festival or a rain day puts it off a day.
   */
  private checkWedding(): void {
    const g = this.state;
    const day = g.day.clock.day;
    if (this.weddingDay === day || g.marriage.stage !== "engaged") return;
    this.weddingDay = day;
    const r = weddingMorning(g);
    // A put-off wedding is told in the morning report, with the reason (marriage.putOffWhy).
    if (r === "go" && g.marriage.spouse)
      this.open("heart-event", { id: weddingId(g.marriage.spouse) });
  }

  /**
   * Walking into an event's area, or into its building, starts its scene (note 62, point 6). The
   * scene starts at once, with no warning (owner decision 2026-11-21). The area is tested when the
   * tile changes, so an event starts once on entry; the clock moving on inside an area checks
   * again, for a window that opens while the player stands there. A seen event is never due.
   */
  private checkHeartEvent(): void {
    if (isFestivalMap(this.mapId) || this.state.animals.mounted) return;
    const t = tileOf(this.pos, PLAYER, this.map.tileSize);
    const places = placesAt(this.mapId, t.x, t.y);
    // Nothing to offer outside every area; forget it so the next entry counts as one.
    if (places.length === 0) {
      this.eventTile = "";
      return;
    }
    const minute = this.state.day.clock.minutes;
    const key = `${this.mapId}|${places.join(",")}|${minute}`;
    if (key === this.eventTile) return;
    this.eventTile = key;
    const day = this.state.day.clock.day;
    const event = eventAtTile(this.state, this.mapId, t.x, t.y, {
      day,
      weather: this.state.weather,
      minute,
    });
    if (event) this.open("heart-event", { id: event.id });
  }

  /** Open a screen over the farm. The farm is paused until it closes. */
  /** The tabbed in-game menu (note 49), on a tab. */
  private resumedAt = 0;

  private openMenu(tab: string): void {
    if (this.leaving || this.marching) return;
    // A menu that closes on Esc or E resumes the farm in the same key event:
    // do not open it again.
    if (performance.now() - this.resumedAt < 250) return;
    this.open("menu", { tab });
  }

  /** The journal window (note 49), on J or its HUD button. */
  private openJournal(): void {
    if (this.leaving || this.marching) return;
    if (performance.now() - this.resumedAt < 250) return;
    this.open("journal");
  }

  /** The host's socket closed: close any screen over the farm and go to the Title with a note. */
  private hostLost(): void {
    noteHostLost();
    for (const s of this.scene.manager.getScenes(true))
      if (s.scene.key !== "farm") s.scene.stop();
    this.scene.start("title");
  }

  /** True only while the camp chest screen is up; the chest is drawn closed otherwise, emptied or not. */
  campScreenOpen = false;

  /** The camp chest screen closed: redraw the chest and toast what was found, if anything. */
  campClosed(found?: string): void {
    this.campScreenOpen = false;
    if (found) this.message = found;
    this.render();
  }

  open(kind: string, data?: object): void {
    // A guest sees read-only screens only; the rest would edit a local copy (note 53).
    if (isGuest() && !guestMayOpen(kind)) {
      this.message = "Only the host can do that for now.";
      return this.render();
    }
    this.scene.launch(kind, data);
    this.scene.pause();
  }

  /**
   * A guest's Action on a shop, stall, bin or chest (note 108, group 1): ask the host to open it
   * (it takes the chest lock and checks where they stand), and show the screen once it says yes.
   * True when the faced tile held one of these, so the caller stops.
   */
  private guestSharedScreen(at: { x: number; y: number }): boolean {
    const service = this.map.serviceAt(at.x, at.y);
    const base = { map: this.mapId, x: at.x, y: at.y };
    let ref: ScreenRef | undefined;
    let scene = "";
    let data: object | undefined;
    const closed = (line: string): true => {
      this.message = line;
      this.render();
      return true;
    };
    if (service) {
      const shut = counterShutLine(this.state, this.mapId, service.kind);
      const stock: Record<string, ShopStock | undefined> = {
        shop: undefined,
        "fisher-shop": "fisher",
        "pin-stall": "pin",
        "herb-stall": "herb",
        hermit: "hermit",
        trader: "trader",
        "rain-seller": "rain",
      };
      if (service.kind in stock) {
        if (shut) return closed(shut);
        const g = this.state;
        const why =
          service.kind === "herb-stall"
            ? herbStallProblem(g)
            : service.kind === "trader"
              ? traderProblem(g.day.clock.day, g.day.clock.minutes)
              : service.kind === "rain-seller"
                ? sellerProblem(g)
                : service.kind === "hermit" && hermitStock(g).length === 0
                  ? HERMIT_LINE
                  : "";
        if (why) return closed(why);
        const s = stock[service.kind];
        ref = { kind: "shop", ...base, ...(s ? { stock: s } : {}) };
        scene = "shop";
        data = s ? { stock: s } : undefined;
      } else if (service.kind === "market-stall" && stallOf(service.id)) {
        ref = { kind: "market", ...base, stock: stallOf(service.id)! };
        scene = "market";
        data = { stall: stallOf(service.id) };
      } else if (service.kind === "bin" || service.kind === "ore-bin") {
        const ore = service.kind === "ore-bin";
        ref = { kind: "bin", ...base, ore };
        scene = "bin";
        data = ore ? { oreOnly: true } : undefined;
      } else if (service.kind === "furnace") {
        if (!this.state.furnace.gifted) return closed("Nothing is here yet.");
        ref = { kind: "furnace", ...base };
        scene = "furnace";
      } else if (service.kind === "cooking") {
        ref = { kind: "cooking", ...base };
        scene = "cooking";
      } else if (
        service.kind === "keeper" ||
        service.kind === "coop-bench" ||
        service.kind === "barn-bench"
      ) {
        if (shut) return closed(shut);
        ref = { kind: service.kind, ...base };
        scene = service.kind;
      } else if (service.kind === "hall") {
        // A hall room's scroll: the room is the service's id (note 108 group 4).
        ref = { kind: "hall", ...base, room: service.id };
        scene = "hall";
        data = { room: service.id };
      } else if (service.kind === "orders" || service.kind === "requests") {
        ref = { kind: service.kind, ...base };
        scene = service.kind;
      } else if (service.kind === "camp-chest" && this.floor !== undefined) {
        ref = { kind: "camp-chest", ...base, floor: this.floor };
        scene = "chest";
        data = { camp: this.floor };
      }
    } else if (
      isHouseMap(this.mapId) &&
      furnitureById(this.state.furniture.at(this.mapId, at.x, at.y))
        ?.station === "workbench"
    ) {
      ref = { kind: "crafting", ...base };
      scene = "crafting";
      data = { bench: { mapId: this.mapId, x: at.x, y: at.y } };
    } else if (this.state.chests.get(this.mapId, at.x, at.y)) {
      ref = { kind: "chest", ...base };
      scene = "chest";
      data = { mapId: this.mapId, x: at.x, y: at.y };
    } else if (isFarmMap(this.mapId) && pondCovering(this.state, at.x, at.y)) {
      // A pond: a held fish, the quest item or a waiting product is the host's Action rule (a `pond-use`
      // intent); otherwise the menu opens, and it locks like a chest (note 108 group 3).
      const p = pondCovering(this.state, at.x, at.y)!;
      const held = heldAt(this.state, this.selected);
      const item = held.kind === "item" ? held.id : undefined;
      if (this.net instanceof GuestSession && pondStep(p, item) !== "status") {
        this.net.sendIntent({
          kind: "pond-use",
          x: at.x,
          y: at.y,
          ...(item !== undefined ? { item } : {}),
        });
        return true;
      }
      ref = { kind: "pond", map: this.mapId, x: p.x, y: p.y };
      scene = "pond";
      data = { x: p.x, y: p.y };
    }
    if (!ref) return false;
    openShared(
      ref,
      () => {
        if (ref.kind === "camp-chest") this.campScreenOpen = true;
        if (ref.kind === "chest") audio.sfx("chest.open");
        this.open(scene, data);
      },
      (why) => closed(why),
    );
    return true;
  }

  /**
   * A guest's Use: the hoe, can and crop seeds on farm soil become intents for the host, which
   * answers with `applied` (note 53). Anything else stays host-only for now.
   * Untested in a browser.
   */
  private guestUse(): void {
    const net = this.net;
    if (!(net instanceof GuestSession)) return;
    const held = heldAt(this.state, this.selected);
    const front = this.aimTile();
    if (!isFarmMap(this.mapId)) return;
    if (held.kind === "tool" && held.tool === "hoe")
      net.sendIntent({ kind: "till", x: front.x, y: front.y });
    else if (
      held.kind === "tool" &&
      held.tool === "can" &&
      !this.map.isWater(front.x, front.y)
    )
      net.sendIntent({ kind: "water", x: front.x, y: front.y });
    else if (isLiftTool(held))
      net.sendIntent({ kind: held.tool, x: front.x, y: front.y });
    else if (held.kind === "item" && this.state.machines.at(front.x, front.y))
      net.sendIntent({
        kind: "machine-load",
        x: front.x,
        y: front.y,
        item: held.id,
      });
    else if (held.kind === "item" && cropOfSeed(held.id))
      net.sendIntent({ kind: "plant", x: front.x, y: front.y, seed: held.id });
    else {
      this.message = "Only the host can do that for now.";
      this.render();
    }
  }

  /** Use the held tool on the tile the player faces. Services are Action's. */
  use(): void {
    if (this.leaving || this.marching) return;
    if (this.useDoor()) return;
    if (isGuest()) return this.guestUse();
    if (this.state.animals.mounted) {
      this.message = `${this.getOffHint()} to get off ${horseName(this.state)} first.`;
      return this.render();
    }
    const intent = resolveUse(
      this.state,
      LOCAL_PLAYER,
      this.useContext(),
      heldAt(this.state, this.selected),
      this.aimTile(),
    );
    switch (intent.kind) {
      case "none":
        return;
      case "message":
        this.message = intent.text;
        return this.render();
      case "swing":
        return swing(this, intent.weapon);
      case "cast":
        return cast(this, intent.rod);
      case "report":
        if (intent.bomb) {
          this.litBombs.push(intent.bomb);
          audio.sfx("bomb.fuse");
        }
        return this.report(intent.result);
      case "tool":
        if (intent.cue) audio.sfx(intent.cue);
        this.report(intent.result, true);
        // Chopping the massive log raises a world flag: open its exit, drop its art.
        this.refreshHolds();
    }
  }

  /** What the Use and Action rules need to know about this place (`core/interact.ts`). */
  private useContext(): UseContext {
    return {
      mapId: this.mapId,
      map: this.map,
      ...(this.floor !== undefined ? { floor: this.floor } : {}),
      facing: this.facing,
      rockAt: (x, y) => !!this.rocks()?.at(x, y),
      litBombAt: (x, y) => this.litBombs.some((b) => b.x === x && b.y === y),
      personAt: (x, y) => !!presentAt(this.villagers, x, y),
    };
  }

  /** The Frostday contest for a cast landing on this tile: the state at a hole, "shut" before opening. */
  iceFor(x: number, y: number): IceFishing | "shut" | undefined {
    const f = festivalDayToday(this.state.day.clock.day);
    if (f?.id !== "frostday" || this.mapId !== "forest") return undefined;
    if (lakeShut(f, this.state.day.clock.minutes)) return "shut";
    if (!isHole(f, x, y)) return undefined;
    this.ice ??= startIceFishing(f);
    return this.ice;
  }

  /** Talk to Cuthbert at the contest: the count, or the judging, the prize and the end of the festival. */
  private iceTalk(who: string): boolean {
    const f = festivalDayToday(this.state.day.clock.day);
    if (f?.id !== "frostday" || this.mapId !== "forest") return false;
    this.ice ??= startIceFishing(f);
    const line = iceOffer(this.ice, who, this.state.day.clock.minutes);
    if (!line) return false;
    this.message = line;
    const s = this.ice;
    if (s && s.status !== "fishing") {
      const won = awardIcePrize(this.state, s);
      if (won)
        this.message +=
          ` ${won.hat ? `You get the ${hatById(won.hat)?.name ?? "hat"}. ` : ""}${won.frostfin ? "You get a Frostfin." : ""}`.trim();
      finishIceFishing(this.state, s);
      this.ice = undefined;
    }
    this.render();
    return true;
  }

  /**
   * The ancestors' shrine (note 83): a held Diamond is set in the stone and the
   * candles are scored again; at four candles the bare stone gives ore once a
   * day; otherwise the note at the stone is read.
   */
  private shrineAction(): void {
    const held = heldAt(this.state, this.selected);
    if (
      held.kind === "item" &&
      held.id === "diamond" &&
      hasDiamond(this.state)
    ) {
      const r = placeDiamond(this.state);
      if (r.ok)
        return this.open("shrine", {
          mode: "redo",
          candles: r.candles,
          line: r.line,
        });
    }
    this.message = this.state.shrine.statueOpen
      ? useStatue(this.state, Math.random)
      : shrineNote(this.state);
    this.render();
  }

  /**
   * The Action button on the faced tile (note 47): open a service, else shake,
   * pick or harvest, else eat the held food. A tile with nothing on it, and
   * nothing edible held, does nothing and says nothing.
   */
  action(): void {
    if (this.leaving || this.marching) return;
    if (this.useDoor()) return;
    if (this.getOutOfBed()) return;
    if (isGuest()) {
      // A guest's Action opens only the screens a guest may use: the bed, the shop, the bin, the ledger.
      const at = this.aimTile();
      const kind = this.map.serviceAt(at.x, at.y)?.kind;
      if (this.guestSharedScreen(at)) return;
      if (kind && guestMayOpen(kind)) return this.open(kind);
      // A finished batch in a machine is taken by the host for them (an intent, note 108 group 2).
      const machine =
        isFarmMap(this.mapId) && this.state.machines.get(at.x, at.y);
      if (machine && this.net instanceof GuestSession) {
        if (machine.job && jobDone(this.state, machine))
          this.net.sendIntent({ kind: "machine-collect", x: at.x, y: at.y });
        else {
          this.message = statusText(this.state, at.x, at.y);
          this.render();
        }
        return;
      }
      // A ripe crop on farm soil is picked by the host for them (an intent).
      if (
        !kind &&
        this.net instanceof GuestSession &&
        isFarmMap(this.mapId) &&
        this.state.farm.isRipe(at.x, at.y)
      )
        this.net.sendIntent({ kind: "harvest", x: at.x, y: at.y });
      return;
    }
    if (this.state.animals.mounted) return this.getOff();
    const front = this.aimTile();
    const spot = this.horseSpot();
    if (spot && spot.x === front.x && spot.y === front.y) return this.getOn();
    if (this.meetVillager(front)) return;
    if (onLaunchLine(this, front)) return launchLanternAt(this);
    if (this.map.serviceAt(front.x, front.y)?.kind !== "tide-bridge")
      this.mendAsked = false;
    const intent = resolveAction(
      this.state,
      LOCAL_PLAYER,
      {
        ...this.useContext(),
        ladderAt: (x, y) => {
          const ladder = this.floorState?.ladder;
          return !!ladder && ladder.x === x && ladder.y === y;
        },
      },
      heldAt(this.state, this.selected),
      front,
    );
    this.applyAction(intent, front);
  }

  /** Show what the Action rule decided: sounds, lines, screens and the scene-owned follow-ups. */
  private applyAction(intent: ActionIntent, front: Vec): void {
    switch (intent.kind) {
      case "none":
        return;
      case "message":
        if (intent.cue) audio.sfx(intent.cue);
        this.message = intent.text;
        return this.render();
      case "open":
        if (intent.cue) audio.sfx(intent.cue);
        // Chests, ponds and the furnace are used by one player at a time (note 108 rule 2): the host
        // takes the lock too.
        if (
          intent.scene === "furnace" ||
          intent.scene === "chest" ||
          intent.scene === "pond"
        ) {
          const scene = intent.scene;
          // A pond's ref is its top left tile, which its menu data carries.
          const at =
            scene === "pond"
              ? (intent.data as { x: number; y: number })
              : front;
          const ref: ScreenRef = {
            kind: scene,
            map: this.mapId,
            x: at.x,
            y: at.y,
          };
          return openShared(
            ref,
            () => this.open(scene, intent.data),
            (why) => {
              this.message = why;
              this.render();
            },
          );
        }
        return this.open(intent.scene, intent.data);
      case "report":
        return this.report(intent.result);
      case "act":
        if (intent.cue) audio.sfx(intent.cue);
        return this.report(intent.result, true);
      case "eat":
        return this.eatHeld();
      case "ride-cart":
        return this.rideCart(intent.id);
      case "pier-keeper":
        return pierKeeper(this);
      case "pier-float":
        return pierFloat(this);
      case "shrine":
        return this.shrineAction();
      case "mend-bridge":
        return this.mendBridge();
      case "treasure":
        return this.openTreasure();
      case "stonekeeper":
        this.refreshHolds();
        this.message =
          this.mapId === QUARRY_MAP
            ? campLine(this.state.day.clock.day)
            : this.holds.has(QUARRY_OPEN)
              ? YARD_EMPTY_LINE
              : STONEKEEPER_LINE;
        return this.render();
      case "festival":
        return openFestival(this);
      case "festival-action":
        return festivalAction(this, intent.service);
      case "camp-chest":
        // Opens as a take-only chest screen (note 22, 2026-11-20).
        this.campScreenOpen = true;
        this.render();
        return this.open("chest", { camp: intent.floor });
      case "cave":
        return this.caveAction(front, intent.service);
      case "descend":
        return this.descend();
      case "stairs":
        audio.sfx("mine.stairs");
        return this.travel(mineMapId(1), "from_above");
    }
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
    this.saveResume();
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
      this.saveResume();
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
  private report(result: Outcome, silent = false): void {
    if (!silent)
      audio.sfx(
        result.ok ? (result.item ? "item.pickup" : "world.place") : "ui.error",
      );
    if (result.ok && result.levelUp) audio.sfx("ui.levelup");
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

  /** Eat the held item, if it is food. */
  eatHeld(): void {
    if (this.leaving || this.marching) return;
    const held = heldAt(this.state, this.selected);
    const drinking = held.kind === "item" && isDrink(held.id);
    const result =
      held.kind === "item"
        ? drinking
          ? drink(this.state, held.id)
          : eat(this.state, held.id)
        : { ok: false as const, reason: "not food" };
    audio.sfx(result.ok ? (drinking ? "drink" : "eat") : "ui.error");
    this.message = result.ok
      ? `${drinking ? "Drank" : "Ate"} ${itemById(held.kind === "item" ? held.id : "")?.name.toLowerCase()}.`
      : reasonText(result.reason);
    this.afterAction();
  }

  private afterAction(): void {
    const energy = this.state.day.energy.current;
    const warning = tiredWarning(this.lastEnergy, energy);
    this.lastEnergy = energy;
    if (warning && !this.state.day.over) this.message = warning;
    if (this.state.day.over) this.endDay();
    else if (pendingChoice(this.state.skills)) this.open("profession");
    else this.render();
  }

  /**
   * Where the player stands, for the resume record. Not in the mines or on a
   * map with a creature table: a tile inside a fight is not safe to restore.
   */
  private resumeSpot(): ResumeSpot | undefined {
    if (this.floor !== undefined || spawnTableOf(this.mapId)) return undefined;
    const ts = this.map.tileSize;
    return {
      map: this.mapId,
      x: Math.floor(this.pos.x / ts),
      y: Math.floor((this.pos.y - 1) / ts),
    };
  }

  /**
   * Write the resume record, so Continue picks the day up (note 52). Skipped
   * when nothing changed or one was written under two seconds ago, unless
   * forced (Exit, the page hidden). Never while the night is being written.
   */
  saveResume(force = false): void {
    // A guest's copy of the farm is never written to a save slot.
    if (this.state.day.over || isGuest()) return;
    const text = serialize(this.state);
    const now = performance.now();
    if (!this.gate.shouldWrite(text, now, force)) return;
    resumeSave(this.state, this.resumeSpot());
    this.gate.wrote(text, now);
    this.noteSaveFailure();
  }

  /** Tell the session where we are and draw the others; a guest's clock follows the host. */
  private syncNet(): void {
    const net = this.net;
    if (!net) return;
    net.reportPosition(
      {
        x: this.pos.x,
        y: this.pos.y,
        map: this.mapId,
        dir: ["up", "down", "left", "right"].indexOf(this.facing),
        pass: this.passList,
      },
      performance.now(),
    );
    if (net instanceof GuestSession && net.followDay(this.state.day.clock))
      this.render();
    this.remote?.sync();
    if (net instanceof HostSession) {
      const night = net.world.takeHostNight();
      if (night) {
        this.inBed = false;
        this.finishNight(night);
      } else this.showBeds(net.world.bedStatus());
    }
    this.checkMarriageCards(net.localId);
  }

  /**
   * Open the proposal card when someone asks this player, and the wedding scene when theirs is
   * waiting (note 12, two-player steps). Both close at once on a stale answer. Untested in a browser.
   */
  private checkMarriageCards(me: string): void {
    if (this.leaving || this.scene.isPaused()) return;
    // A guest's answer comes back a moment later: do not ask again until it has.
    if (performance.now() < this.cardQuiet) return;
    const b = this.state.playerMarriage;
    const kind = proposalFor(b, me)
      ? "proposal"
      : weddingWaiting(b, me)
        ? "wedding"
        : "";
    if (!kind) return;
    this.events.once("resume", () => {
      this.cardQuiet = performance.now() + 2500;
    });
    this.open(kind);
  }

  /** Say once that a write was refused, so the player can export the game. */
  private noteSaveFailure(): void {
    if (takeSaveNotice())
      this.message = "Could not save. Export from Options to keep your game.";
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
    for (const h of festivalHolds(
      this.state.day.clock.day,
      hallRestored(this.state.hall),
    ))
      this.holds.add(h);
    for (const h of festivalGateHolds(this.state.day.clock.day))
      this.holds.add(h);
    for (const h of marketHolds(this.state.day.clock.day)) this.holds.add(h);
    for (const c of this.conditional)
      c.drawn.setVisible(layerShows(c.layer, this.holds));
  }

  /** True once this player is in bed in a session, until they get up or the night passes. */
  private inBed = false;
  private bedLine = "";

  /** The "who is left" notice, shown when it changes (a guest's from `beds`, the host's polled). */
  private showBeds(s: BedStatus): void {
    const line = bedNotice(s, this.inBed);
    if (line === this.bedLine) return;
    this.bedLine = line;
    this.message = line;
    this.render();
  }

  /** In a session, Action gets the player out of bed again (the `wake` intent). */
  private getOutOfBed(): boolean {
    if (!this.inBed || !this.net) return false;
    this.inBed = false;
    sendWorldIntent(this.net, { kind: "wake" });
    this.bedLine = "";
    this.message = "You get out of bed.";
    this.render();
    return true;
  }

  /** In a session the player gets in bed and the room ends the day once everyone is (note 53). */
  private getInBed(net: NetSession): void {
    if (this.inBed) return;
    this.inBed = true;
    this.bedLine = "";
    sendWorldIntent(net, { kind: "sleep" });
    this.message = "You are in bed. The day ends when everyone is.";
    this.render();
  }

  /** Energy at the last check, for the tired warnings. */
  private lastEnergy = Infinity;

  endDay(): void {
    if (this.net instanceof GuestSession) return this.getInBed(this.net);
    detonateAll(this, true);
    if (this.net instanceof HostSession) return this.getInBed(this.net);
    const g = this.state;
    const farmMap = farmMapOf(g);
    this.finishNight(
      sleep(
        g,
        farmMap.forageSpots,
        Math.random,
        farmMap,
        isHouseMap(this.mapId),
      ),
    );
  }

  /** The morning after: redraw, save, and open the report (the steps after sleep()). */
  private finishNight(report: SleepReport): void {
    audio.sfx("day.end");
    const g = this.state;
    this.refreshHolds();
    this.message = "";
    nightSave(g);
    this.noteSaveFailure();
    this.render();
    // The shipping summary comes first when the bin paid; it opens the report.
    const shipping = report.shipped.lines.length > 0;
    // The spouse's question comes first (note 12, slice 5); it hands on to the report.
    if (report.childAsk) this.open("childask", { report, shipping });
    else this.open(shipping ? "shipping" : "report", { report });
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
    this.labelTags = [];
    this.labelView = "";
    // One tag per object (a two tile stall or desk has two service tiles), and
    // tags that would overlap are stacked upward so each stays readable.
    const merged = mergeTags(
      tags.map((t) => ({ x: t.x * ts, y: t.y * ts - 2, text: t.text })),
      ts * 2,
    );
    const offsets = stackOffsets(merged);
    return merged.map((t, i) => {
      const label = this.add
        .text(t.x, t.y + offsets[i]!, t.text, {
          fontSize: "8px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setDepth(900);
      this.labelTags.push({ o: label, x: t.x, y: label.y });
      return label;
    });
  }

  /**
   * Keep each placeholder map label on screen and clear of the top right HUD
   * (clock panel, Menu, Journal, Craft, Hats, DBG), which the UI camera draws
   * over the world. The label stays centred on its door or stall unless that
   * would clip, then it slides sideways. A frame behind a fast scroll is fine
   * for a placeholder label.
   */
  private clampLabels(): void {
    if (this.labelTags.length === 0) return;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom || 1;
    const scale = this.uiCamera.zoom || 1;
    // Labels are static, so only a moved or resized view can change their clamp.
    const viewKey = `${view.x},${view.y},${view.right},${cam.x},${zoom},${scale},${this.scale.gameSize.width}`;
    if (viewKey === this.labelView) return;
    this.labelView = viewKey;
    const screenW = this.scale.gameSize.width;
    const colX = screenW - (960 - PANEL_LEFT_BASE) * scale;
    const colBottom = (PANEL_BOTTOM + 140) * scale;
    const stripX = screenW - 400 * scale;
    const stripBottom = 64 * scale;
    for (const t of this.labelTags) {
      const half = t.o.displayWidth / 2;
      const top = (t.o.y - t.o.displayHeight - view.y) * zoom;
      // The edge, in world pixels, that the label's right side may reach.
      let limit = view.right - 1;
      if (top < colBottom)
        limit = Math.min(limit, view.x + (colX - cam.x) / zoom);
      if (top < stripBottom)
        limit = Math.min(limit, view.x + (stripX - cam.x) / zoom);
      const lo = view.x + half + 1;
      t.o.x = Math.max(lo, Math.min(t.x, limit - half));
    }
    // Clamping can pull two labels onto the same spot (Cart and Hearthwell at the
    // right edge): stack any that now overlap, upward, so both stay readable.
    const placed: Phaser.GameObjects.Text[] = [];
    for (const t of this.labelTags) {
      t.o.y = t.y;
      for (let n = 0; n < placed.length; n++) {
        const hit = placed.find(
          (p) =>
            Math.abs(p.x - t.o.x) < (p.displayWidth + t.o.displayWidth) / 2 &&
            Math.abs(p.y - t.o.y) < t.o.displayHeight,
        );
        if (!hit) break;
        t.o.y = hit.y - t.o.displayHeight - 1;
      }
      placed.push(t.o);
    }
  }

  /**
   * The spouse's placeholder props in the 4 by 4 block at the back right corner
   * of the spouse room (note 85): one coloured block and a name tag per prop,
   * from `spouse.json`. They do not block movement. Art comes with the art pass.
   */
  private drawSpouseProps(
    holds: ReadonlySet<string>,
  ): Phaser.GameObjects.GameObject[] {
    const who = spouseId(this.state);
    if (!who || !isHouseMap(this.mapId)) return [];
    const mark = maps
      .marksWith(this.mapId, holds, this.tier)
      .marks.find((m) => m.name === PROPS_MARK);
    if (!mark) return [];
    const ts = this.map.tileSize;
    const out: Phaser.GameObjects.GameObject[] = [];
    for (const p of propsOf(who)) {
      const x = (mark.x + p.dx) * ts;
      const y = (mark.y + p.dy) * ts;
      out.push(
        this.add
          .rectangle(x, y, p.w * ts, p.h * ts, 0x9a7b5a, 0.85)
          .setOrigin(0)
          .setStrokeStyle(1, 0x3b2a1a, 0.9)
          .setDepth(DEPTH.decal + 1),
        this.add
          .text(x + (p.w * ts) / 2, y + (p.h * ts) / 2, p.name, {
            fontSize: "6px",
            color: "#ffffff",
            wordWrap: { width: p.w * ts },
            align: "center",
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.decal + 2),
      );
    }
    return out;
  }

  /** Tint each built room's floor and walls with its wallpaper and flooring (note 10). */
  drawDecor(): void {
    const json = mapFiles[this.mapId];
    if (!json) return;
    const ts = this.map.tileSize;
    const holds = zoneHolds(this.state);
    for (const room of DECOR_ROOMS) {
      const cover = this.state.decor.get(room.id);
      const floor = decorById(cover.floor);
      const wall = decorById(cover.wallpaper);
      if (!floor && !wall) continue;
      const tiles = roomTiles(json, this.tier, room, holds);
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
    const dusk = this.outdoorSoil
      ? darkness(
          dateOf(this.state.day.clock.day).season,
          this.state.day.clock.minutes,
        )
      : 0;
    const dark = this.floor !== undefined ? 1 : dusk;
    const ts = this.map.tileSize;
    const at = { x: this.pos.x / ts, y: (this.pos.y - ts / 2) / ts };
    const lights = dark > 0 ? lightLayer(this.state, this.mapId, at) : [];
    // Redrawing the circles is the cost, so skip it while nothing about them changed.
    const same =
      this.glowDark === dark &&
      this.glowLights.length === lights.length &&
      lights.every((l, i) => {
        const o = this.glowLights[i]!;
        return (
          o.x === l.x &&
          o.y === l.y &&
          o.radius === l.radius &&
          o.worn === l.worn
        );
      });
    if (same) return;
    this.glowDark = dark;
    this.glowLights = lights;
    this.glow.clear();
    if (dark <= 0) return;
    this.paintGlow(lights, dark, ts);
  }

  private paintGlow(lights: Glow[], dark: number, ts: number): void {
    for (const l of lights) {
      const cx = (l.worn ? l.x : l.x + 0.5) * ts;
      const cy = (l.worn ? l.y : l.y + 0.5) * ts;
      for (let i = 4; i >= 1; i--) {
        this.glow.fillStyle(0xffd27a, 0.06 * dark);
        this.glow.fillCircle(cx, cy, (l.radius * ts * i) / 4);
      }
    }
  }

  render(): void {
    drawGround(this);
    // drawRooms clears the wash layer, so everything else draws after it.
    drawRooms(this);
    drawCoop(this);
    drawGreenhouse(this);
    drawCoopInside(this);
    drawFurnace(this);
    drawMailbox(this);
    drawShrine(this);
    drawRequestMark(this);
    drawBuild(this);
    this.hud.update(
      this.state,
      this.selected,
      this.message,
      showHealth(this),
      this.ice ? iceCounter(this.ice) : "",
    );
  }
}
