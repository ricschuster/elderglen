import Phaser from "phaser";
import type { GameState } from "../core/save";
import {
  barColour,
  barFraction,
  barLabel,
  barsInset,
  clockLines,
  eventIcon,
  goldText,
  healthBarShown,
  weatherIcon,
  type EventIcon,
  type WeatherIcon,
} from "../core/hudpanel";

/** The clock panel (top right) and the energy and health bars (bottom right), note 102. */
export const PANEL_W = 176;
const PANEL_TOP = 8;
const MARGIN = 16;
const CLOCK_H = 62;
const GOLD_H = 28;
const BAR_W = 22;
const BAR_H = 110;
const BAR_GAP = 8;
/** Where the panel ends, in HUD units: buttons that stack under it start below this. */
export const PANEL_BOTTOM = PANEL_TOP + CLOCK_H + 4 + GOLD_H;
/** The panel's left edge in the base 960 wide layout, for buttons placed beside it. */
export const PANEL_LEFT_BASE = 960 - MARGIN - PANEL_W;

/**
 * Drawn from simple shapes until the art pass (M3d). The spot left of the
 * weather icon, inside the clock box, is kept clear for the sun and moon dial.
 */
export class HudPanel {
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly date: Phaser.GameObjects.Text;
  private readonly time: Phaser.GameObjects.Text;
  private readonly gold: Phaser.GameObjects.Text;
  private readonly energyTag: Phaser.GameObjects.Text;
  private readonly healthTag: Phaser.GameObjects.Text;
  private readonly tip: Phaser.GameObjects.Text;
  private readonly energyHit: Phaser.GameObjects.Rectangle;
  private readonly healthHit: Phaser.GameObjects.Rectangle;
  private uw = 960;
  private uh = 540;
  private readonly inset: number;
  private hover: "energy" | "health" | undefined;
  private pinnedTip = false;

