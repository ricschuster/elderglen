import {
  BARN_FOOTPRINT,
  BARN_MAP,
  BARN_MAX_TIER,
  siloSite,
  SILO_FOOTPRINT,
  STABLE_FOOTPRINT,
  siteOf,
  barnSite,
  animalSlots,
  COOP_MAX_TIER,
  COOP_FOOTPRINT,
  INCUBATOR_TIER,
  COOP_MAP,
  GROW_DAYS,
  coopSite,
} from "../core/animals";
import { FISH_POND, POND_FISH_SPOTS, pondLook } from "../core/pond";
import { fertilizerById } from "../core/fertilizer";
import Phaser from "phaser";
import { animalKey } from "./art-animals";
import { areaOf } from "../core/areas";
import { stageOf as fruitStageOf } from "../core/fruittrees";
import { teaStageOf } from "../core/teabush";
import { potLook, potsOf } from "../core/gardenpot";
import { festivalDayToday, isFestivalMap } from "../core/festivals";
import { cropById } from "../core/crops";
import { DEPTH, tileDepth } from "./depth";
import { FARM_STORE } from "../core/mapstore";
import { isFarmMap } from "../core/farmtypes";
import { LOCAL_PLAYER } from "../core/players";
import {
  cabinDoorTile,
  cabinMailboxTile,
  cabinRect,
  type CabinStyle,
} from "../core/cabins";
import { tapReady } from "../core/tapper";
import { absoluteMinutes } from "../core/furnace";
import { jobDone } from "../core/machines";
import { CASK, caskDone } from "../core/cask";
import { CHEST_COLOURS } from "../core/chestdefs";
import { lightMapKey } from "../core/lights";
import { LIGHTNING_ROD } from "../core/lightning";
import { decorTiles, isFarmDecor } from "../core/farmdecor";
import { CAVE_MAP, caveDehydratorDone } from "../core/cave";
import {
  GREENHOUSE_FOOTPRINT,
  greenhouseRepaired,
  greenhouseSite,
} from "../core/greenhouse";
import { HOUSE_MAP, isHouseMap } from "../core/house";
import {
  cropKey,
  fertKey,
  fruitOnTreeKey,
  fruitTreeKey,
  sprinklerKey,
  furnitureKey,
  chestKey,
  chestOpenKey,
  farmDecorKey,
  lightKey,
  GARDEN_POT_KEY,
  POND_KEY,
  POND_PIT_KEY,
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
  GRASS_KEY,
  WEED_KEY,
} from "./art";
import {
  drawFeastLantern,
  drawFeastProps,
  drawFestivalProps,
} from "./farm-festival";
import { LEVER_KIND } from "../core/danger";
import { afterLastSeat } from "../core/yeartwo";
import type { FarmScene } from "./FarmScene";

// Drawing methods of the farm scene, moved out of FarmScene.ts (note 106, step 5).
// Each takes the scene as its first argument.

