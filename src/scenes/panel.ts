import Phaser from "phaser";
import { paintUiFrame, UI_FRAME_EDGE, UI_FRAME_KEY } from "./art";
import { MENU_H, MENU_W, menuZoom } from "../core/view";

/**
 * A backdrop rectangle centred on the menu box and bigger than any window, so
 * a dim or a block of taps covers the whole window and not only the box.
 */
export const WINDOW_FILL = 20000;

/** Registry key for the UI size percent (live copy of the setting). */
export const UI_SIZE_KEY = "uiSize";
/** Registry key for the world zoom percent (live copy of the setting). */
export const WORLD_ZOOM_KEY = "worldZoom";

/**
 * Put the 960 by 540 menu box in the middle of the window, scaled by the UI
 * size and shrunk if the window is smaller than the box.
 */
export function centreView(scene: Phaser.Scene): void {
  const { width, height } = scene.scale.gameSize;
  const ui = (scene.registry.get(UI_SIZE_KEY) as number | undefined) ?? 100;
  scene.cameras.main
    .setSize(width, height)
    .setZoom(menuZoom(ui, width, height))
    .centerOn(MENU_W / 2, MENU_H / 2);
}

/**
 * Every scene except the farm draws in a centred menu box. Hooked once at
 * start: it centres each scene after its `create` and again on a resize or a
 * wake. The farm lays out its own cameras.
 */
export function centreMenus(game: Phaser.Game, skip: string[]): void {
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.getScenes(false)) {
      if (skip.includes(scene.scene.key)) continue;
      const apply = () => centreView(scene);
      const attach = () => {
        apply();
        scene.scale.off(Phaser.Scale.Events.RESIZE, apply);
        scene.scale.on(Phaser.Scale.Events.RESIZE, apply);
      };
      scene.events.on(Phaser.Scenes.Events.CREATE, attach);
      scene.events.on(Phaser.Scenes.Events.WAKE, apply);
      scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () =>
        scene.scale.off(Phaser.Scale.Events.RESIZE, apply),
      );
      // The first scene can already be running when this hook is set.
      if (scene.sys.isActive()) attach();
    }
  });
}

export interface RowButton {
  text: string;
  run: () => void;
  enabled?: boolean;
}

export interface Row {
  label: string;
  detail?: string;
  /** A dim row is shown but cannot be acted on. */
  dim?: boolean;
  buttons: RowButton[];
}

/**
 * Row height that keeps rows and their buttons at or above the 40 px touch
 * floor once the canvas is scaled down on a tablet (row box is this minus 4,
 * button box this minus 6).
 */
export const TOUCH_ROW_H = 52;

export interface MenuOptions {
  x: number;
  y: number;
  w: number;
  title: string;
  rowH?: number;
  /** Rows shown at once; the list scrolls to keep the cursor in view. */
  visible?: number;
  /** Called with the new cursor row whenever the cursor moves. */
  onCursor?: (row: number) => void;
  /** When true, tapping a row only selects it; only a button press acts. For shops. */
  buttonsOnly?: boolean;
}

/**
 * A titled list of rows, each with buttons. Works by touch (tap a row for its
 * first button, or tap any button) and by keyboard (move the cursor, press a
 * button by number). It is rebuilt from scratch by `setRows`, which is plenty
 * for lists this small.
 */
