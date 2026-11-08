import Phaser from "phaser";
import { festivalToday } from "../core/festivals";
import type { GameState } from "../core/save";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * Asked when the player uses the bed: go to sleep now, or not. The farm is
 * paused behind it. Yes hands the farm a sleep request when it resumes.
 */
export class BedScene extends Phaser.Scene {
  constructor() {
    super("bed");
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.8)
      .setInteractive();
    this.add
      .text(480, 200, "Go to sleep?", { fontSize: "36px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.add
      .text(480, 250, this.forecast(), {
        fontSize: "18px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5);
    this.button(340, 340, "Yes", 0x3f7d3a, () => this.close(true));
    this.button(620, 340, "No", 0xa0482e, () => this.close(false));
    this.add
      .text(480, 500, "Enter: yes   Esc: no", {
        fontSize: "13px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    const kb = this.input.keyboard;
    kb?.on("keydown-ENTER", () => this.close(true));
    kb?.on("keydown-ESC", () => this.close(false));
  }

  /** Tomorrow's weather, as Stardew's TV forecast gives it. */
  private forecast(): string {
    const g = this.registry.get(STATE_KEY) as GameState;
    const f = festivalToday(g.day.clock.day + 1);
    const festival = f ? `\nTomorrow is the ${f.name}.` : "";
    return `The day ends and the night passes.\nForecast for tomorrow: ${g.tomorrow === "rainy" ? "rain" : g.tomorrow === "snowy" ? "snow" : "clear skies"}.${festival}`;
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
  ): void {
    this.add
      .rectangle(x, y, 220, 60, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, text, { fontSize: "24px", color: "#ffffff" })
      .setOrigin(0.5);
  }

  private close(sleep: boolean): void {
    this.scene.stop();
    this.scene.resume("farm", { sleep });
  }
}
