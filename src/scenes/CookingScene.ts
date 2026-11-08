import Phaser from "phaser";
import {
  canCook,
  cook,
  dishIngredientText,
  dishSourceText,
  knownDishes,
  lockedDishes,
} from "../core/cooking";
import { reasonText } from "../core/tools";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The stove (note 24): the dishes the player knows, each with its ingredients
 * and what the pack holds. Locked dishes show as silhouettes with how they are
 * learned. Opened from the stove in the house kitchen.
 */
export class CookingScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("cooking");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "Stove", () => this.close());
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: cook   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "Recipes" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const rows: Row[] = knownDishes(g).map((d) => ({
      label: d.name,
      detail: `${dishIngredientText(d)}   restores ${d.energy}   have ${d.ingredients
        .map((i) => g.inventory.count(i.item))
        .join("/")}`,
      dim: !canCook(g, d),
      buttons: [
        {
          text: "Cook",
          run: () => {
            const why = cook(g, d.id);
            this.say(
              why ? reasonText(why) : `You cook ${d.name.toLowerCase()}.`,
            );
          },
        },
      ],
    }));
    for (const d of lockedDishes(g))
      rows.push({
        label: "???",
        detail: dishSourceText(d),
        dim: true,
        buttons: [],
      });
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
