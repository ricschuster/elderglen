import Phaser from "phaser";
import {
  askText,
  ORDERS_INTRO,
  handInTally,
  orderChest,
  orderById,
  progressOf,
} from "../core/orders";
import type { GameState } from "../core/save";
import { afterLastSeat } from "../core/yeartwo";
import type { Intent } from "../core/protocol";
import { frame, Menu, type Row } from "./panel";
import { itemById } from "../core/items";
import { STATE_KEY } from "./state";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";

/**
 * The Special Orders board (note 65). The first time, a short scene opens it on
 * Fall 2 of year one. After that it lists the posted orders to take, the ones
 * taken (with a way to drop them) and any rewards waiting. The farm is paused
 * behind it.
 */
export class OrdersScene extends Phaser.Scene {
  private state!: GameState;
  private intro = false;
  private menu?: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("orders");
  }

  init(data?: { intro?: boolean }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.intro = data?.intro === true;
  }

  create(): void {
    const { message } = frame(this, "Orders Board", () => this.close());
    this.message = message;
    const kb = this.input.keyboard;
    if (this.intro) {
      this.add
        .text(480, 140, ORDERS_INTRO.join("\n\n"), {
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 760 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(480, 500, "Enter: read the board   Esc: close", {
          fontSize: "13px",
          color: "#ffffffaa",
        })
        .setOrigin(0.5);
      const next = () => this.scene.restart({ intro: false });
      this.add
        .rectangle(480, 440, 240, 52, 0x3f7d3a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", next);
      this.add
        .text(480, 440, "Read the board", {
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      kb?.once("keydown-ENTER", next);
      return;
    }
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: take, drop or collect   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 900,
      title: "Posted this week",
      rowH: 58,
      visible: 6,
    });
    kb?.on("keydown-UP", () => this.menu?.move(-1));
    kb?.on("keydown-DOWN", () => this.menu?.move(1));
    kb?.on("keydown-ENTER", () => this.menu?.press(0));
    this.menu.setFocus(true);
    // A guest's actions go to the host; the board redraws when its answer arrives (note 108 group 4).
    followGuest(
      this,
      () => this.refresh(),
      (text) => this.message.setText(text),
    );
    closeWhenDone(this);
    this.refresh();
  }

  /** Send an action through the dispatcher. `done` is the line when it worked; a guest's answer comes later. */
  private act(intent: Intent, done: string): void {
    const why = dispatch(this.state, intent);
    if (why === "sent") return;
    this.say(why ?? done);
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const day = g.day.clock.day;
    const o = g.orders;
    const rows: Row[] = [];
    for (const def of o.board(day, afterLastSeat(g)))
      rows.push({
        label: `${def.title}${o.timesDone(def.id) > 0 ? "" : `\nFirst time also: ${def.firstReward.text}`}`,
        detail: `${askText(def)}. ${def.windowDays} days, ${def.gold}g`,
        buttons: [
          {
            text: "Take",
            run: () =>
              this.act(
                { kind: "order-take", id: def.id },
                `You took ${def.title}.`,
              ),
          },
        ],
      });
    if (rows.length === 0)
      rows.push({
        label: "Nothing new is posted.",
        dim: true,
        buttons: [],
      });
    for (const a of o.active) {
      const def = orderById(a.id);
      if (!def) continue;
      rows.push({
        label: `Taken: ${def.title}  ${
          def.ask.kind === "hand-in"
            ? handInTally(def, orderChest(g, def)).progress
            : progressOf(def, a)
        } of ${def.ask.count}`,
        detail: `${askText(def)}. ${Math.max(a.due - day + 1, 0)} days left.`,
        buttons: [
          {
            text: "Drop",
            run: () =>
              this.act(
                { kind: "order-drop", id: a.id },
                `You dropped ${def.title}. It costs nothing.`,
              ),
          },
        ],
      });
    }
    for (const r of o.owed.filter(
      (w) => w.to === undefined || w.to === g.players.localId,
    ))
      rows.push({
        label: `Reward waiting: ${r.count} ${itemById(r.id)?.name ?? r.id}`,
        buttons: [
          {
            text: "Collect",
            run: () =>
              this.act({ kind: "order-collect" }, "You collected your reward."),
          },
        ],
      });
    this.menu?.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