/** Draw plots, crops and forage on the tiles. */
export function drawGround(farm: FarmScene): void {
  farm.ground.clear();
  for (const image of farm.sprites) image.destroy();
  farm.sprites = [];
  const ts = farm.map.tileSize;
  // A picture stands on its tile: a taller or wider one rises and spreads from the
  // tile's bottom centre, and sorts with the figures by that row (note 99).
  const put = (x: number, y: number, key: string) => {
    const image = farm.add
      .image((x + 0.5) * ts, (y + 1) * ts, key)
      .setOrigin(0.5, 1)
      .setDepth(tileDepth(y, ts));
    farm.uiCamera.ignore(image); // the UI camera does not draw the world
    farm.sprites.push(image);
    return image;
  };
  for (const r of farm.rocks()?.each() ?? []) put(r.x, r.y, ROCK_KEYS[r.kind]);
  if (farm.floor !== undefined) {
    const up = farm.map.exits.find((e) => e.id === "up");
    if (up) put(up.x, up.y, LADDER_KEY).setAlpha(0.6).setDepth(DEPTH.decal);
    const down = farm.floorState?.ladder;
    if (down) put(down.x, down.y, LADDER_KEY).setDepth(DEPTH.decal);
  }
  if (isHouseMap(farm.mapId)) farm.drawDecor();
  for (const p of farm.state.furniture.each(farm.mapId))
    put(p.x, p.y, furnitureKey(p.id));
  // The lever of dangerous mode: a ladder-like post, red while the mode is on (placeholder art).
  for (const s of farm.map.services)
    if (s.kind === LEVER_KIND)
      put(s.x, s.y, LADDER_KEY).setTint(
        farm.state.mines.dangerous ? 0xff5a4a : 0x9aa0a8,
      );
  for (const s of farm.map.services)
    if (s.kind === "camp-chest")
      put(
        s.x,
        s.y,
        farm.campScreenOpen ? chestOpenKey("big-chest") : chestKey("big-chest"),
      );
  for (const c of farm.state.chests.each(farm.mapId)) {
    const img = put(c.x, c.y, chestKey(c.id));
    if (c.colour) img.setTint(CHEST_COLOURS[c.colour - 1]!);
  }
  for (const l of farm.state.placed.each(lightMapKey(farm.mapId))) {
    if (isFarmDecor(l.id))
      for (const t of decorTiles(l.id, l.x, l.y))
        put(t.x, t.y, farmDecorKey(l.id));
    else put(l.x, l.y, lightKey(l.id));
  }
  if (isFarmMap(farm.mapId))
    for (const p of farm.state.placed.each(lightMapKey(farm.mapId)))
      if (p.id === LIGHTNING_ROD && p.state?.pack === true)
        put(p.x, p.y, MACHINE_READY_KEY);
  for (const p of farm.state.pots.each(farm.mapId)) {
    put(p.x, p.y, POT_KEY);
    if (p.catch) put(p.x, p.y, POT_READY_KEY);
  }
  for (const c of farm.state.casks.each(farm.mapId)) {
    put(c.x, c.y, machineKey(CASK));
    if (caskDone(farm.state, c)) put(c.x, c.y, MACHINE_READY_KEY);
  }
  if (farm.mapId === CAVE_MAP) drawCave(farm, put);
  drawFeastProps(farm);
  drawFeastLantern(farm);
  if (isFestivalMap(farm.mapId)) drawFestivalProps(farm);
  if (farm.map.hasSoil) drawSoil(farm, put);
  drawWorld(farm, put);
  drawPonds(farm, put);
}

/** Fish ponds (note 93): the pit while dug, then the water with its fish swimming in it. Placeholder art. */
export function drawPonds(
  farm: FarmScene,
  put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
): void {
  if (!isFarmMap(farm.mapId)) return;
  const ts = farm.map.tileSize;
  for (const p of farm.state.placed.each(FARM_STORE)) {
    if (p.id !== FISH_POND) continue;
    const look = pondLook(p);
    const body = put(p.x + 2, p.y + 4, look.building ? POND_PIT_KEY : POND_KEY);
    body.setDepth(DEPTH.decal);
    if (look.sea) body.setTint(0x9fb8ff);
    const icon = look.species && iconKey(look.species);
    if (icon)
      for (const [fx, fy] of POND_FISH_SPOTS.slice(0, look.fish)) {
        const fish = farm.add
          .image(p.x * ts + fx, p.y * ts + fy, icon)
          .setScale(0.6)
          .setDepth(DEPTH.decal + 1);
        farm.uiCamera.ignore(fish);
        farm.sprites.push(fish);
      }
    if (look.ready) put(p.x + 4, p.y + 1, MACHINE_READY_KEY);
  }
}

/** The dug soil, crops, fertilizer, sprinklers and fruit trees of the map. */
export function drawSoil(
  farm: FarmScene,
  put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
): void {
  const soil = farm.map.indoors ? farm.state.greenhouse : farm.state.farm;
  for (const { x, y, plot } of soil.each()) {
    put(x, y, soilKey(plot.wateredToday)).setDepth(DEPTH.decal);
    const fert = fertilizerById(plot.fertilizer);
    if (fert) put(x, y, fertKey(fert.line)).setDepth(DEPTH.decal);
    const crop = plot.crop;
    const def = crop && cropById(crop.id);
    if (!crop || !def) continue;
    const stage = stageOf(crop.daysGrown / def.growDays, soil.isRipe(x, y));
    put(x, y, cropKey(crop.id, stage));
  }
  // Each map shows its own sprinklers and fruit trees.
  const here = farm.store;
  for (const s of here.sprinklers.each()) put(s.x, s.y, sprinklerKey(s.id));
  for (const t of here.fruitTrees.each()) {
    put(t.x, t.y, fruitTreeKey(fruitStageOf(t.age)));
    if (t.fruit > 0) put(t.x, t.y, fruitOnTreeKey(t.id));
  }
  // Placeholder art: the fruit tree sprites, tinted green (note 97).
  for (const b of here.teaBushes.each())
    put(b.x, b.y, fruitTreeKey(teaStageOf(b.age) * 2)).setTint(0x7fd66a);
  drawGardenPots(farm, put);
}

