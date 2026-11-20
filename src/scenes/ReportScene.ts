import Phaser from "phaser";
import { reportLines, seasonNotice } from "../core/report";
import type { SleepReport } from "../core/sleep";
import { dateOf } from "../core/calendar";
import type { GameState } from "../core/save";
import { marriageReportLines } from "../core/playermarriage";
import { currentSession, HostSession, playerNameOf } from "../net/session";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/** The morning report, drawn over the paused farm after every night. */
export class ReportScene extends Phaser.Scene {
  private report: SleepReport | undefined;
  /** A guest's report arrives as words from the host (the `night` message). */
  private guestLines: string[] | undefined;
  private day: number | undefined;
  private state!: GameState;

  constructor() {
    super("report");
  }

  init(data: { report?: SleepReport; lines?: string[]; day?: number }): void {
    this.report = data.report;
    this.day = data.day;
    this.guestLines = data.lines;
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  /** The engaged notice and a told divorce, in a multiplayer game (note 12). */
  private marriageLines(): string[] {
    const net = currentSession();
    if (!net) return [];
    return marriageReportLines(
      this.state.playerMarriage,
      net.localId,
      this.state.day.clock.day,
      (id) => playerNameOf(net, id),
      net instanceof HostSession ? net.world.lastDivorces : [],
      net instanceof HostSession ? net.world.lastWeddings : [],
    );
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.94)
      .setInteractive();
    // A guest's copy of the farm may not hold the new day yet: the night news carries it.
    const day = this.day ?? this.state.day.clock.day;
    const { season, dayOfSeason, year } = dateOf(day);
    this.add
      .text(480, 80, `Day ${day}`, {
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
    const notice = this.report ? seasonNotice(this.report) : undefined;
    if (notice) {
      this.add
        .text(480, 180, notice, { fontSize: "26px", color: "#f2d16b" })
        .setOrigin(0.5);
    }
    this.add
      .text(
        480,
        290,
        (this.report
          ? [...reportLines(this.report), ...this.marriageLines()]
          : (this.guestLines ?? [])
        ).join("\n"),
        {
          fontSize: "20px",
          color: "#d8e8c8",
          align: "center",
          lineSpacing: 10,
          wordWrap: { width: 760 },
        },
      )
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
    // The steward's call is owed a scene (note 39, step 4): the stub takes it.
    if (this.state.summit.scenePending) this.scene.launch("summit");
    // The ancestors' evaluation, owed from year 3 (note 83).
    else if (this.state.shrine.pending)
      this.scene.launch("shrine", { mode: "first" });
    else this.scene.resume("farm");
  }
}
