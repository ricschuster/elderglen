import Phaser from "phaser";
import { mapFiles, maps } from "../content/maps";
import {
  BUILDINGS,
  SILO_FOOTPRINT,
  siteOf,
  SILO_SITES,
  type Building,
} from "../core/animals";
import { farmTypeById } from "../core/farmtypes";
import { layersAtTier } from "../core/map";
import {
  doorAt,
  footprintAt,
  moveBuilding,
  orderBuildingAt,
  placedFootprint,
  placementBlockers,
} from "../core/placement";
import type { GameState } from "../core/save";
import { STATE_KEY } from "./state";
import { TILES_KEY, TILESET_NAME } from "./placeholder-textures";

export interface PlacementData {
  building: Building;
  /** Order a new building on the spot, or move the one that stands. */
  mode: "order" | "move";
}

/** The map is drawn at this scale so it fills the 540 high menu box. */
const SCALE = 1.125;
const PANEL_X = 730;
const ROOF: Record<Building, number> = { coop: 0xb5563c, barn: 0x8f3b2e };

/**
 * The carpenter's placement screen (`docs/design/60_building_placement.md`).
 * A ghost footprint over the farm: green where the building may stand, red
 * where it may not, with the things in the way outlined. Touch drags the ghost
 * and presses Confirm; the mouse clicks to put the ghost down and clicks it
 * again, or presses Enter, to confirm.
 */
export class PlacementScene extends Phaser.Scene {
  private state!: GameState;
  private building: Building = "coop";
  private mode: PlacementData["mode"] = "order";
  private mapId = "";
  private gx = 0;
  private gy = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private confirmBox!: Phaser.GameObjects.Rectangle;
  private free = false;

  constructor() {
    super("placement");
  }

  init(data: PlacementData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.building = data.building;
    this.mode = data.mode;
    this.mapId = farmTypeById(this.state.farmType).map;
  }