export class Menu {
  focused = false;
  cursor = 0;
  private rows: Row[] = [];
  private first = 0;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly title: Phaser.GameObjects.Text;
  private readonly rowH: number;
  private readonly visible: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: MenuOptions,
  ) {
    this.rowH = opts.rowH ?? 44;
    this.visible = opts.visible ?? 7;
    this.title = scene.add.text(opts.x, opts.y, opts.title, {
      fontSize: "22px",
      color: "#ffe9a0",
    });
  }

  get row(): Row | undefined {
    return this.rows[this.cursor];
  }

  /** Remove the menu and its rows from the screen. */
  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
    this.title.destroy();
  }

  setRows(rows: Row[]): void {
    this.rows = rows;
    this.cursor = Math.min(this.cursor, Math.max(rows.length - 1, 0));
    this.draw();
  }

  setFocus(on: boolean): void {
    this.focused = on;
    this.draw();
  }

  move(step: number): void {
    if (this.rows.length === 0) return;
    this.cursor = Phaser.Math.Clamp(
      this.cursor + step,
      0,
      this.rows.length - 1,
    );
    this.opts.onCursor?.(this.cursor);
    this.draw();
  }

  /** Press button `n` (from 0) of the row under the cursor. */
  press(n: number): void {
    const button = this.row?.buttons[n];
    if (button && button.enabled !== false && !this.row?.dim) button.run();
  }

  private draw(): void {
    for (const o of this.objects) o.destroy();
    this.objects.length = 0;
    const { x, y, w } = this.opts;
    if (this.cursor < this.first) this.first = this.cursor;
    if (this.cursor >= this.first + this.visible)
      this.first = this.cursor - this.visible + 1;
    const top = y + 34;
    const shown = this.rows.slice(this.first, this.first + this.visible);
    shown.forEach((row, i) => {
      // Buttons are as wide as their longest text, so short ones leave room.
      const bw = Math.max(
        52,
        ...row.buttons.map((b) => b.text.length * 8 + 18),
      );
      const index = this.first + i;
      const ry = top + i * this.rowH;
      const on = this.focused && index === this.cursor;
      const bg = this.scene.add
        .rectangle(
          x,
          ry,
          w,
          this.rowH - 4,
          on ? 0xf2d16b : 0x000000,
          on ? 0.35 : 0.3,
        )
        .setOrigin(0)
        .setInteractive();
      // Tapping a row does its main action, so the whole row is the target.
      bg.on("pointerdown", () => {
        this.cursor = index;
        this.opts.onCursor?.(index);
        this.draw();
        if (!this.opts.buttonsOnly) this.press(0);
      });
      const alpha = row.dim ? 0.45 : 1;
      const label = this.scene.add
        .text(x + 8, ry + this.rowH / 2 - 2, row.label, {
          fontSize: "17px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5)
        .setAlpha(alpha);
      this.objects.push(bg, label);
      if (row.detail) {
        const detailX = x + w - row.buttons.length * (bw + 4) - 8;
        this.objects.push(
          this.scene.add
            .text(detailX, ry + this.rowH / 2 - 2, row.detail, {
              fontSize: "15px",
              color: "#d8e8c8",
            })
            .setOrigin(1, 0.5)
            .setAlpha(alpha),
        );
      }
      row.buttons.forEach((b, n) => {
        const bx = x + w - (row.buttons.length - n) * (bw + 4);
        const usable = b.enabled !== false && !row.dim;
        const box = this.scene.add
          .rectangle(bx, ry + 1, bw, this.rowH - 6, 0x3f7d3a, usable ? 1 : 0.3)
          .setOrigin(0)
          .setStrokeStyle(1, 0xffffff, usable ? 0.8 : 0.2);
        if (usable) {
          box.setInteractive({ useHandCursor: true });
          box.on("pointerdown", () => {
            this.cursor = index;
            this.opts.onCursor?.(index);
            b.run();
          });
        }
        const text = this.scene.add
          .text(bx + bw / 2, ry + this.rowH / 2 - 2, b.text, {
            fontSize: "14px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
          .setAlpha(usable ? 1 : 0.4);
        this.objects.push(box, text);
      });
    });
    if (this.rows.length > this.visible) {
      const more = this.scene.add.text(
        x,
        top + this.visible * this.rowH,
        `${this.first + 1}-${this.first + shown.length} of ${this.rows.length}`,
        { fontSize: "13px", color: "#ffffffaa" },
      );
      this.objects.push(more);
    }
  }
}

/** The dim backdrop and close button every screen shares. */
export function frame(
  scene: Phaser.Scene,
  title: string,
  onClose: () => void,
): { money: Phaser.GameObjects.Text; message: Phaser.GameObjects.Text } {
  paintUiFrame(scene);
  // The interactive backdrop blocks clicks to the scene behind. The frame
  // image only draws the border over it.
  scene.add
    .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 1)
    .setInteractive();
  scene.add
    .nineslice(
      0,
      0,
      UI_FRAME_KEY,
      undefined,
      960,
      540,
      UI_FRAME_EDGE,
      UI_FRAME_EDGE,
      UI_FRAME_EDGE,
      UI_FRAME_EDGE,
    )
    .setOrigin(0);
  scene.add.text(24, 16, title, { fontSize: "30px", color: "#ffffff" });
  const money = scene.add
    .text(720, 22, "", { fontSize: "22px", color: "#ffe9a0" })
    .setOrigin(0, 0);
  const message = scene.add.text(24, 470, "", {
    fontSize: "18px",
    color: "#ffe9a0",
  });
  const close = scene.add
    .rectangle(836, 480, 100, 44, 0xa0482e, 1)
    .setOrigin(0)
    .setStrokeStyle(2, 0xffffff, 0.8)
    .setInteractive({ useHandCursor: true });
  close.on("pointerdown", onClose);
  scene.add
    .text(886, 502, "Close", { fontSize: "20px", color: "#ffffff" })
    .setOrigin(0.5);
  scene.input.keyboard?.on("keydown-ESC", onClose);
  return { money, message };
}
