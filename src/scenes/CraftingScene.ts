import { audio } from "../audio/engine";
import Phaser from "phaser";
import {
  canCraft,
  craft,
  haveCount,
  ingredientText,
  knownRecipes,
  lockedRecipes,
  sourceText,
} from "../core/crafting";
import { itemById } from "../core/items";
import { reasonText } from "../core/tools";
import type { GameState } from "../core/save";
import { closeWindow, frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The crafting tab (note 34): the recipes the player knows, each with its
 * ingredients and what the pack holds. From the pause menu it draws on the
 * pack only; at a workbench it also draws on the chests beside it. Opened from the Craft key or button.
 */
export class CraftingScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  /** Set when opened at a workbench: crafting then draws on the chests beside it. */
  private bench?: { mapId: string; x: number; y: number };

  constructor() {
    super("crafting");
  }

  init(data?: { bench?: { mapId: string; x: number; y: number } }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.bench = data?.bench;
  }

  /** The chests a workbench draws on, none at the pause menu. */
  private chests() {
    const b = this.bench;
    return b ? this.state.chests.near(b.mapId, b.x, b.y) : [];
  }

  create(): void {
    const { message } = frame(this, this.bench ? "Workbench" : "Crafting", () =>
      this.close(),
    );
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: craft   Esc: close", {
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
    const chests = this.chests();
    const rows: Row[] = knownRecipes(g).map((r) => {
      const name = itemById(r.result.item)?.name ?? r.result.item;
      return {
        label: name,
        detail: `${ingredientText(r)}   have ${r.ingredients
          .map((i) => haveCount(g, i.item, chests))
          .join("/")}`,
        dim: !canCraft(g, r, chests),
        buttons: [
          {
            text: "Craft",
            run: () => {
              const why = craft(g, r.id, chests);
              audio.sfx(why ? "ui.error" : "craft.done");
              this.say(
                why ? reasonText(why) : `You make a ${name.toLowerCase()}.`,
              );
            },
          },
        ],
      };
    });
    for (const r of lockedRecipes(g)) {
      rows.push({
        label: itemById(r.result.item)?.name ?? r.result.item,
        detail: sourceText(r),
        dim: true,
        buttons: [],
      });
    }
    this.menu.setRows(rows);
  }

  private close(): void {
    closeWindow(this);
  }
}
