import Phaser from "phaser";
import { frame } from "./panel";

/**
 * The Exit tab (note 49, note 52): saves the day in progress, then goes to the
 * title. Continue picks the day up where it was, so no confirm is needed.
 */
export class ExitScene extends Phaser.Scene {
  constructor() {
    super("exit");
  }

  create(): void {
    frame(this, "Exit", () => undefined);
    this.add.text(48, 96, "Exit", { fontSize: "30px", color: "#ffe9a0" });
    this.add.text(
      48,
      150,
      "Save the day as it stands and go back to the title screen. Continue picks it up where you left off.",
      { fontSize: "20px", color: "#ffffff", wordWrap: { width: 840 } },
    );
    this.add
      .rectangle(48, 280, 300, 56, 0xa0482e, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.press());
    this.add
      .text(198, 308, "Save and exit", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    this.input.keyboard?.on("keydown-ENTER", () => this.press());
  }

  private press(): void {
    (this.scene.get("farm") as unknown as { save(): void }).save();
    this.scene.stop("menu");
    this.scene.stop("farm");
    this.scene.start("title");
  }
}
