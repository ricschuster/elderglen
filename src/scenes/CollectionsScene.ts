import Phaser from "phaser";
import { ringProgress, valleyPercent } from "../core/completion";
import type { CategoryProgress } from "../core/completion";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The collections page (note 39): the completion total at the top, a row per
 * category with its progress, and a tap on a category lists what is still
 * missing. Categories whose systems are not built show as locked. The farm is
 * paused behind it.
 */
export class CollectionsScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private top!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  /** The category whose missing list is open, or undefined for the overview. */
  private open: CategoryProgress | undefined;

  constructor() {
    super("collections");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.open = undefined;
  }

  create(): void {
    frame(this, "Collections", () => this.close());
    this.top = this.add.text(24, 58, "", {
      fontSize: "20px",
      color: "#ffe9a0",
    });
    this.note = this.add.text(24, 500, "", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 90,
      w: 600,
      title: "Categories",
      visible: 6,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const rings = ringProgress(this.state);
    const ring = rings[0]!;
    this.top.setText(
      `${ring.name} ${ring.percent}%   Valley total ${valleyPercent(rings)}%`,
    );
    this.note.setText(
      "Arrows: move   Enter: open   Esc: close   The valley total drops when a new ring ships.",
    );
    if (this.open) {
      const c = this.open;
      const rows: Row[] = [
        {
          label: `Back to the categories`,
          buttons: [{ text: "Back", run: () => this.show(undefined) }],
        },
        ...c.missing.map((m) => ({
          label: m,
          dim: true,
          buttons: [],
        })),
      ];
      if (c.missing.length === 0)
        rows.push({
          label: c.locked ? "Not available yet." : "Nothing missing.",
          dim: true,
          buttons: [],
        });
      this.menu.setRows(rows);
      return;
    }
    this.menu.setRows(
      ring.categories.map((c) => ({
        label: `${c.name} (${c.weight})`,
        detail: c.locked
          ? "Locked"
          : `${c.done}/${c.total}  ${Math.floor(c.progress * 100)}%`,
        dim: c.locked,
        buttons: [{ text: "Missing", run: () => this.show(c) }],
      })),
    );
  }

  private show(c: CategoryProgress | undefined): void {
    this.open = c;
    this.menu.cursor = 0;
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
