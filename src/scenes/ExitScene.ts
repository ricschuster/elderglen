import Phaser from "phaser";
import { frame } from "./panel";

/**
 * The Exit tab (note 49): back to the title. The day in progress is not saved
 * yet (the resume record of note 52 is not built), so it asks twice and says
 * what is lost, as Stardew's exit does.
 */
export class ExitScene extends Phaser.Scene {
  private asked = false;
  private label!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;

  constructor() {
    super("exit");
  }

  init(): void {
    this.asked = false;
  }

  create(): void {
    frame(this, "Exit", () => undefined);
    this.add.text(48, 96, "Exit", { fontSize: "30px", color: "#ffe9a0" });
    this.add.text(
      48,
      150,
      "Go back to the title screen. The game is saved each night when you sleep. Anything you do before then is lost if you leave now.",
      { fontSize: "20px", color: "#ffffff", wordWrap: { width: 840 } },
    );
    this.add
      .rectangle(48, 280, 300, 56, 0xa0482e, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.press());
    this.label = this.add
      .text(198, 308, "Exit to title", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    this.note = this.add.text(48, 360, "", {
      fontSize: "18px",
      color: "#ffe9a0",
    });
    this.input.keyboard?.on("keydown-ENTER", () => this.press());
  }

  private press(): void {
    if (!this.asked) {
      this.asked = true;
      this.label.setText("Press again to leave");
      this.note.setText("Today's progress since you last slept will be lost.");
      return;
    }
    this.scene.stop("menu");
    this.scene.stop("farm");
    this.scene.start("title");
  }
}
