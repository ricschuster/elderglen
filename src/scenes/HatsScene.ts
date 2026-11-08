import Phaser from "phaser";
import { hatById } from "../core/hats";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The hat box: the hats the player owns, and which one is worn. Opened from
 * the Hats key or button. Hats are only a look (`10_customisation.md`).
 */
export class HatsScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;

  constructor() {
    super("hats");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    frame(this, "Hats", () => this.close());
    this.add.text(24, 500, "Arrows: move   Enter: wear   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "Your hats" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const w = this.state.wardrobe;
    const row = (id: string | undefined, label: string): Row => ({
      label,
      detail: w.worn === id ? "worn" : undefined,
      buttons: [
        {
          text: "Wear",
          run: () => {
            w.wear(id);
            this.refresh();
          },
        },
      ],
    });
    const rows = [row(undefined, "No hat")];
    for (const id of w.list()) rows.push(row(id, hatById(id)?.name ?? id));
    rows.push({
      label: "Achievements and the hatter",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("achievements");
          },
        },
      ],
    });
    rows.push({
      label: "Open requests",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("requests", { list: true });
          },
        },
      ],
    });
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
