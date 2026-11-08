import Phaser from "phaser";
import { SKILLS } from "../core/skills";
import { dateOf } from "../core/calendar";
import { newGame, saveGame, type GameState } from "../core/save";
import { browserStore } from "./storage";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * Shown once, when the last bundle is handed in. Placeholder text: the feast
 * scene is settled in `09_story_and_lore.md` and comes with the cast in M3. The
 * player can keep playing or start over.
 */
export class EndScene extends Phaser.Scene {
  private state!: GameState;

  constructor() {
    super("end");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const g = this.state;
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 1)
      .setInteractive();
    this.add
      .text(480, 90, "The valley is restored", {
        fontSize: "38px",
        color: "#ffe9a0",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 150, "Every bundle is complete. Thank you for playing.", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const { year, season, dayOfSeason } = dateOf(g.day.clock.day);
    const lines = [
      `Days played: ${g.day.clock.day}`,
      `Date: year ${year}, ${season} ${dayOfSeason}`,
      `Money: ${g.money}g`,
      ...SKILLS.map((k) => `${k}: level ${g.skills.level(k)}`),
    ];
    this.add
      .text(480, 270, lines.join("\n"), {
        fontSize: "22px",
        color: "#d8e8c8",
        lineSpacing: 8,
        align: "center",
      })
      .setOrigin(0.5);
    this.button(340, 440, "Keep playing", 0x3f7d3a, () => this.resume());
    this.button(620, 440, "Start over", 0xa0482e, () => this.startOver());
    this.add
      .text(480, 500, "Enter: keep playing", {
        fontSize: "13px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.resume());
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
  ): void {
    this.add
      .rectangle(x, y, 220, 52, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }

  /** Replace the save with a new game and reload, so every scene resets. */
  private startOver(): void {
    saveGame(browserStore, newGame());
    location.href = `${location.pathname}?new`;
  }
}
