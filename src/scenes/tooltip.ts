import Phaser from "phaser";
import { KIND_COLOURS, type ItemTip } from "../core/itemtip";

const PAD = 8;
const WIDTH = 220;
const LONG_PRESS_MS = 450;

/**
 * A hover tooltip (note 103): a name line, a coloured type line, then a text
 * box. Same look as the HUD bar tip. It sits above its anchor, or below if
 * there is no room, and stays inside `bounds` (the scene's own coordinates:
 * HUD units for the HUD, 960 by 540 for a menu tab).
 */
export class Tooltip {
  readonly objects: Phaser.GameObjects.GameObject[];
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly name: Phaser.GameObjects.Text;
  private readonly kind: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    depth = 1000,
  ) {
    const font = { fontSize: "14px", color: "#ffffff" };
    this.bg = scene.add
      .rectangle(0, 0, WIDTH, 40, 0x000000, 0.75)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.5);
    this.name = scene.add.text(0, 0, "", { ...font, fontSize: "16px" });
    this.kind = scene.add.text(0, 0, "", font);
    this.body = scene.add.text(0, 0, "", {
      ...font,
      color: "#ffffffdd",
      wordWrap: { width: WIDTH - 2 * PAD },
    });
    this.objects = [this.bg, this.name, this.kind, this.body];
    for (const o of this.objects)
      (o as Phaser.GameObjects.Text).setDepth(depth);
    this.hide();
  }

  hide(): void {
    for (const o of this.objects)
      (o as Phaser.GameObjects.Text).setVisible(false);
  }

  /** Show the tip above (or below) the anchor box, clamped inside the bounds. */
  show(
    tip: ItemTip,
    anchor: { x: number; y: number; w: number; h: number },
    bounds: { w: number; h: number },
  ): void {
    this.name.setText(tip.name);
    this.kind.setText(tip.kind).setColor(KIND_COLOURS[tip.kind] ?? "#d8d8d8");
    this.body.setText(tip.text);
    const h =
      PAD * 3 + this.name.height + this.kind.height + this.body.height + 4;
    this.bg.setSize(WIDTH, h);
    let x = anchor.x + anchor.w / 2 - WIDTH / 2;
    let y = anchor.y - h - 6;
    if (y < 4) y = anchor.y + anchor.h + 6;
    x = Math.max(4, Math.min(bounds.w - WIDTH - 4, x));
    y = Math.max(4, Math.min(bounds.h - h - 4, y));
    this.bg.setPosition(x, y);
    this.name.setPosition(x + PAD, y + PAD);
    this.kind.setPosition(x + PAD, y + PAD + this.name.height);
    this.body.setPosition(
      x + PAD,
      y + PAD + this.name.height + this.kind.height + 4,
    );
    for (const o of this.objects)
      (o as Phaser.GameObjects.Text).setVisible(true);
  }

  /**
   * Wire a slot: mouse hover shows the tip, a long press does on touch. `tip`
   * returns undefined for an empty slot; `bounds` is read at show time.
   */
  attach(
    box: Phaser.GameObjects.Rectangle,
    tip: () => ItemTip | undefined,
    bounds: () => { w: number; h: number },
  ): void {
    let timer: Phaser.Time.TimerEvent | undefined;
    const open = () => {
      const t = tip();
      if (!t || !box.visible) return;
      const b = box.getBounds();
      this.show(t, { x: b.x, y: b.y, w: b.width, h: b.height }, bounds());
    };
    const close = () => {
      timer?.remove();
      timer = undefined;
      this.hide();
    };
    box.on("pointerover", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) open();
    });
    box.on("pointerout", close);
    box.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) return;
      timer?.remove();
      timer = this.scene.time.delayedCall(LONG_PRESS_MS, open);
    });
    box.on("pointerup", close);
    box.on("pointerupoutside", close);
  }
}
