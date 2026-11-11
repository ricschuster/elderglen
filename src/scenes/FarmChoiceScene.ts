import { respawnAreaForage } from "../core/areas";
import Phaser from "phaser";
import { FARM_TYPES, type FarmTypeDef } from "../core/farmtypes";
import { dateOf } from "../core/calendar";
import { startGame } from "../core/toolbar";
import { maps } from "../content/maps";
import { STATE_KEY } from "./state";

const CARD_W = 300;
const CARD_H = 330;
/** The preview box inside a card; a map is scaled down to fit it. */
const PREVIEW_W = CARD_W - 24;
const PREVIEW_H = 180;
const PREVIEW_MAX_PX = 6;

/**
 * The farm choice at a new game (`docs/design/32_farm_types.md`). One card per
 * type with a map preview, the name and the perk in a line. Tap or click a
 * card, then Confirm; Back returns to the title. The choice is saved with the
 * game and cannot change.
 */
export class FarmChoiceScene extends Phaser.Scene {
  private picked = 0;
  private frames: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super("farm-choice");
  }

  init(): void {
    this.picked = 0;
    this.frames = [];
  }

  create(): void {
    this.add
      .text(480, 40, "Choose your farm", { fontSize: "32px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.add
      .text(480, 78, "The choice cannot be changed once the game begins.", {
        fontSize: "15px",
        color: "#ffffffcc",
      })
      .setOrigin(0.5);
    const gap = 40;
    const total = FARM_TYPES.length * CARD_W + (FARM_TYPES.length - 1) * gap;
    FARM_TYPES.forEach((type, i) =>
      this.card(type, i, 480 - total / 2 + CARD_W / 2 + i * (CARD_W + gap)),
    );
    this.button(300, 500, "Back", 0x4a5a7a, () => this.back());
    this.button(660, 500, "Confirm", 0x3f7d3a, () => this.confirm());
    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => this.pick(this.picked - 1));
    kb?.on("keydown-RIGHT", () => this.pick(this.picked + 1));
    kb?.on("keydown-ENTER", () => this.confirm());
    kb?.on("keydown-ESC", () => this.back());
    this.pick(0);
  }

  private card(type: FarmTypeDef, index: number, cx: number): void {
    const top = 110;
    const box = this.add
      .rectangle(cx, top + CARD_H / 2, CARD_W, CARD_H, 0x2a3a2a, 1)
      .setStrokeStyle(3, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.pick(index));
    this.frames.push(box);
    this.preview(type, cx, top + 20);
    this.add
      .text(cx, top + 24 + 30 * 0 + 190, type.name, {
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, top + 24 + 190 + 34, type.perk, {
        fontSize: "14px",
        color: "#d8e8c8",
        align: "center",
        wordWrap: { width: CARD_W - 32 },
      })
      .setOrigin(0.5, 0);
  }

  /** A small drawing of the map: soil, water and walls, trees and forage. */
  private preview(type: FarmTypeDef, cx: number, y: number): void {
    const map = maps.get(type.map);
    const g = this.add.graphics();
    const px = Math.min(
      PREVIEW_MAX_PX,
      PREVIEW_W / map.width,
      PREVIEW_H / map.height,
    );
    const w = map.width * px;
    const x0 = cx - w / 2;
    const at = (x: number, yy: number) => ({
      x: x0 + x * px,
      y: y + yy * px,
    });
    for (let ty = 0; ty < map.height; ty++)
      for (let tx = 0; tx < map.width; tx++) {
        const color = map.isTillable(tx, ty)
          ? 0xe0d08c
          : map.isBlocked(tx, ty)
            ? 0x555e66
            : 0x4e8f46;
        const p = at(tx, ty);
        g.fillStyle(color, 1).fillRect(p.x, p.y, px, px);
      }
    for (const t of map.trees) {
      const p = at(t.x, t.y);
      g.fillStyle(t.large ? 0x7a4e26 : 0x1f4d25, 1).fillRect(p.x, p.y, px, px);
    }
    for (const f of map.forageSpots) {
      const p = at(f.x, f.y);
      g.fillStyle(0xf2d84a, 1).fillRect(
        p.x,
        p.y,
        Math.max(px, 2),
        Math.max(px, 2),
      );
    }
  }

  private pick(index: number): void {
    this.picked = (index + FARM_TYPES.length) % FARM_TYPES.length;
    this.frames.forEach((f, i) =>
      f
        .setStrokeStyle(
          3,
          i === this.picked ? 0xffe9a0 : 0xffffff,
          i === this.picked ? 1 : 0.4,
        )
        .setFillStyle(i === this.picked ? 0x3a523a : 0x2a3a2a),
    );
  }

  private back(): void {
    this.scene.start("title");
  }

  private confirm(): void {
    const type = FARM_TYPES[this.picked];
    if (!type) return;
    const state = startGame(type.id);
    state.forage.respawn(
      dateOf(state.day.clock.day).season,
      maps.get(type.map).forageSpots,
      Math.random,
    );
    respawnAreaForage(state, Math.random);
    this.registry.set(STATE_KEY, state);
    this.scene.start("farm");
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
  ): void {
    this.add
      .rectangle(x, y, 220, 52, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
  }
}
