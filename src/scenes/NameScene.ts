import Phaser from "phaser";
import {
  DEFAULT_HORSE_NAME,
  NAME_MAX,
  nameHorse,
  typeName,
} from "../core/horse";
import type { GameState } from "../core/save";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm'-"];
const KEY_W = 64;
const KEY_H = 52;
const GAP = 8;

/**
 * Names the horse on the first ride (`docs/design/59_horse.md`). A modal with an
 * on-screen keyboard, so it works by touch and mouse, and a physical keyboard
 * types into it as well. Done with nothing typed, or Esc, takes "Clover". The
 * farm is paused behind it and resumes when it closes.
 */
export class NameScene extends Phaser.Scene {
  private text = "";
  private shown!: Phaser.GameObjects.Text;

  constructor() {
    super("name-horse");
  }

  init(): void {
    this.text = "";
  }

  create(): void {
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.92)
      .setInteractive();
    this.add
      .text(480, 50, "Name your horse", { fontSize: "34px", color: "#ffe9a0" })
      .setOrigin(0.5);
    this.add
      .text(
        480,
        92,
        `Up to ${NAME_MAX} letters. Leave it empty for ${DEFAULT_HORSE_NAME}.`,
        { fontSize: "16px", color: "#ffffffcc" },
      )
      .setOrigin(0.5);
    this.add
      .rectangle(480, 150, 440, 56, 0x1c2c24, 1)
      .setStrokeStyle(2, 0xffffff, 0.8);
    this.shown = this.add
      .text(480, 150, "", { fontSize: "30px", color: "#ffffff" })
      .setOrigin(0.5);
    ROWS.forEach((row, r) => {
      const w = row.length * (KEY_W + GAP) - GAP;
      [...row].forEach((ch, i) =>
        this.key(
          480 - w / 2 + KEY_W / 2 + i * (KEY_W + GAP),
          230 + r * (KEY_H + GAP),
          KEY_W,
          ch,
          0x3a4a5a,
          () => this.press(ch),
        ),
      );
    });
    const y = 230 + 3 * (KEY_H + GAP);
    this.key(260, y, 150, "Space", 0x3a4a5a, () => this.press(" "));
    this.key(430, y, 150, "Delete", 0xa0482e, () => this.press("Backspace"));
    this.key(640, y, 200, "Done", 0x3f7d3a, () => this.done());
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") return this.done();
      if (e.key === "Escape") {
        this.text = "";
        return this.done();
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.press(e.key);
    });
    this.refresh();
  }

  private key(
    x: number,
    y: number,
    w: number,
    label: string,
    color: number,
    run: () => void,
  ): void {
    this.add
      .rectangle(x, y, w, KEY_H, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x, y, label, { fontSize: "24px", color: "#ffffff" })
      .setOrigin(0.5);
  }

  private press(key: string): void {
    this.text = typeName(this.text, key);
    this.refresh();
  }

  private refresh(): void {
    this.shown.setText(this.text === "" ? "|" : `${this.text}|`);
  }

  private done(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    nameHorse(g, this.text);
    this.scene.stop();
    this.scene.resume("farm");
  }
}
