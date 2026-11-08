import { fertilizerById } from "../core/fertilizer";
import Phaser from "phaser";
import { sleep } from "../core/sleep";
import { stageOf as fruitStageOf } from "../core/fruittrees";
import type { GameState } from "../core/save";
import { cycle, heldAt, nextRow, toolbarSize } from "../core/toolbar";
import { pendingChoice } from "../core/professions";
import { eat, type Outcome } from "../core/actions";
import { dateOf } from "../core/calendar";
import { clockText, darkness } from "../core/clock";
import { festivalOpen, festivalToday } from "../core/festivals";
import { itemById } from "../core/items";
import { NOTHING_TO_ACT_ON, act, reasonText, useHeld } from "../core/tools";
import { cropById } from "../core/crops";
import { mapFiles, maps } from "../content/maps";
import { START } from "../core/maps";
import { farmMapOf, isFarmMap, resolveMapId } from "../core/farmtypes";
import { exitOpen, FarmMap, type Exit } from "../core/map";
import { exitLabel, serviceLabel } from "../core/labels";
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
import { browserStore, loadDeviceSettings } from "./storage";
import { saveGame } from "../core/save";
import { absoluteMinutes } from "../core/furnace";
import { jobDone, statusText } from "../core/machines";
import { chestById, pickUpChest, placeChest } from "../core/chests";
import { greencoatDue, takeCampGift } from "../core/camp";
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
import {
  carryFurniture,
  furnitureById,
  pickUpFurniture,
  placeFurniture,
} from "../core/furniture";
import { hatById } from "../core/hats";
import { HOUSE_MAP, houseMapId, isHouseMap } from "../core/house";
import { SELECTED_KEY, STATE_KEY } from "./state";
import {
  cropKey,
  fertKey,
  fruitOnTreeKey,
  fruitTreeKey,
  sprinklerKey,
  furnitureKey,
  chestKey,
  machineKey,
  MACHINE_READY_KEY,
  forageKey,
  iconKey,
  LADDER_KEY,
  ROCK_KEYS,
  soilKey,
  stageOf,
  treeKey,
  WEED_KEY,
} from "./art";
import { giveItem, giveMoney } from "../core/debug";
import { pickupRadius } from "../core/ground";
import { Hud, HUD_FIT_W } from "./hud";
import { UI_SIZE_KEY, WORLD_ZOOM_KEY } from "./panel";
import { cameraBounds, cornerScroll, hudScale, worldZoom } from "../core/view";
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
  /** Conditions that currently hold, for gated exits: "mines-open" from spring 5. */
  private holds = new Set<string>();
  private message = "";
  private hud!: Hud;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private sprites!: Phaser.GameObjects.Container;
  private ground!: Phaser.GameObjects.Graphics;
  private wash!: Phaser.GameObjects.Graphics;
  /** Dusk over the farm: fades in toward nightfall, which moves by season. */
  private night!: Phaser.GameObjects.Rectangle;
  private map!: FarmMap;
  private controls!: Controls;
  private player!: Phaser.GameObjects.Image;
  private target!: Phaser.GameObjects.Rectangle;
  /** Placeholder hat drawn on the player. */
  private hat!: Phaser.GameObjects.Rectangle;
  private pos: Vec = { x: 0, y: 0 };
  private facing: Facing = "down";
  private heldMs = 0;
  /** Who aimed last: the cursor or the keys (note 46). Desktop only. */
  private mouseAim = false;
  /** True while the left button is held in the world, for the axe repeat. */
  private mouseHeld = false;
  /** Wheel movement not yet turned into a slot step, so a trackpad is not too fast. */
  private wheelDelta = 0;

  constructor() {
    super("farm");
  }

  init(data: Partial<SceneData>): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.mapId = resolveMapId(data.map ?? START.map, this.state.farmType);
    this.entryName = data.entry ?? START.entry;
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.selected =
      (this.registry.get(SELECTED_KEY) as number | undefined) ?? 0;
    this.leaving = false;
    this.ladderArmed = true;
    this.floor = mineFloorOf(this.mapId);
    this.floorState = undefined;
    this.holds = new Set(
      minesOpen(this.state.day.clock.day) ? ["mines-open"] : [],
    );
    if (this.state.cave.open) this.holds.add("cave-open");
    this.heldMs = 0;
    this.mouseAim = false;
    this.mouseHeld = false;
    this.wheelDelta = 0;
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
    this.map = mineLayout ? FarmMap.fromTiled(json) : maps.get(id);
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
    for (const layer of json.layers) {
      if (layer.type !== "tilelayer" || layer.visible === false) continue;
      const drawn = tilemap.createLayer(layer.name, tileset);
      if (drawn) world.push(drawn);
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
    this.player = this.add
      .image(this.pos.x, this.pos.y, PLAYER_KEY)
      .setOrigin(0.5, 0.875);
    this.hat = this.add.rectangle(0, 0, 10, 5, 0xffffff).setVisible(false);
    this.target = this.add
      .rectangle(0, 0, ts, ts)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.6);
    world.push(this.player, this.hat, this.target);
    this.night = this.add
      .rectangle(0, 0, this.map.width * ts, this.map.height * ts, 0x0a1030)
      .setOrigin(0)
      .setAlpha(0)
      .setDepth(1000);
    world.push(this.night);

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

    this.cameras.main.fadeIn(FADE_MS);
    // The villager at the door asks about the cave, once a morning.
    const today = this.state.day.clock.day;
    if (isFarmMap(this.mapId) && greencoatDue(this.state)) {
      this.time.delayedCall(400, () => this.open("greencoat"));
    } else if (isFarmMap(this.mapId) && this.state.cave.due(today)) {
      this.state.cave.shownDay = today;
      this.time.delayedCall(400, () => this.open("cave-choice"));
    }
    this.time.addEvent({
      delay: TICK_MS / DEV_SPEED,
      loop: true,
      callback: () => {
        this.state.day.act(0, TICK_MINUTES);
        this.afterAction();
      },
    });
    // Restarting the scene keeps its event listeners, so drop this one on
    // shutdown or each map change would add another and run it twice.
    const resumed = (
      _sys: unknown,
      data?: { sleep?: boolean; goto?: { map: string; entry: string } },
    ) => {
      if (data?.sleep) return this.endDay();
      if (data?.goto) return this.travel(data.goto.map, data.goto.entry);
      this.save();
      // A new day on a mine floor: the floor is gone, so wake at home.
      if (
        this.floor !== undefined &&
        !this.state.mines.today(this.floor, this.state.day.clock.day)
      )
        return this.travel("farm", "from_house");
      // A new house tier (the carpenter finished, or the debug menu) means a
      // new map: reload it at its door.
      if (
        isHouseMap(this.mapId) &&
        this.mapId !== houseMapId(this.state.houseTier)
      ) {
        const data: SceneData = {
          map: houseMapId(this.state.houseTier),
          entry: "door",
        };
        this.scene.restart(data);
        return;
      }
      this.message = "";
      this.render();
      // The debug menu can hand out XP that earns a profession choice.
      if (pendingChoice(this.state.skills)) this.open("profession");
    };
    this.events.on("resume", resumed);
    this.events.once("shutdown", () => this.events.off("resume", resumed));
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
    if (import.meta.env.DEV)
      (window as unknown as { farmDebug: () => unknown }).farmDebug = () => ({
        pos: this.pos,
        tile: tileOf(this.pos, PLAYER, ts),
        facing: this.facing,
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
      });
  }

  update(_time: number, delta: number): void {
    // Cap the step so a stalled frame cannot throw the player across the map.
    const dt = Math.min(delta, 50) / 1000;
    this.night.setAlpha(
      this.map.hasSoil
        ? NIGHT_ALPHA *
            darkness(
              dateOf(this.state.day.clock.day).season,
              this.state.day.clock.minutes,
            )
        : 0,
    );
    const v = this.controls.vector();
    this.facing = facingFrom(v, this.facing);
    if (v.x !== 0 || v.y !== 0) this.keyAim();
    const ts = this.map.tileSize;
    for (let i = 0; i < DEV_SPEED; i++)
      this.pos = move(
        this.pos,
        { x: v.x * SPEED * dt, y: v.y * SPEED * dt },
        PLAYER,
        ts,
        (x, y) =>
          this.map.isBlocked(x, y) ||
          (this.map.hasSoil &&
            (this.state.trees.blocks(x, y) ||
              !!this.state.fruitTrees.at(x, y))) ||
          !!this.rocks()?.at(x, y) ||
          this.furnaceAt(x, y) ||
          this.state.furniture.blocks(this.mapId, x, y) ||
          !!this.state.chests.at(this.mapId, x, y) ||
          this.map.serviceAt(x, y)?.kind === "camp-chest" ||
          (this.map.hasSoil &&
            (!!this.state.sprinklers.at(x, y) ||
              !!this.state.machines.at(x, y))),
      );
    this.player.setPosition(this.pos.x, this.pos.y);
    this.drawHat();
    this.repeatUse(delta * DEV_SPEED);
    this.pickUp();

    const front = this.aimTile();
    this.target.setPosition(front.x * ts, front.y * ts);
    // Red when the mouse points at a tile that can never be used (note 46).
    const blocked = this.mouseAim && this.map.isBlocked(front.x, front.y);
    this.target.setStrokeStyle(
      1,
      blocked ? 0xff4040 : 0xffffff,
      blocked ? 0.9 : 0.6,
    );

    const here = tileOf(this.pos, PLAYER, ts);
    const down = this.floorState?.ladder;
    if (down && here.x === down.x && here.y === down.y) {
      if (this.ladderArmed) return this.descend();
    } else this.ladderArmed = true;
    // Doors open on a click or Action, not on a walk through (see `useDoor`).
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
    return aimAt(tileOf(this.pos, PLAYER, ts), cursor, this.facing).tile;
  }

  /** Pull in goods lying on the ground near the player, as far as the bag has room. */
  private pickUp(): void {
    if (!this.map.hasSoil || this.state.ground.count === 0) return;
    const here = tileOf(this.pos, PLAYER, this.map.tileSize);
    if (this.state.ground.collect(this.state.inventory, here, pickupRadius()))
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
        this.state.trees.at(front.x, front.y) ||
        this.state.fruitTrees.at(front.x, front.y)
      );
    const pick =
      held.kind === "tool" &&
      held.tool === "pickaxe" &&
      !!this.rocks()?.at(front.x, front.y);
    if (
      !(axe || pick) ||
      !(this.controls.useHeld() || this.hud.useHeld || this.mouseHeld)
    ) {
      this.heldMs = 0;
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
  private useDoor(): boolean {
    if (this.leaving) return false;
    const exit = this.exitAtAim();
    if (!exit) return false;
    if (exitOpen(exit, this.holds)) this.leave(exit);
    else {
      this.message = "It is shut.";
      this.render();
    }
    return true;
  }

  private leave(exit: Exit): void {
    // The farm's house door leads to the map for the current house tier.
    this.travel(
      exit.map === HOUSE_MAP ? houseMapId(this.state.houseTier) : exit.map,
      exit.entry,
    );
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
    const zoom = worldZoom(zoomPercent, width, height);
    const b = cameraBounds(
      this.map.width * ts,
      this.map.height * ts,
      width / zoom,
      height / zoom,
    );
    this.cameras.main
      .setSize(width, height)
      .setBackgroundColor(0x000000)
      .setZoom(zoom)
      .setBounds(b.x, b.y, b.w, b.h);
    const scale = hudScale(
      uiPercent,
      this.controls.profile === "touch",
      width,
      HUD_FIT_W,
    );
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
    const data: SceneData = { map, entry };
    this.cameras.main.fadeOut(FADE_MS);
    this.cameras.main.once("camerafadeoutcomplete", () =>
      this.scene.restart(data),
    );
  }

  /** Take the ladder down. The last built floor has none. */
  private descend(): void {
    if (this.floor === undefined || this.floor >= BUILT_FLOORS) return;
    this.travel(mineMapId(this.floor + 1), "from_above");
  }

  /** The rocks on this map: the farm's, or this mine floor's. */
  private rocks(): Rocks | undefined {
    if (this.floorState) return this.floorState.rocks;
    return isFarmMap(this.mapId) ? this.state.rocks : undefined;
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
    const head = this.pos.y - this.player.displayHeight * 0.875;
    this.hat
      .setFillStyle(Phaser.Display.Color.HexStringToColor(def.color).color)
      .setPosition(this.pos.x, head + 1);
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
    const front = this.aimTile();
    if (this.map.serviceAt(front.x, front.y)) return;
    const held = heldAt(this.state, this.selected);
    // A chest is stood down from the backpack, and the hand takes an empty one up.
    if (held.kind === "item" && chestById(held.id))
      return this.report(
        placeChest(this.state, this.map, this.mapId, front.x, front.y, held.id),
      );
    if (
      held.kind === "tool" &&
      held.tool === "hand" &&
      this.state.chests.at(this.mapId, front.x, front.y)
    )
      return this.report(pickUpChest(this.state, this.mapId, front.x, front.y));
    if (isHouseMap(this.mapId)) {
      // In the house the held piece is stood down, and the hand takes one up.
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
        held.tool === "hand" &&
        this.state.furniture.at(this.mapId, front.x, front.y)
      )
        return this.report(
          pickUpFurniture(this.state, this.mapId, front.x, front.y),
        );
    }
    this.report(
      useHeld(this.state, this.map, held, front.x, front.y, this.floor),
    );
  }

  /**
   * The Action button on the faced tile (note 47): open a service, else shake,
   * pick or harvest, else eat the held food. A tile with nothing on it, and
   * nothing edible held, does nothing and says nothing.
   */
  private action(): void {
    if (this.leaving) return;
    if (this.useDoor()) return;
    const front = this.aimTile();
    const service = this.map.serviceAt(front.x, front.y);
    if (service?.kind === "festival") return this.openFestival();
    if (service?.kind === "camp-chest")
      return this.report(takeCampGift(this.state));
    if (service?.kind === "stairs")
      return this.travel(mineMapId(1), "from_above");
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

  /** The festival green: open only while today's festival is on. */
  private openFestival(): void {
    const f = festivalToday(this.state.day.clock.day);
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
    const result =
      held.kind === "item"
        ? eat(this.state, held.id)
        : { ok: false as const, reason: "not food" };
    this.message = result.ok
      ? `Ate ${itemById(held.kind === "item" ? held.id : "")?.name.toLowerCase()}.`
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
    saveGame(browserStore, this.state);
  }

  private endDay(): void {
    const g = this.state;
    const farmMap = farmMapOf(g);
    const report = sleep(g, farmMap.forageSpots, Math.random, farmMap);
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
    for (const p of this.state.furniture.each(this.mapId))
      put(p.x, p.y, furnitureKey(p.id));
    for (const s of this.map.services)
      if (s.kind === "camp-chest") put(s.x, s.y, chestKey("big-chest"));
    for (const c of this.state.chests.each(this.mapId))
      put(c.x, c.y, chestKey(c.id));
    if (this.mapId === CAVE_MAP) this.drawCave(put);
    if (!this.map.hasSoil) return;
    for (const { x, y, plot } of this.state.farm.each()) {
      put(x, y, soilKey(plot.wateredToday));
      const fert = fertilizerById(plot.fertilizer);
      if (fert) put(x, y, fertKey(fert.line));
      const crop = plot.crop;
      const def = crop && cropById(crop.id);
      if (!crop || !def) continue;
      const stage = stageOf(
        crop.daysGrown / def.growDays,
        this.state.farm.isRipe(x, y),
      );
      put(x, y, cropKey(crop.id, stage));
    }
    for (const { x, y, id } of this.state.forage.each())
      put(x, y, forageKey(id));
    for (const w of this.state.weeds.each()) put(w.x, w.y, WEED_KEY);
    for (const s of this.state.sprinklers.each())
      put(s.x, s.y, sprinklerKey(s.id));
    for (const m of this.state.machines.each()) {
      put(m.x, m.y, machineKey(m.id));
      if (jobDone(this.state, m)) put(m.x, m.y, MACHINE_READY_KEY);
    }
    for (const t of this.state.trees.each())
      put(t.x, t.y, treeKey(t.stage, t.stump, t.large, t.regrow !== undefined));
    for (const t of this.state.fruitTrees.each()) {
      put(t.x, t.y, fruitTreeKey(fruitStageOf(t.age)));
      if (t.fruit > 0) put(t.x, t.y, fruitOnTreeKey(t.id));
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
    if (!festivalToday(this.state.day.clock.day)) return;
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

  private render(): void {
    this.drawGround();
    this.drawRooms();
    this.drawFurnace();
    this.drawBuild();
    this.hud.update(this.state, this.selected, this.message);
  }
}
