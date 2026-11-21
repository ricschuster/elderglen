import { audio } from "../audio/engine";
import Phaser from "phaser";
import {
  WEDDING_GUEST_SLOTS,
  WEDDING_START,
  weddingBeat,
  weddingLines,
} from "../core/marriagecard";
import { VILLAGERS } from "../core/villagers";
import { villagerKey } from "./art-people";
import { PLAYER_KEY } from "./placeholder-textures";
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
  private a!: Phaser.GameObjects.Image;
  private o!: Phaser.GameObjects.Image;
  private guests: Phaser.GameObjects.Image[] = [];

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
    this.stage();
    this.text = this.add
      .text(480, 120, "", {
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

  /** Placeholder staging: guests on the green, the couple offstage (they walk in on the first line). */
  private stage(): void {
    const sprite = (key: string, x: number): Phaser.GameObjects.Image =>
      this.add.image(x, 330, key).setOrigin(0.5, 0.875).setScale(3);
    this.guests = WEDDING_GUEST_SLOTS.map((x, i) =>
      sprite(villagerKey(VILLAGERS[i % VILLAGERS.length]!.id), x),
    );
    this.a = sprite(PLAYER_KEY, WEDDING_START.a);
    this.o = sprite(PLAYER_KEY, WEDDING_START.o)
      .setFlipX(true)
      .setTint(0xffd0e0);
  }

  /** Walk the couple to this line's marks; the joining line makes them hop. */
  private move(step: number): void {
    const b = weddingBeat(step);
    this.tweens.killTweensOf([this.a, this.o]);
    this.a.y = this.o.y = 330;
    this.tweens.add({ targets: this.a, x: b.a, duration: 900 });
    this.tweens.add({
      targets: this.o,
      x: b.o,
      duration: 900,
      onComplete: () => {
        if (!b.hop) return;
        for (const g of [this.a, this.o, ...this.guests])
          this.tweens.add({
            targets: g,
            y: g.y - 24,
            duration: 200,
            yoyo: true,
            repeat: 1,
          });
      },
    });
  }

  private next(): void {
    const line = this.lines[this.at++];
    if (line === undefined) {
      audio.sfx("marriage.accept");
      return this.finish();
    }
    this.text.setText(line);
    this.move(this.at - 1);
  }

  private finish(): void {
    const net = currentSession();
    if (net) sendWorldIntent(net, { kind: "wedding-seen" });
    this.scene.stop();
    this.scene.resume("farm");
  }
}
