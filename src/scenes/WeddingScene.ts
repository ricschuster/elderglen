import { audio } from "../audio/engine";
import Phaser from "phaser";
import { weddingLines } from "../core/marriagecard";
import type { GameState } from "../core/save";
import { currentSession, playerNameOf, sendWorldIntent } from "../net/session";
import { WINDOW_FILL } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The wedding of two players as a driven cutscene: a few placeholder lines, one per press, over
 * the paused farm. It plays on every client after night 3; walking away is not possible but
 * Esc skips it. Ends by sending `wedding-seen` so it does not play again. Untested in a browser.
 */
export class WeddingScene extends Phaser.Scene {
  private lines: string[] = [];
  private at = 0;
  private text!: Phaser.GameObjects.Text;

  constructor() {
    super("wedding");
  }

  create(): void {
    const state = this.registry.get(STATE_KEY) as GameState;
    const net = currentSession();
    const me = net?.localId ?? state.players.localId;
    this.lines = weddingLines(state.playerMarriage, me, (id) =>
      playerNameOf(net, id),
    );
    this.at = 0;
    audio.sfx("wedding.bells");
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 0.96)
      .setInteractive()
      .on("pointerdown", () => this.next());
    this.text = this.add
      .text(480, 270, "", {
        fontSize: "26px",
        color: "#ffe9a0",
        align: "center",
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5);
    this.add
      .text(480, 500, "Enter: go on   Esc: skip", {
        fontSize: "14px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    const kb = this.input.keyboard;
    kb?.on("keydown-ENTER", () => this.next());
    kb?.on("keydown-SPACE", () => this.next());
    kb?.on("keydown-ESC", () => this.finish());
    this.next();
  }

  private next(): void {
    const line = this.lines[this.at++];
    if (line === undefined) {
      audio.sfx("marriage.accept");
      return this.finish();
    }
    this.text.setText(line);
  }

  private finish(): void {
    const net = currentSession();
    if (net) sendWorldIntent(net, { kind: "wedding-seen" });
    this.scene.stop();
    this.scene.resume("farm");
  }
}