  create(): void {
    const map = maps.get(this.mapId);
    const json = mapFiles[this.mapId]!;
    this.add.rectangle(480, 270, 20000, 20000, 0x10201a, 1).setInteractive();
    if (!this.cache.tilemap.exists(this.mapId))
      this.cache.tilemap.add(this.mapId, {
        format: Phaser.Tilemaps.Formats.TILED_JSON,
        data: json,
      });
    const tilemap = this.make.tilemap({ key: this.mapId });
    const tileset = tilemap.addTilesetImage(TILESET_NAME, TILES_KEY)!;
    for (const layer of layersAtTier(json, 0)) {
      if (layer.type !== "tilelayer" || layer.visible === false) continue;
      tilemap.createLayer(layer.name, tileset)?.setScale(SCALE);
    }
    this.gfx = this.add.graphics().setScale(SCALE);

    const info = BUILDINGS[this.building];
    this.add.text(PANEL_X, 16, this.mode === "order" ? "Place" : "Move", {
      fontSize: "26px",
      color: "#ffffff",
    });
    this.add.text(PANEL_X, 48, info.name, {
      fontSize: "20px",
      color: "#ffe9a0",
    });
    this.add.text(
      PANEL_X,
      84,
      "Drag, or click, to put it down.\nArrows nudge it.\nGreen means it fits.",
      { fontSize: "13px", color: "#ffffffcc", wordWrap: { width: 210 } },
    );
    this.info = this.add.text(PANEL_X, 170, "", {
      fontSize: "15px",
      color: "#ffe9a0",
      wordWrap: { width: 210 },
    });
    this.confirmBox = this.button(PANEL_X, 400, "Confirm", 0x3f7d4a, () =>
      this.confirm(),
    );
    this.button(PANEL_X, 460, "Cancel", 0xa0482e, () => this.finish(""));

    // Start where the building stands, or in the middle of the farm.
    const at = siteOf(this.state, this.building, this.mapId);
    const fp = footprintAt(this.building, 0, 0);
    const start =
      this.mode === "move" && at
        ? at
        : {
            x: Math.floor((map.width - fp.w) / 2),
            y: Math.floor((map.height - fp.h) / 2),
          };
    this.gx = start.x;
    this.gy = start.y;

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
      this.point(p, true),
    );
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.point(p, false);
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => this.nudge(-1, 0));
    kb?.on("keydown-RIGHT", () => this.nudge(1, 0));
    kb?.on("keydown-UP", () => this.nudge(0, -1));
    kb?.on("keydown-DOWN", () => this.nudge(0, 1));
    kb?.on("keydown-ENTER", () => this.confirm());
    kb?.on("keydown-ESC", () => this.finish(""));
    this.redraw();
  }

  private button(
    x: number,
    y: number,
    text: string,
    colour: number,
    run: () => void,
  ): Phaser.GameObjects.Rectangle {
    const box = this.add
      .rectangle(x, y, 200, 48, colour, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true });
    box.on("pointerdown", run);
    this.add
      .text(x + 100, y + 24, text, { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    return box;
  }

  /** Put the ghost's centre under a pointer on the map. A mouse click on a free ghost confirms. */
  private point(p: Phaser.Input.Pointer, down: boolean): void {
    if (p.worldX >= PANEL_X) return;
    const ts = maps.get(this.mapId).tileSize * SCALE;
    const tx = Math.floor(p.worldX / ts);
    const ty = Math.floor(p.worldY / ts);
    const fp = footprintAt(this.building, 0, 0);
    if (
      down &&
      !p.wasTouch &&
      this.free &&
      tx >= this.gx &&
      tx < this.gx + fp.w &&
      ty >= this.gy &&
      ty < this.gy + fp.h
    )
      return this.confirm();
    this.moveTo(tx - Math.floor(fp.w / 2), ty - Math.floor(fp.h / 2));
  }

  private nudge(dx: number, dy: number): void {
    this.moveTo(this.gx + dx, this.gy + dy);
  }

  private moveTo(x: number, y: number): void {
    const map = maps.get(this.mapId);
    const fp = footprintAt(this.building, 0, 0);
    this.gx = Math.min(Math.max(x, 0), map.width - fp.w);
    this.gy = Math.min(Math.max(y, 0), map.height - fp.h - 1);
    this.redraw();
  }

  private confirm(): void {
    if (!this.free) return;
    const map = maps.get(this.mapId);
    const noun = BUILDINGS[this.building].noun;
    if (this.mode === "order") {
      if (
        orderBuildingAt(
          this.state,
          map,
          this.mapId,
          this.building,
          this.gx,
          this.gy,
        )
      )
        this.finish(
          `Ordered. The carpenter starts tomorrow and takes ${BUILDINGS[this.building].days} days.`,
        );
    } else if (
      moveBuilding(this.state, map, this.mapId, this.building, this.gx, this.gy)
    )
      this.finish(`Your ${noun} now stands in its new place.`);
  }

  private finish(message: string): void {
    const carpenter = this.scene.get("carpenter");
    this.scene.stop();
    this.scene.resume("carpenter");
    carpenter.events.emit("placed", message);
  }

  private redraw(): void {
    const g = this.state;
    const map = maps.get(this.mapId);
    const ts = map.tileSize;
    const gfx = this.gfx;
    const tile = (x: number, y: number, colour: number, a = 1) =>
      gfx.fillStyle(colour, a).fillRect(x * ts, y * ts, ts, ts);
    gfx.clear();
    // Things on the farm, as coloured tiles: enough to see what is in the way.
    for (const r of g.rocks.each()) tile(r.x, r.y, 0x8c8c8c, 0.9);
    for (const t of g.trees.each())
      tile(t.x, t.y, t.stump ? 0x6b4a2b : 0x2f7a3a);
    for (const t of g.fruitTrees.each()) tile(t.x, t.y, 0x3f9a4a);
    for (const w of g.weeds.each()) tile(w.x, w.y, 0x6aa84f, 0.8);
    for (const t of g.twigs.each()) tile(t.x, t.y, 0x8a6a45, 0.8);
    for (const p of g.farm.each()) tile(p.x, p.y, 0x7a5230, 0.7);
    for (const s of g.sprinklers.each()) tile(s.x, s.y, 0x5fa8d3);
    for (const m of g.machines.each()) tile(m.x, m.y, 0xd9a441);
    for (const c of g.chests.each(this.mapId)) tile(c.x, c.y, 0xb8793a);
    for (const f of g.forage.each()) tile(f.x, f.y, 0xe8d36a, 0.9);
    for (const p of g.ground.each()) tile(p.x, p.y, 0xe8d36a, 0.9);
    for (const e of map.exits) {
      if (e.id === "coop" || e.id === "barn") continue;
      gfx
        .fillStyle(0xffffff, 0.25)
        .fillRect(e.x * ts, e.y * ts, e.w * ts, e.h * ts);
    }
    // The other buildings stand where they are.
    for (const b of ["coop", "barn"] as const) {
      if (b === this.building) continue;
      const r = placedFootprint(g, b, this.mapId);
      if (r) this.drawBuilding(b, r.x, r.y, 0.9);
    }
    const silo = SILO_SITES[this.mapId];
    if (silo && g.animals.silo)
      gfx
        .fillStyle(0x9aa0a6, 0.9)
        .fillRect(
          silo.x * ts,
          silo.y * ts,
          SILO_FOOTPRINT.w * ts,
          SILO_FOOTPRINT.h * ts,
        );
    // The ghost.
    const blockers = placementBlockers(
      g,
      map,
      this.mapId,
      this.building,
      this.gx,
      this.gy,
    );
    this.free = blockers.length === 0;
    const fp = footprintAt(this.building, this.gx, this.gy);
    const door = doorAt(this.building, this.gx, this.gy);
    const bad = new Set(blockers.map((b) => `${b.x},${b.y}`));
    const cells = [
      ...Array.from({ length: fp.w * fp.h }, (_, i) => ({
        x: fp.x + (i % fp.w),
        y: fp.y + Math.floor(i / fp.w),
      })),
      { x: door.x, y: door.y + 1 },
    ];
    for (const c of cells) {
      const isBad = bad.has(`${c.x},${c.y}`);
      tile(c.x, c.y, isBad ? 0xd9362b : 0x3fbf5a, 0.55);
      if (isBad)
        gfx
          .lineStyle(2, 0xff2a1a, 1)
          .strokeRect(c.x * ts + 1, c.y * ts + 1, ts - 2, ts - 2);
    }
    gfx
      .fillStyle(0x4a3220, 0.9)
      .fillRect(door.x * ts + 3, door.y * ts + 2, ts - 6, ts - 2);
    const first = blockers[0];
    this.info.setText(
      this.free
        ? "This spot is free."
        : `Blocked: ${first!.why}.${blockers.length > 1 ? ` And ${blockers.length - 1} more tile${blockers.length > 2 ? "s" : ""}.` : ""}`,
    );
    this.confirmBox.setAlpha(this.free ? 1 : 0.35);
  }

  private drawBuilding(b: Building, x: number, y: number, a: number): void {
    const ts = maps.get(this.mapId).tileSize;
    const f = footprintAt(b, x, y);
    this.gfx.fillStyle(ROOF[b], a).fillRect(f.x * ts, f.y * ts, f.w * ts, ts);
    this.gfx
      .fillStyle(0xc9a26b, a)
      .fillRect(f.x * ts, (f.y + 1) * ts, f.w * ts, (f.h - 1) * ts);
  }
}
