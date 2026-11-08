import Phaser from "phaser";
import type { GameState } from "../core/save";
import { catalogueStock, takeCatalogueCopy } from "../core/furniture";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The placed Furniture Catalogue (note 10): every piece, free, as many copies
 * as the backpack has room for. Opened with Action on the catalogue in the house.
 */
export class CatalogueScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("catalogue");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "Furniture Catalogue", () => this.close());
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: take a copy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "Take a copy, free",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    const rows: Row[] = catalogueStock().map((f) => ({
      label: f.name,
      detail: `0g${f.rug ? "  (rug)" : ""}`,
      buttons: [{ text: "Take", run: () => this.take(f.id) }],
    }));
    this.menu.setRows(rows);
  }

  private take(id: string): void {
    const r = takeCatalogueCopy(this.state, id);
    this.message.setText(
      r.ok
        ? "Taken. Hold it in the house and press Use to place it."
        : "Your pack is full.",
    );
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