/** Garden pots (note 97): the pot, and the crop or tea bush growing in it. */
export function drawGardenPots(
  farm: FarmScene,
  put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
): void {
  for (const p of potsOf(farm.state, farm.map)) {
    put(p.x, p.y, GARDEN_POT_KEY);
    const look = potLook(p);
    if (look?.kind === "tea")
      put(p.x, p.y, fruitTreeKey(teaStageOf(look.age) * 2)).setTint(0x7fd66a);
    else if (look?.kind === "crop") {
      const def = cropById(look.id);
      if (def)
        put(
          p.x,
          p.y,
          cropKey(look.id, stageOf(look.daysGrown / def.growDays, look.ripe)),
        );
    }
  }
}

/** What stands and lies outdoors: forage, weeds, twigs, machines, trees and goods on the ground. */
export function drawWorld(
  farm: FarmScene,
  put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
): void {
  // Goods left on a mine floor lie in that floor's own ground.
  if (farm.floorState)
    for (const p of farm.floorState.ground.each()) {
      const key = iconKey(p.id);
      if (key) put(p.x, p.y, key);
    }
  if (!farm.outdoorWorld) return;
  for (const { x, y, id } of farm.state.forage.each()) put(x, y, forageKey(id));
  for (const s of farm.state.spots.each())
    put(s.x, s.y, SPOT_KEY).setDepth(DEPTH.decal);
  if (farm.outdoorSoil && areaOf(farm.state) === undefined)
    for (const t of farm.state.grass.each())
      put(t.x, t.y, GRASS_KEY).setDepth(DEPTH.decal);
  for (const w of farm.state.weeds.each())
    put(w.x, w.y, WEED_KEY).setDepth(DEPTH.decal);
  for (const t of farm.state.twigs.each())
    put(t.x, t.y, TWIG_KEY).setDepth(DEPTH.decal);
  for (const m of farm.state.machines.each()) {
    put(m.x, m.y, machineKey(m.id));
    if (jobDone(farm.state, m)) put(m.x, m.y, MACHINE_READY_KEY);
  }
  for (const t of farm.state.trees.each()) {
    put(t.x, t.y, treeKey(t.stage, t.stump, t.large, t.regrow !== undefined));
    if (t.tap)
      put(t.x, t.y, t.tap.heavy ? "tapper-on-tree-heavy" : "tapper-on-tree");
    if (tapReady(farm.state, t)) put(t.x, t.y, MACHINE_READY_KEY);
  }
  for (const p of farm.state.ground.each()) {
    const key = iconKey(p.id);
    if (key) put(p.x, p.y, key);
  }
  drawBunting(farm);
}

/** The cave: bat fruit on the floor, or mushroom boxes and the free dehydrator. */
export function drawCave(
  farm: FarmScene,
  put: (x: number, y: number, key: string) => Phaser.GameObjects.Image,
): void {
  const cave = farm.state.cave;
  const ts = farm.map.tileSize;
  for (const f of cave.eachFruit()) {
    const key = iconKey(f.id);
    if (key) put(f.x, f.y, key);
  }
  if (cave.choice !== "mushrooms") return;
  for (const s of farm.map.services) {
    if (s.kind === "mushroom-box") {
      const box = cave.boxes[Number(s.id.split("-")[1]) - 1];
      farm.ground
        .fillStyle(0x6b4a2a, 1)
        .fillRect(s.x * ts + 1, s.y * ts + 3, ts - 2, ts - 5);
      farm.ground
        .fillStyle(box?.ready ? 0xe8d8b0 : 0x3a2a1a, 1)
        .fillRect(s.x * ts + 4, s.y * ts + 5, ts - 8, ts - 9);
    } else if (s.kind === "cave-dehydrator") {
      put(s.x, s.y, machineKey("dehydrator"));
      if (caveDehydratorDone(farm.state)) put(s.x, s.y, MACHINE_READY_KEY);
    }
  }
}

