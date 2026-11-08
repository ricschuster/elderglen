import Phaser from "phaser";
import { reportLines, seasonNotice } from "../core/report";
import type { SleepReport } from "../core/sleep";
import { dateOf } from "../core/calendar";
import type { GameState } from "../core/save";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/** The morning report, drawn over the paused farm after every night. */
export class ReportScene extends Phaser.Scene {
  private report!: SleepReport;
  private state!: GameState;

  constructor() {
    super("report");
  }

  init(data: { report: SleepReport }): void {
    this.report = data.report;
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.94)
      .setInteractive();
    const { season, dayOfSeason, year } = dateOf(this.state.day.clock.day);
    this.add
      .text(480, 80, `Day ${this.state.day.clock.day}`, {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add
      .text(480, 122, `Year ${year}, ${season} ${dayOfSeason}`, {
        fontSize: "20px",
        color: "#ffe9a0",
      })
      .setOrigin(0.5);
    const notice = seasonNotice(this.report);
    if (notice) {
      this.add
        .text(480, 180, notice, { fontSize: "26px", color: "#f2d16b" })
        .setOrigin(0.5);
    }
    this.add
      .text(480, 290, reportLines(this.report).join("\n"), {
        fontSize: "20px",
        color: "#d8e8c8",
        align: "center",
        lineSpacing: 10,
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5);
    this.add
      .rectangle(480, 440, 240, 52, 0x3f7d3a, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close());
    this.add
      .text(480, 440, "Start the day", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    this.add
      .text(480, 500, "Enter: start the day", {
        fontSize: "13px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