  constructor(
    scene: Phaser.Scene,
    private readonly touch: boolean,
    stick: boolean,
    buttonRadius: number,
  ) {
    this.inset = barsInset(touch && stick, buttonRadius);
    this.gfx = scene.add.graphics();
    const style = { fontSize: "16px", color: "#ffffff" };
    this.date = scene.add.text(0, 0, "", style);
    this.time = scene.add.text(0, 0, "", { ...style, fontSize: "20px" });
    this.gold = scene.add.text(0, 0, "", { ...style, color: "#ffe9a0" });
    const tag = { fontSize: "14px", color: "#ffffff" };
    this.energyTag = scene.add.text(0, 0, "E", tag).setOrigin(0.5, 0);
    this.healthTag = scene.add.text(0, 0, "H", tag).setOrigin(0.5, 0);
    this.tip = scene.add
      .text(0, 0, "", {
        ...tag,
        backgroundColor: "#000000b0",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(1, 0.5)
      .setVisible(false);
    const hit = () =>
      scene.add.rectangle(0, 0, BAR_W, BAR_H, 0xffffff, 0.001).setOrigin(0);
    this.energyHit = hit().setInteractive();
    this.healthHit = hit().setInteractive();
    for (const [h, which] of [
      [this.energyHit, "energy"],
      [this.healthHit, "health"],
    ] as const) {
      h.on("pointerover", () => (this.hover = which));
      h.on("pointerout", () => {
        if (!this.pinnedTip) this.hover = undefined;
      });
      // A tap shows the exact number on touch and stays until the next tap.
      h.on("pointerdown", () => {
        if (!this.touch) return;
        this.pinnedTip = !(this.pinnedTip && this.hover === which);
        this.hover = this.pinnedTip ? which : undefined;
      });
    }
    this.objects.push(
      this.gfx,
      this.date,
      this.time,
      this.gold,
      this.energyTag,
      this.healthTag,
      this.tip,
      this.energyHit,
      this.healthHit,
    );
  }

  /** Re-anchor to the window corners; sizes are HUD units. */
  layout(uw: number, uh: number): void {
    this.uw = uw;
    this.uh = uh;
    const x0 = this.panelX();
    this.date.setPosition(x0 + 8, PANEL_TOP + 6);
    this.time.setPosition(x0 + 8, PANEL_TOP + 32);
    this.gold.setPosition(x0 + 8, PANEL_TOP + CLOCK_H + 4 + 5);
    const top = this.barTop();
    this.energyTag.setPosition(this.energyX() + BAR_W / 2, top + BAR_H + 2);
    this.healthTag.setPosition(this.healthX() + BAR_W / 2, top + BAR_H + 2);
    this.energyHit.setPosition(this.energyX(), top);
    this.healthHit.setPosition(this.healthX(), top);
  }

  private panelX = (): number => this.uw - MARGIN - PANEL_W;
  private energyX = (): number => this.uw - MARGIN - this.inset - BAR_W;
  private healthX = (): number => this.energyX() - BAR_W - BAR_GAP;
  private barTop = (): number => this.uh - MARGIN - 20 - BAR_H;

  update(g: GameState, canBeHurt: boolean): void {
    const { clock, energy } = g.day;
    const lines = clockLines(clock.day, clock.format());
    this.date.setText(lines.date);
    this.time.setText(lines.time);
    this.gold.setText(goldText(g.money));
    const { health } = g.combat;
    const showHealth = healthBarShown(canBeHurt, health.current, health.max);
    this.healthTag.setVisible(showHealth);
    this.healthHit.setVisible(showHealth);
    if (!showHealth && this.hover === "health") this.hover = undefined;

    const x0 = this.panelX();
    const gx = this.gfx;
    gx.clear();
    gx.fillStyle(0x000000, 0.55).fillRect(x0, PANEL_TOP, PANEL_W, CLOCK_H);
    gx.lineStyle(2, 0xffffff, 0.4).strokeRect(x0, PANEL_TOP, PANEL_W, CLOCK_H);
    const gy = PANEL_TOP + CLOCK_H + 4;
    gx.fillStyle(0x000000, 0.55).fillRect(x0, gy, PANEL_W, GOLD_H);
    gx.lineStyle(2, 0xffe9a0, 0.5).strokeRect(x0, gy, PANEL_W, GOLD_H);
    const cy = PANEL_TOP + 44;
    drawWeather(gx, weatherIcon(g.weather), x0 + PANEL_W - 54, cy);
    const ev = eventIcon(clock.day);
    if (ev) drawEvent(gx, ev, x0 + PANEL_W - 22, cy);

    const top = this.barTop();
    this.bar(energy.current, energy.max, this.energyX(), top);
    if (showHealth) this.bar(health.current, health.max, this.healthX(), top);

    const shown = this.hover;
    this.tip.setVisible(shown !== undefined);
    if (shown) {
      const [name, cur, max, x] =
        shown === "energy"
          ? (["Energy", energy.current, energy.max, this.energyX()] as const)
          : (["Health", health.current, health.max, this.healthX()] as const);
      this.tip.setText(barLabel(name, cur, max));
      this.tip.setPosition(x - 6, top + BAR_H / 2);
    }
  }

  private bar(cur: number, max: number, x: number, top: number): void {
    const f = barFraction(cur, max);
    const gx = this.gfx;
    const inner = BAR_H - 4;
    gx.fillStyle(0x000000, 0.6).fillRect(x, top, BAR_W, BAR_H);
    gx.fillStyle(barColour(f), 1);
    gx.fillRect(x + 2, top + 2 + inner * (1 - f), BAR_W - 4, inner * f);
    gx.lineStyle(2, 0xffffff, 0.5).strokeRect(x, top, BAR_W, BAR_H);
  }
}

function cloud(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xcfd6e0, 1);
  g.fillCircle(x - 6, y, 6);
  g.fillCircle(x + 2, y - 3, 7);
  g.fillCircle(x + 8, y, 5);
  g.fillRect(x - 6, y, 14, 5);
}

function drawWeather(
  g: Phaser.GameObjects.Graphics,
  w: WeatherIcon,
  x: number,
  y: number,
): void {
  if (w === "sun") {
    g.fillStyle(0xffd860, 1).fillCircle(x, y, 8);
    return;
  }
  cloud(g, x, y - 4);
  if (w === "rain") {
    g.lineStyle(2, 0x6aa8ff, 1);
    for (const dx of [-6, 0, 6])
      g.lineBetween(x + dx, y + 5, x + dx - 2, y + 11);
  } else if (w === "storm") {
    g.lineStyle(2, 0xffd860, 1);
    g.lineBetween(x + 2, y + 3, x - 2, y + 8);
    g.lineBetween(x - 2, y + 8, x + 3, y + 8);
    g.lineBetween(x + 3, y + 8, x - 1, y + 13);
  } else {
    g.fillStyle(0xffffff, 1);
    for (const dx of [-6, 0, 6]) g.fillCircle(x + dx, y + 8, 2);
  }
}

function drawEvent(
  g: Phaser.GameObjects.Graphics,
  e: EventIcon,
  x: number,
  y: number,
): void {
  if (e === "festival") {
    g.lineStyle(2, 0xffffff, 1).lineBetween(x - 6, y - 9, x - 6, y + 9);
    g.fillStyle(0xe06060, 1).fillTriangle(
      x - 6,
      y - 9,
      x + 8,
      y - 4,
      x - 6,
      y + 1,
    );
  } else {
    g.fillStyle(0xe8a0d0, 1).fillRect(x - 8, y - 4, 16, 12);
    g.fillStyle(0xffffff, 1).fillRect(x - 1, y - 4, 2, 12);
    g.fillStyle(0xffffff, 1).fillRect(x - 8, y, 16, 2);
  }
}
