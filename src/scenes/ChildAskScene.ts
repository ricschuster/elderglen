import Phaser from "phaser";
import { answerAsk, askText } from "../core/children";
import { saveGame, type GameState } from "../core/save";
import type { SleepReport } from "../core/sleep";
import { villagerById } from "../core/villagers";
import { browserStore } from "./storage";
import { frame, Menu } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The spouse's question after the player goes to bed (note 12, slice 5): would
 * you like a child, yes or not now. Never pressed: either answer is fine and
 * "not now" only waits a few days. Shown before the morning report, which it
 * hands on to. Placeholder text.
 */
export class ChildAskScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private report!: SleepReport;
  private shipping = false;

  constructor() {
    super("childask");
  }

  init(data: { report: SleepReport; shipping: boolean }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.report = data.report;
    this.shipping = data.shipping;
  }

  create(): void {
    const id = this.state.marriage.spouse ?? "";
    const name = villagerById(id)?.name ?? id;
    const { message } = frame(this, "Before the day begins", () =>
      this.answer(false, name),
    );
    message.setText(askText(name));
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: name,
      buttonsOnly: true,
    });
    this.menu.setRows([
      {
        label: "Yes",
        detail: "A child will join you in a few days",
        buttons: [{ text: "Yes", run: () => this.answer(true, name) }],
      },
      {
        label: "Not now",
        detail: "Nothing is lost. You can be asked again another time",
        buttons: [{ text: "Not now", run: () => this.answer(false, name) }],
      },
    ]);
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.answer(false, name));
  }

  private answer(yes: boolean, name: string): void {
    answerAsk(this.state, yes, name);
    saveGame(browserStore, this.state);
    this.scene.stop();
    // The farm is still paused: the report opens over it as it would have.
    this.scene.launch(this.shipping ? "shipping" : "report", {
      report: this.report,
    });
  }
}