/** On a festival day, hang flags over the green so the village looks changed. */
export function drawBunting(farm: FarmScene): void {
  if (!festivalDayToday(farm.state.day.clock.day)) return;
  const green = farm.map.services.find((s) => s.kind === "festival");
  if (!green) return;
  const ts = farm.map.tileSize;
  const colors = [0xd8503c, 0xf2d16b, 0x4a9fd8, 0x7ac05a];
  const g = farm.ground;
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
export function drawRooms(farm: FarmScene): void {
  const { regions, tileSize: ts } = farm.map;
  farm.wash.clear();
  const hall = farm.state.hall;
  for (const r of regions) {
    // A region that names a forage table is a patch of ground, not a hall room.
    if (r.forage !== undefined) continue;
    if (r.id === "plaque") {
      hall.rooms.forEach((room, i) => {
        const lit = hall.roomComplete(room.id);
        farm.wash
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
    farm.wash
      .fillStyle(colour, alpha)
      .fillRect(r.x * ts, r.y * ts, r.w * ts, r.h * ts);
  }
}

/**
 * While the carpenter builds the next house tier, scaffold stands on the
 * outside wall, inside the house's footprint (docs/design/41_house.md), with
 * the carpenter at work in front. Placeholder shapes until the art pass (#58).
 */
export function drawBuild(farm: FarmScene): void {
  const house = farm.map.exits.find((e) => e.map === HOUSE_MAP);
  if (!farm.state.houseBuild || !house) return;
  const ts = farm.map.tileSize;
  // The house block is 6 by 4 tiles, with its door on the bottom row.
  const left = (house.x - 2) * ts;
  const top = (house.y - 3) * ts;
  const g = farm.wash;
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
export function drawFurnace(farm: FarmScene): void {
  const f = farm.state.furnace;
  const spot = farm.map.services.find((s) => s.kind === "furnace");
  if (!f.gifted || !spot) return;
  const ts = farm.map.tileSize;
  const x = spot.x * ts;
  const y = spot.y * ts;
  const busy = f.job !== undefined;
  const done = busy && absoluteMinutes(farm.state) >= f.job!.doneAt;
  const g = farm.wash;
  g.fillStyle(0x3a3a42, 1).fillRect(x + 1, y + 2, ts - 2, ts - 2);
  g.fillStyle(0x23232a, 1).fillRect(x + 1, y + 2, ts - 2, 3);
  g.fillStyle(done ? 0x8fd18a : busy ? 0xf08a30 : 0x15151a, 1).fillRect(
    x + 4,
    y + 8,
    ts - 8,
    5,
  );
}

/** The ancestors' shrine: a standing stone and four candle stands, placeholder shapes (note 83). */
export function drawShrine(farm: FarmScene): void {
  const stone = farm.map.services.find((s) => s.id === "shrine-stone");
  if (!stone) return;
  const ts = farm.map.tileSize;
  const lit = farm.state.shrine.candles;
  const g = farm.wash;
  g.fillStyle(0x1f3d24, 0.35).fillEllipse(
    stone.x * ts + ts / 2,
    stone.y * ts + ts / 2,
    7 * ts,
    5 * ts,
  );
  g.fillStyle(farm.state.shrine.statueOpen ? 0xb9c8d8 : 0x8a8a92, 1)
    .fillRect(stone.x * ts + 3, stone.y * ts - 4, ts - 6, ts + 2)
    .fillStyle(0x55555c, 1)
    .fillRect(stone.x * ts + 3, stone.y * ts - 4, ts - 6, 2);
  const stands = farm.map.services.filter((s) =>
    s.id.startsWith("shrine-stand-"),
  );
  stands.forEach((s, i) => {
    const x = s.x * ts;
    const y = s.y * ts;
    g.fillStyle(0x6b4a2e, 1).fillRect(x + 6, y + 6, 4, ts - 6);
    g.fillStyle(0xf0e6c8, 1).fillRect(x + 5, y + 1, 6, 6);
    if (i < lit) g.fillStyle(0xffc860, 1).fillRect(x + 6, y - 4, 4, 5);
  });
}

/** The farm mailbox: a post and box, with the flag up while mail waits (note 51). */
export function drawMailbox(farm: FarmScene): void {
  const spot = farm.map.services.find((s) => s.kind === "mailbox");
  if (!spot) return;
  const ts = farm.map.tileSize;
  const x = spot.x * ts;
  const y = spot.y * ts;
  const g = farm.wash;
  g.fillStyle(0x6f4a22, 1).fillRect(x + 7, y + 8, 2, ts - 8);
  g.fillStyle(0x3f6f9a, 1).fillRect(x + 3, y + 3, 10, 6);
  g.fillStyle(0x2a4a6a, 1).fillRect(x + 3, y + 3, 10, 1);
  // The farm's own mailbox is the host's, whoever is looking.
  if (farm.state.players.get(LOCAL_PLAYER).mail.flagUp)
    g.fillStyle(0xd8483a, 1)
      .fillRect(x + 12, y - 1, 2, 6)
      .fillRect(x + 12, y - 1, 4, 2);
  else g.fillStyle(0xd8483a, 1).fillRect(x + 12, y + 5, 3, 2);
}

/** Placeholder colours of the three cabin looks: wall and roof (note 110 rule 2; the art pass names them). */
const CABIN_COLOURS: Record<CabinStyle, { wall: number; roof: number }> = {
  log: { wall: 0x8a5a2b, roof: 0x5a3a1c },
  stone: { wall: 0x9a9aa2, roof: 0x5f6068 },
  plank: { wall: 0xc9a869, roof: 0x8a6a3a },
};

/**
 * Guests' cabins on the farm: a coloured footprint with a door, and a mailbox post beside it with its flag up
 * while that guest has mail waiting (note 110). Placeholder shapes until the art pass.
 */
export function drawCabins(farm: FarmScene): void {
  if (!isFarmMap(farm.mapId)) return;
  const ts = farm.map.tileSize;
  const g = farm.wash;
  for (const c of farm.state.cabins?.cabins ?? []) {
    const col = CABIN_COLOURS[c.style];
    const r = cabinRect(c);
    g.fillStyle(col.wall, 1).fillRect(r.x * ts, r.y * ts, r.w * ts, r.h * ts);
    g.fillStyle(col.roof, 1).fillRect(r.x * ts, r.y * ts, r.w * ts, ts);
    const d = cabinDoorTile(c);
    g.fillStyle(0x3a2412, 1).fillRect(
      d.x * ts + 3,
      d.y * ts + 2,
      ts - 6,
      ts - 2,
    );
    const m = cabinMailboxTile(c);
    const x = m.x * ts;
    const y = m.y * ts;
    g.fillStyle(0x6f4a22, 1).fillRect(x + 7, y + 8, 2, ts - 8);
    g.fillStyle(0x3f6f9a, 1).fillRect(x + 3, y + 3, 10, 6);
    const mail =
      c.ownerKey !== null && farm.state.players.has(c.ownerKey)
        ? farm.state.players.get(c.ownerKey).mail.flagUp
        : false;
    g.fillStyle(0xd8483a, 1);
    if (mail) g.fillRect(x + 12, y - 1, 2, 6).fillRect(x + 12, y - 1, 4, 2);
    else g.fillRect(x + 12, y + 5, 3, 2);
  }
}

/** A yellow mark over the request board while a request waits to be taken (note 50). */
export function drawRequestMark(farm: FarmScene): void {
  const spot = farm.map.services.find((s) => s.kind === "requests");
  if (
    !spot ||
    farm.state.quests.posted(
      farm.state.day.clock.day,
      afterLastSeat(farm.state),
    ).length === 0
  )
    return;
  const ts = farm.map.tileSize;
  const x = spot.x * ts;
  const y = spot.y * ts - 12;
  farm.wash
    .fillStyle(0xf2c94c, 1)
    .fillRect(x + 7, y, 3, 7)
    .fillRect(x + 7, y + 9, 3, 3);
}

/** A coop or barn on the farm: a plain block, scaffolding while it is built (note 23). */
export function drawFarmBuilding(
  farm: FarmScene,
  site: { x: number; y: number } | undefined,
  size: { w: number; h: number },
  doorX: number,
  built: boolean,
  building: boolean,
  roof: number,
): void {
  if (!site || (!built && !building)) return;
  const ts = farm.map.tileSize;
  const x = site.x * ts;
  const y = site.y * ts;
  const g = farm.wash;
  if (!built) {
    g.lineStyle(3, 0x8a6a45, 1);
    for (let dx = 0; dx <= size.w; dx += 2)
      g.lineBetween(x + dx * ts, y, x + dx * ts, y + size.h * ts);
    return;
  }
  g.fillStyle(roof, 1).fillRect(x, y, size.w * ts, ts);
  g.fillStyle(0xc9a26b, 1).fillRect(x, y + ts, size.w * ts, (size.h - 1) * ts);
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
export function drawGreenhouse(farm: FarmScene): void {
  if (!isFarmMap(farm.mapId)) return;
  const ts = farm.map.tileSize;
  const at = greenhouseSite(farm.state);
  const { w, h, doorX } = GREENHOUSE_FOOTPRINT;
  const [x, y] = [at.x * ts, at.y * ts];
  const g = farm.wash;
  if (greenhouseRepaired(farm.state)) {
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

export function drawCoop(farm: FarmScene): void {
  const a = farm.state.animals;
  drawFarmBuilding(
    farm,
    coopSite(farm.state, farm.mapId),
    COOP_FOOTPRINT,
    1,
    a.coopBuilt,
    a.build?.building === "coop" && !a.coopBuilt,
    0xb5563c,
  );
  drawFarmBuilding(
    farm,
    barnSite(farm.state, farm.mapId),
    BARN_FOOTPRINT,
    3,
    a.barnBuilt,
    a.build?.building === "barn" && !a.barnBuilt,
    0x8f3b2e,
  );
  drawSilo(farm);
  drawStable(farm);
}

/** The stable and the horse beside it, or where it was left. Placeholder blocks. */
export function drawStable(farm: FarmScene): void {
  const a = farm.state.animals;
  drawFarmBuilding(
    farm,
    siteOf(farm.state, "stable", farm.mapId),
    STABLE_FOOTPRINT,
    -1,
    a.stableBuilt,
    a.build?.building === "stable" && !a.stableBuilt,
    0x7a5a3a,
  );
  const spot = farm.horseSpot();
  if (!spot) return;
  const ts = farm.map.tileSize;
  farm.wash
    .fillStyle(0x8a5a33, 1)
    .fillRect(spot.x * ts + 3, spot.y * ts + ts - 14, ts - 6, 14);
  farm.wash
    .fillStyle(0x5b3a1e, 1)
    .fillRect(spot.x * ts + ts - 8, spot.y * ts + ts - 18, 5, 6);
}

/** The silo: a round grey tower, scaffolding while it is built. */
export function drawSilo(farm: FarmScene): void {
  const site = siloSite(farm.mapId);
  const a = farm.state.animals;
  if (!site || (!a.silo && a.siloDays <= 0)) return;
  const ts = farm.map.tileSize;
  const x = site.x * ts;
  const y = site.y * ts;
  const g = farm.wash;
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

/** Inside the coop or barn: the feeding bench along the back wall and the animals as blocks. */
export function drawCoopInside(farm: FarmScene): void {
  for (const im of farm.animalImages) im.destroy();
  farm.animalImages = [];
  const coop = farm.mapId === COOP_MAP;
  if (!coop && farm.mapId !== BARN_MAP) return;
  const ts = farm.map.tileSize;
  const g = farm.wash;
  const a = farm.state.animals;
  if (coop) {
    g.fillStyle(0x8a6a45, 1).fillRect(3 * ts, 2 * ts + 4, 4 * ts, ts - 4);
    g.fillStyle(0xe0c068, 1).fillRect(2 * ts + 2, 2 * ts + 3, ts - 4, ts - 3);
    g.fillStyle(0x6fa8d0, 1).fillRect(7 * ts + 2, 2 * ts + 5, ts - 4, ts - 5);
    // The deluxe coop's auto-feeder: a metal chute on the back wall.
    if (a.tier >= COOP_MAX_TIER)
      g.fillStyle(0x9aa3ad, 1).fillRect(9 * ts + 2, 2 * ts + 3, ts - 4, ts - 3);
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
  for (const { animal: an, x, y } of animalSlots(
    farm.state,
    coop ? "coop" : "barn",
  )) {
    const grown = an.age >= GROW_DAYS;
    const image = farm.add
      .image(x * ts + ts / 2, y * ts + ts - 1, animalKey(an.species, grown))
      .setOrigin(0.5, 1);
    farm.uiCamera.ignore(image);
    farm.animalImages.push(image);
    if (an.product)
      g.fillStyle(0xffffff, 1).fillRect(x * ts + 6, y * ts + ts, 4, 3);
  }
}
