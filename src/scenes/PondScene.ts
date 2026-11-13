import Phaser from "phaser";
import { emptyPond, pondAt, pondMenu } from "../core/pond";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

export interface PondData {
  /** The pond's top left tile. */
  x: number;
  y: number;
}

/**
 * The pond menu (`docs/design/93_fish_pond_and_water_finds.md`, "Interface"):
 * the fish, the count against the cap, any ask, and the Empty button. Placeholder
 * look, like the other menus; tablet friendly (rows and buttons, no drag).
 */
export class PondScene extends Phaser.Scene {
  private state!: GameState;
  private at: PondData = { x: 0, y: 0 };
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("pond");
  }

  init(data: PondData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.at = data;
  }

  create(): void {
    const { message } = frame(this, "Fish pond", () => this.close());
    this.message = message;
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.refresh();
  }

  private refresh(): void {
    const p = pondAt(this.state, this.at.x, this.at.y);
    if (!p) return this.close();
    const m = pondMenu(p);
    const rows: Row[] = m.lines.map((label) => ({ label, buttons: [] }));
    rows.push({
      label: "Empty the pond",
      detail: "every fish goes to your pack and the pond starts over",
      dim: !m.canEmpty,
      buttons: [{ text: "Empty", run: () => this.empty() }],
    });
    this.menu.setRows(rows);
  }

  private empty(): void {
    const r = emptyPond(this.state, this.at.x, this.at.y);
    this.message.setText(
      r.ok ? "The fish are in your pack." : (r.reason ?? "Nothing to take."),
    );
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
