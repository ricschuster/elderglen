import Phaser from "phaser";
import { STARTERS, takeStarter } from "../core/combat";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/** What each family feels like, in the trainer's placeholder words (note 22). */
const FAMILY_TALK = {
  blade: "A quick short arc. Good for everything.",
  club: "Slow and wide. It hits several at once.",
  sling: "A soft shot with pebbles. Face them and let fly.",
} as const;

/**
 * The trainer at the mine entrance (note 22): a human woman who hands over the
 * first weapon free and teaches the three families on request. Her name and
 * voice wait for the cast and dialogue notes. The farm is paused behind it.
 */
export class TrainerScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("trainer");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "The trainer", () => this.close());
    this.message = message;
    this.add
      .text(
        24,
        64,
        "Fighting is a choice here. Nobody has to. If you want a weapon, ask.\nThe dummy by the wall never hits back.",
        { fontSize: "18px", color: "#d8e8c8", wordWrap: { width: 760 } },
      )
      .setOrigin(0);
    this.menu = new Menu(this, {
      x: 24,
      y: 130,
      w: 600,
      title: "A weapon to start with, free",
      buttonsOnly: true,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const rows: Row[] = STARTERS.map((w) => ({
      label: w.name,
      detail: `${FAMILY_TALK[w.family]}  damage ${w.damage}`,
      dim: g.inventory.count(w.id) > 0,
      buttons: [
        {
          text: "Take",
          run: () => {
            const problem = takeStarter(g, w.id);
            this.message.setText(
              problem ?? `She hands you the ${w.name.toLowerCase()}.`,
            );
            this.refresh();
          },
        },
      ],
    }));
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
