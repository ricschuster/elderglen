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
    "social",
    "Social",
    "Hearts for each neighbour, who you have spoken to today, and a gift log of the tastes you have learned. This page comes with the friendship screens.",
  ),
  new TabPageScene(
    "map",
    "Map",
    "A map of the valley with a marker for where you stand. Not drawn yet.",
  ),
  new TabPageScene(
    "animals",
    "Animals",
    "Your pets, horse and farm animals, with their hearts and whether you have petted them today. Not built yet.",
  ),
  new TabPageScene(
    "special",
    "Special Items",
    "Keys, charms and powers you have earned, and what each one does. Nothing here yet.",
  ),
];
