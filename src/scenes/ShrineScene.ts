import Phaser from "phaser";
import {
  MAX_CANDLES,
  evaluate,
  finishFirstScene,
  firstSceneBeats,
} from "../core/shrine";
import type { ShrineBeat } from "../core/shrine";
import type { GameState } from "../core/save";
import { resumeSave } from "./storage";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * The ancestors' evaluation (`docs/design/83_grandpa_shrine.md`, decisions 9
 * and 15). Two modes. "first": the long scene at the start of year 3, three
 * ancestors speak while the candles light one at a time, then a closing line;
 * ends with `finishFirstScene` (Oriel's letter goes in the post). "redo": a
 * Diamond was set in the shrine, the candles relight and one line shows.
 * Placeholder art (stand shapes and flames) and placeholder lines. Enter or a
 * tap advances.
 */
export interface ShrineSceneData {
  mode: "first" | "redo";
  /** The candles earned, scored by the caller for a redo. */
  candles?: number;
  /** The one line of a redo. */
  line?: string;
}

const STAND_X = [300, 420, 540, 660];

export class ShrineScene extends Phaser.Scene {
  private state!: GameState;
  private mode: "first" | "redo" = "first";
  private candles = 0;
  private line = "";
  private beats: ShrineBeat[] = [];
  private index = 0;
  private done = false;
  private speakerText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private flames: Phaser.GameObjects.Ellipse[] = [];

  constructor() {
    super("shrine");
  }

  init(data: ShrineSceneData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.mode = data?.mode ?? "first";
    // The first scene scores the farm as it stands when the scene opens.
    this.candles =
      this.mode === "first"
        ? evaluate(this.state)
        : (data?.candles ?? this.state.shrine.candles);
    this.line = data?.line ?? "";
    this.index = 0;
    this.done = false;
    this.flames = [];
  }

  create(): void {
    if (this.mode === "first") {
      this.beats = firstSceneBeats(this.candles);
    }
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x0c140f, 0.97)
      .setInteractive();
    this.add
      .text(480, 50, "The old tree", { fontSize: "30px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.drawShrine();
    this.speakerText = this.add
      .text(480, 330, "", { fontSize: "22px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.lineText = this.add
      .text(480, 400, "", {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5);
    this.add
      .text(480, 500, "Enter or tap: go on", {
        fontSize: "14px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.advance());
    this.input.on("pointerdown", () => this.advance());
    if (this.mode === "redo") {
      this.light(this.candles);
      this.lineText.setText(this.line);
    } else this.show();
  }

  /** The standing stone and four candle stands under a canopy, as plain shapes. */
  private drawShrine(): void {
    this.add.ellipse(480, 150, 640, 150, 0x1f3d24, 1);
    this.add
      .rectangle(480, 250, 60, 80, 0x8a8a92, 1)
      .setStrokeStyle(2, 0x55555c);
    STAND_X.forEach((x, i) => {
      const y = i % 3 === 0 ? 270 : 250;
      this.add.rectangle(x, y + 20, 14, 50, 0x6b4a2e, 1);
      this.add.rectangle(x, y - 8, 8, 16, 0xf0e6c8, 1);
      this.flames.push(
        this.add.ellipse(x, y - 24, 10, 16, 0xffc860, 1).setVisible(false),
      );
    });
  }

  private light(n: number): void {
    this.flames.forEach((f, i) => f.setVisible(i < Math.min(n, MAX_CANDLES)));
  }

  private show(): void {
    const beat = this.beats[this.index];
    if (!beat) return;
    this.speakerText.setText(`${beat.speaker}, ${beat.role}`);
    this.lineText.setText(beat.text);
    this.light(beat.lit);
  }

  private advance(): void {
    if (this.done) return;
    if (this.mode === "redo") return this.close();
    this.index += 1;
    if (this.index >= this.beats.length) return this.close();
    this.show();
  }

  private close(): void {
    this.done = true;
    if (this.mode === "first") finishFirstScene(this.state);
    resumeSave(this.state);
    this.scene.stop();
    this.scene.resume("farm");
  }
}
