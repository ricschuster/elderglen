import Phaser from "phaser";
import { frame } from "./panel";

/**
 * A menu tab with nothing to show yet (note 49): a short "not yet" page, so the
 * tab strip already has its final shape. One instance per tab.
 */
export class TabPageScene extends Phaser.Scene {
  constructor(
    key: string,
    private readonly title: string,
    private readonly text: string,
  ) {
    super(key);
  }

  create(): void {
    frame(this, this.title, () => undefined);
    this.add.text(48, 96, this.title, { fontSize: "30px", color: "#ffe9a0" });
    this.add.text(48, 150, this.text, {
      fontSize: "20px",
      color: "#ffffff",
      wordWrap: { width: 840 },
      lineSpacing: 8,
    });
  }
}

/** The placeholder tabs, in tab order. */
export const PLACEHOLDER_TABS: TabPageScene[] = [
  new TabPageScene(
    "map",
    "Map",
    "A map of the valley with a marker for where you stand. Not drawn yet.",
  ),
];
