import Phaser from "phaser";
import { cakeDishes, cakeProblem, handInCake } from "../core/cakeday";
import { itemById } from "../core/items";
import { splitQuality } from "../core/quality";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The Cake Day table (note 82): pick which cooked dish from the pack goes on
 * the table, one a year. Rows and buttons only, so it works on a tablet.
 */
export class CakeScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("cake");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "Cake Day table", () => this.close());
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
    const dishes = cakeDishes(this.state);
    const rows: Row[] = dishes.map((id) => {
      const { quality } = splitQuality(id);
      return {
        label: itemById(id)?.name ?? id,
        detail: `${quality}, you have ${this.state.inventory.count(id)}`,
        buttons: [{ text: "Put on table", run: () => this.give(id) }],
      };
    });
    if (rows.length === 0)
      rows.push({
        label:
          cakeProblem(this.state, "") === "Your dish is already on the table."
            ? "Your dish is already on the table."
            : "You have no cooked dish to put on the table.",
        buttons: [],
      });
    this.menu.setRows(rows);
  }

  private give(id: string): void {
    const r = handInCake(this.state, id);
    if (!r) return this.refresh();
    this.message.setText(
      `Everyone tastes your ${itemById(id)?.name.toLowerCase() ?? "dish"} (${r.quality}). They like you a little more.`,
    );
    this.refresh();
    this.time.delayedCall(1600, () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
