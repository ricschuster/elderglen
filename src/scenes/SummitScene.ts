import Phaser from "phaser";
import { SUMMIT_SCENE } from "../core/summit";
import {
  hatColor,
  summitBeatsAfterChoice,
  summitBeatsBeforeChoice,
  summitCast,
  type SummitBeat,
} from "../core/summitscene";
import { saveGame, type GameState } from "../core/save";
import { browserStore } from "./storage";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * The summit scene (note 39, build step 4): the Long Table, everyone in their
 * usual hat, the steward's toast, Old Greencoat, the household lines and the
 * player's one choice of how to take the toast. Placeholder lines come from
 * `src/content/summit.json`. Launched by `ReportScene` while
 * `state.summit.scenePending` is set. Ends with `summit.finish()`, a save and
 * play resuming on the farm (step 5). Enter or a tap advances.
 */
export class SummitScene extends Phaser.Scene {
  private state!: GameState;
  private beats: SummitBeat[] = [];
  private index = 0;
  private done = false;
  private speakerText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private choiceObjs: Phaser.GameObjects.GameObject[] = [];
  private figures: Phaser.GameObjects.Rectangle[] = [];
  private castNames: string[] = [];

  constructor() {
    super("summit");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.beats = summitBeatsBeforeChoice();
    this.index = 0;
    this.done = false;
    this.choiceObjs = [];
    this.figures = [];
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.96)
      .setInteractive();
    this.add
      .text(480, 50, SUMMIT_SCENE.sceneTitle, {
        fontSize: "34px",
        color: "#ffe9a0",
      })
      .setOrigin(0.5);
    this.drawTable();
    this.speakerText = this.add
      .text(480, 290, "", { fontSize: "22px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.lineText = this.add
      .text(480, 350, "", {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5);
    this.hint = this.add
      .text(480, 500, "Enter or tap: go on", {
        fontSize: "14px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.advance());
    this.input.on("pointerdown", () => this.advance());
    this.show();
  }

  /** The household in two rows of small figures, each in a usual hat. */
  private drawTable(): void {
    const cast = summitCast();
    this.castNames = cast.map((p) => p.name);
    const perRow = Math.ceil(cast.length / 2);
    this.add.rectangle(480, 190, 800, 24, 0x6b4a2e, 1);
    cast.forEach((p, i) => {
      const row = i < perRow ? 0 : 1;
      const col = row === 0 ? i : i - perRow;
      const x = 480 + (col - (perRow - 1) / 2) * 44;
      const y = row === 0 ? 135 : 235;
      this.add.rectangle(x, y + 10, 26, 28, 0xd8b890, 1);
      const hat = Phaser.Display.Color.HexStringToColor(hatColor(p.hat)).color;
      this.figures.push(
        this.add
          .rectangle(x, y - 10, 30, 12, hat, 1)
          .setStrokeStyle(1, 0x000000, 0),
      );
    });
  }

  private highlight(speaker: string | undefined): void {
    this.figures.forEach((f, i) =>
      f.setStrokeStyle(2, 0xffffff, this.castNames[i] === speaker ? 1 : 0),
    );
  }

  private show(): void {
    const beat = this.beats[this.index];
    if (!beat) return;
    for (const o of this.choiceObjs) o.destroy();
    this.choiceObjs = [];
    if (beat.kind === "line") {
      this.speakerText.setText(beat.speaker);
      this.lineText.setText(beat.text);
      this.highlight(beat.speaker);
      this.hint.setVisible(true);
      return;
    }
    this.speakerText.setText("How do you take the toast?");
    this.lineText.setText("");
    this.highlight(undefined);
    this.hint.setVisible(false);
    beat.options.forEach((opt, i) => {
      const y = 360 + i * 56;
      const box = this.add
        .rectangle(480, y, 560, 44, 0x3f7d3a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on(
          "pointerdown",
          (
            _p: unknown,
            _x: unknown,
            _y: unknown,
            e: Phaser.Types.Input.EventData,
          ) => {
            e.stopPropagation();
            this.choose(opt.id);
          },
        );
      const label = this.add
        .text(480, y, `${i + 1}. ${opt.label}`, {
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.choiceObjs.push(box, label);
    });
    this.input.keyboard?.once("keydown-ONE", () => this.pick(0));
    this.input.keyboard?.once("keydown-TWO", () => this.pick(1));
    this.input.keyboard?.once("keydown-THREE", () => this.pick(2));
  }

  private pick(i: number): void {
    const beat = this.beats[this.index];
    if (beat?.kind === "choice" && beat.options[i])
      this.choose(beat.options[i].id);
  }

  private choose(id: string): void {
    const beat = this.beats[this.index];
    if (beat?.kind !== "choice") return;
    this.beats = [
      ...this.beats.slice(0, this.index),
      ...summitBeatsAfterChoice(id),
    ];
    this.show();
  }

  private advance(): void {
    if (this.done) return;
    const beat = this.beats[this.index];
    if (!beat || beat.kind === "choice") return;
    this.index += 1;
    if (this.index >= this.beats.length) {
      this.close();
      return;
    }
    this.show();
  }

  /** Step 5: the scene is played, so play resumes. */
  private close(): void {
    this.done = true;
    this.state.summit.finish();
    saveGame(browserStore, this.state);
    this.scene.stop();
    this.scene.resume("farm");
  }
}
