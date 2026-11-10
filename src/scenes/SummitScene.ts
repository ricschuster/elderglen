import Phaser from "phaser";
import { SUMMIT_TEXT } from "../core/summit";
import { saveGame, type GameState } from "../core/save";
import { browserStore } from "./storage";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * STUB for the summit scene (note 39, build step 4). Launched by `ReportScene`
 * while `state.summit.scenePending` is set, after the steward's call. Replace
 * the body of `create` with the real scene (the toast, Old Greencoat, the
 * household, the player's one choice) and keep the ending: `summit.finish()`,
 * save, then `scene.resume("farm")`.
 */
export class SummitScene extends Phaser.Scene {
  private state!: GameState;

  constructor() {
    super("summit");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.94)
      .setInteractive();
    this.add
      .text(480, 200, SUMMIT_TEXT.callTitle, {
        fontSize: "32px",
        color: "#ffe9a0",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 280, "The summit scene is not built yet.", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 400, "Enter: go on", { fontSize: "16px", color: "#ffffffaa" })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.close());
    this.input.once("pointerdown", () => this.close());
  }

  private close(): void {
    this.state.summit.finish();
    saveGame(browserStore, this.state);
    this.scene.stop();
    this.scene.resume("farm");
  }
}
