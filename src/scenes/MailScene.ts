import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import { letterOf, nextLetter, openLetter } from "../core/mail";
import type { GameState } from "../core/save";
import { frame, Menu, TOUCH_ROW_H, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The mailbox reader (note 51). Using the mailbox opens the oldest waiting
 * letter as a card; closing the card ends the visit, so a pile is never forced.
 * With nothing waiting, or from the Letters button on the card, the list of kept
 * letters shows, newest first, and a row rereads one. A letter's gift is taken
 * once, when it is opened. The farm is paused behind it.
 */
export class MailScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private card: Phaser.GameObjects.GameObject[] = [];
  /** True when the visit began with a card, so closing it ends the visit. */
  private direct = false;

  constructor() {
    super("mailbox");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.card = [];
  }

  create(): void {
    this.message = frame(this, "Mailbox", () => this.close()).message;
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 600,
      title: "Letters",
      rowH: TOUCH_ROW_H,
      visible: 6,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.enter());
    kb?.on("keydown-SPACE", () => this.enter());
    this.menu.setFocus(true);
    const next = nextLetter(this.state);
    this.direct = next !== undefined;
    if (next) this.read(next);
    else this.list();
  }

  private enter(): void {
    if (this.card.length > 0) this.done();
    else this.menu.press(0);
  }

  private list(): void {
    this.direct = false;
    this.clearCard();
    const g = this.state;
    const rows: Row[] = g.mail.kept().map((e) => {
      const l = letterOf(e);
      const pending = e.state === "waiting" || e.state === "opened";
      const day = e.received ?? e.due;
      const { season, dayOfSeason } = dateOf(day);
      return {
        label: `${pending ? "* " : ""}${l?.title ?? e.id}`,
        detail: `${l?.sender ?? ""}  ${season} ${dayOfSeason}`,
        buttons: [{ text: "Read", run: () => this.read(e.id) }],
      };
    });
    if (rows.length === 0)
      rows.push({ label: "No letters yet.", dim: true, buttons: [] });
    this.menu.cursor = 0;
    this.menu.setRows(rows);
    this.message.setText("A * marks a letter with a gift still to take.");
  }

  private read(id: string): void {
    const result = openLetter(this.state, id);
    this.clearCard();
    if (!result.ok) {
      this.message.setText(result.reason);
      return this.list();
    }
    this.menu.setRows([]);
    const l = result.letter;
    this.card.push(
      this.add.text(40, 100, l.title, { fontSize: "28px", color: "#ffe9a0" }),
      this.add.text(40, 142, `From ${l.sender}`, {
        fontSize: "18px",
        color: "#ffffffaa",
      }),
      this.add.text(40, 184, l.body, {
        fontSize: "20px",
        color: "#d8e8c8",
        lineSpacing: 8,
        wordWrap: { width: 840 },
      }),
    );
    const a = l.attachment;
    const gift = result.gift.join("   ");
    if (a || gift)
      this.card.push(
        this.add.text(40, 380, gift ? `With it: ${gift}` : "", {
          fontSize: "20px",
          color: result.pending ? "#f2a08a" : "#f2d16b",
          wordWrap: { width: 840 },
        }),
      );
    this.card.push(
      this.add
        .rectangle(40, 430, 160, 48, 0x3f7d3a, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.done()),
      this.add
        .text(120, 454, "Done", { fontSize: "22px", color: "#ffffff" })
        .setOrigin(0.5),
      this.add
        .rectangle(220, 430, 160, 48, 0x4a5f7a, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.list()),
      this.add
        .text(300, 454, "Letters", { fontSize: "22px", color: "#ffffff" })
        .setOrigin(0.5),
    );
    this.message.setText("");
  }

  private clearCard(): void {
    for (const o of this.card) o.destroy();
    this.card = [];
  }

  /** Close the card: end the visit if it began with one, else back to the list. */
  private done(): void {
    if (this.direct) this.close();
    else this.list();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
