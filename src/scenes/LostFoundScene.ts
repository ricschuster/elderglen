import Phaser from "phaser";
import { lostItemsFor, lostName } from "../core/lostfound";
import type { GameState } from "../core/save";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The lost and found box in the village hall (note 110): the things of a player whose cabin the host demolished
 * wait here. One press takes what fits into the pack; the rest stays. The farm is paused behind it.
 */
export class LostFoundScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;

  constructor() {
    super("lostfound");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message, money } = frame(this, "Lost and found", () =>
      this.close(),
    );
    this.message = message;
    this.money = money;
    this.menu = new Menu(this, {
      x: 24,
      y: 70,
      w: 880,
      title: "Waiting for you",
      buttonsOnly: true,
      visible: 8,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    followGuest(
      this,
      () => this.refresh(),
      (text) => this.message.setText(text),
    );
    closeWhenDone(this);
    this.refresh();
  }

  private take(): void {
    const why = dispatch(this.state, { kind: "lostfound-take" });
    if (why !== "sent")
      this.message.setText(why ?? "You take your things back.");
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const items = lostItemsFor(g, g.players.localId);
    const rows: Row[] =
      items.length === 0
        ? [
            {
              label: "Nothing of yours is here",
              detail: "Things from a demolished cabin wait here.",
              dim: true,
              buttons: [],
            },
          ]
        : [
            {
              label: "Take everything",
              detail: "what fits goes into your pack",
              buttons: [{ text: "Take", run: () => this.take() }],
            },
            ...items.map((s) => ({
              label: `${lostName(s.id)}  x${s.count}`,
              dim: true,
              buttons: [],
            })),
          ];
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
