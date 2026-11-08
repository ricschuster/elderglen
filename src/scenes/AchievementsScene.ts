import Phaser from "phaser";
import { ACHIEVEMENTS, buyHat, hatsOnSale } from "../core/achievements";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The achievements page and the hatter (note 38). Earned goals show with their
 * hat, unearned ones greyed with their goal, secret ones hidden. Hats of earned
 * goals are bought here, at the hatter's counter, until the valley has a shop
 * for her. The farm is paused behind it.
 */
export class AchievementsScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;

  constructor() {
    super("achievements");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message, money } = frame(this, "Achievements", () => this.close());
    this.message = message;
    this.money = money;
    this.add.text(24, 500, "Arrows: move   Enter: buy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "The hatter" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const rows: Row[] = hatsOnSale(g).map((a) => ({
      label: `Hat: ${a.hat.name}`,
      detail: `${a.hat.price}g  for ${a.name}`,
      dim: g.money < a.hat.price,
      buttons: [
        {
          text: "Buy",
          run: () => {
            this.message.setText(
              buyHat(g, a.hat.id) ?? `You bought the ${a.hat.name}.`,
            );
            this.refresh();
          },
        },
      ],
    }));
    rows.push({
      label: "Collections and the completion total",
      buttons: [
        {
          text: "Open",
          run: () => {
            this.scene.stop();
            this.scene.launch("collections");
          },
        },
      ],
    });
    for (const a of ACHIEVEMENTS) {
      const earned = g.achievements.has(a.id);
      if (a.secret && !earned) continue;
      rows.push({
        label: earned ? a.name : `${a.name} (not yet)`,
        detail: earned ? a.goal : `${a.goal}  Hat: ${a.hat.name}`,
        dim: !earned,
        buttons: [],
      });
    }
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
