import Phaser from "phaser";
import { itemById } from "../core/items";
import type { SleepReport } from "../core/sleep";
import { WINDOW_FILL } from "./panel";

/** Item lines shown before "and N more". */
const SHOWN = 9;

/**
 * The shipping summary, shown after sleeping when the bin was not empty: each
 * item sold with its count and money, then the total. Continue opens the
 * morning report (`docs/design/28_shipping_bin.md`).
 */
export class ShippingScene extends Phaser.Scene {
  private report!: SleepReport;

  constructor() {
    super("shipping");
  }

  init(data: { report: SleepReport }): void {
    this.report = data.report;
  }

  create(): void {
    const { lines, total } = this.report.shipped;
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.96)
      .setInteractive();
    this.add
      .text(480, 50, "Shipped", { fontSize: "34px", color: "#ffffff" })
      .setOrigin(0.5);
    lines.slice(0, SHOWN).forEach((line, i) => {
      const y = 100 + i * 32;
      const name = itemById(line.id)?.name ?? line.id;
      this.add
        .text(250, y, `${name}  x${line.count}`, {
          fontSize: "20px",
          color: "#d8e8c8",
        })
        .setOrigin(0, 0.5);
      this.add
        .text(710, y, `${line.count * line.unit}g`, {
          fontSize: "20px",
          color: "#ffe9a0",
        })
        .setOrigin(1, 0.5);
    });
    if (lines.length > SHOWN)
      this.add
        .text(250, 100 + SHOWN * 32, `and ${lines.length - SHOWN} more`, {
          fontSize: "16px",
          color: "#ffffffaa",
        })
        .setOrigin(0, 0.5);
    this.add
      .text(480, 420, `Total  ${total}g`, {
        fontSize: "28px",
        color: "#f2d16b",
      })
      .setOrigin(0.5);
    this.add
      .rectangle(480, 478, 240, 48, 0x3f7d3a, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.next());
    this.add
      .text(480, 478, "Continue", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.next());
  }

  private next(): void {
    this.scene.stop();
    this.scene.launch("report", { report: this.report });
  }
}
