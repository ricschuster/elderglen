import Phaser from "phaser";
import {
  chestById,
  contents,
  putIn,
  takeOut,
  type PlacedChest,
} from "../core/chests";
import { itemById } from "../core/items";
import { orderById } from "../core/orders";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * A chest's contents (note 34): the stacks inside to take, then the stacks in
 * the backpack to put in. Enter moves one, Space moves the whole stack. The
 * farm is paused behind this screen.
 */
export class ChestScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private chest!: PlacedChest;

  constructor() {
    super("chest");
  }

  init(data: { mapId: string; x: number; y: number }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    const c = this.state.chests.get(data.mapId, data.x, data.y);
    if (!c) throw new Error("no chest there");
    this.chest = c;
  }

  create(): void {
    const bound = this.chest.order ? orderById(this.chest.order) : undefined;
    const name = bound
      ? `${bound.title} chest${this.chest.closed ? " (ended)" : ""}`
      : (chestById(this.chest.id)?.name ?? "Chest");
    const { message } = frame(this, name, () => this.close());
    this.message = message;
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: move 1   Space: move all   Esc: close",
      {
        fontSize: "13px",
        color: "#ffffffaa",
      },
    );
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: name });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-SPACE", () => this.menu.press(1));
    this.menu.setFocus(true);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const c = this.chest;
    const nameOf = (id: string) => itemById(id)?.name ?? id;
    const rows: Row[] = contents(c).map(({ id, count }) => ({
      label: `Take: ${nameOf(id)}`,
      detail: `${count} inside`,
      buttons: [
        {
          text: "Take 1",
          run: () => this.say(`Took ${takeOut(g, c, id, 1) || "none"}.`),
        },
        {
          text: "Take all",
          run: () => this.say(`Took ${takeOut(g, c, id, count) || "none"}.`),
        },
      ],
    }));
    const pack = new Map<string, number>();
    for (let i = 0; i < g.inventory.size; i++) {
      const s = g.inventory.slot(i);
      if (s) pack.set(s.id, (pack.get(s.id) ?? 0) + s.count);
    }
    for (const [id, count] of pack)
      rows.push({
        label: `Put in: ${nameOf(id)}`,
        detail: `${count} in the pack`,
        buttons: [
          {
            text: "Put 1",
            run: () => this.say(`Put in ${putIn(g, c, id, 1) || "none"}.`),
          },
          {
            text: "Put all",
            run: () => this.say(`Put in ${putIn(g, c, id, count) || "none"}.`),
          },
        ],
      });
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
