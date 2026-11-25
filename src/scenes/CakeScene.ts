import Phaser from "phaser";
import { cakeDishes, cakeProblem, handInCake } from "../core/cakeday";
import { itemById, itemLabel } from "../core/items";
import { splitQuality } from "../core/quality";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";
import { currentSession } from "../net/session";
import { festivalAsk } from "./farm-festival-net";

/**
 * The Cake Day table (note 82): pick which cooked dish from the pack goes on
 * the table, one a year. Rows and buttons only, so it works on a tablet.
 */
export class CakeScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("cake");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "Cake Day table", () => this.close());
    this.message = message;
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.refresh();
  }

  private refresh(): void {
    const dishes = cakeDishes(this.state);
    const rows: Row[] = dishes.map((id) => {
      const { quality } = splitQuality(id);
      return {
        label: itemById(id)?.name ?? id,
        detail: `${quality}, you have ${this.state.inventory.count(id)}`,
        buttons: [{ text: "Put on table", run: () => this.give(id) }],
      };
    });
    if (rows.length === 0)
      rows.push({
        label:
          cakeProblem(this.state, "") === "Your dish is already on the table."
            ? "Your dish is already on the table."
            : "You have no cooked dish to put on the table.",
        buttons: [],
      });
    // With other players the table is shared: anyone may ask for the tasting, and a missing dish makes it poor.
    if (currentSession())
      rows.push({
        label: "Taste the cakes now",
        detail: "Players with no dish on the table make it the poor one.",
        buttons: [
          {
            text: "Taste",
            run: () =>
              festivalAsk(currentSession(), { kind: "cake-taste" }, (why) =>
                this.message.setText(why ?? "Everyone tastes the cake."),
              ),
          },
        ],
      });
    this.menu.setRows(rows);
  }

  private give(id: string): void {
    const net = currentSession();
    if (net) {
      festivalAsk(net, { kind: "cake-give", item: id }, (why) => {
        if (why !== undefined) return this.message.setText(why);
        this.message.setText(
          `Your ${itemLabel(id, "dish")} is on the table. Everyone tastes once every dish is in.`,
        );
        this.time.delayedCall(1600, () => this.close());
      });
      return;
    }
    const r = handInCake(this.state, id);
    if (!r) return this.refresh();
    this.message.setText(
      `Everyone tastes your ${itemLabel(id, "dish")} (${r.quality}). They like you a little more.`,
    );
    this.refresh();
    this.time.delayedCall(1600, () => this.close());
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
