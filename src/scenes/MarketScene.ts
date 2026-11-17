import Phaser from "phaser";
import { counterName, type CounterEntry } from "../core/festivals";
import {
  buyAtStall,
  marketClosedLine,
  marketProblem,
  marketStock,
  stallName,
  type Stall,
} from "../core/nightmarket";
import { claimHotDrink, drinkProblem } from "../core/marketpier";
import type { GameState } from "../core/save";
import { frame, Menu, TOUCH_ROW_H } from "./panel";
import { STATE_KEY } from "./state";

/**
 * One Winter Night Market stall (note 14), opened from a `market-stall` service
 * on the Hearthwell square. A plain buy list with placeholder art: closed lines
 * before 17:00 and after midnight, otherwise the evening's stock. Rules live in
 * `core/nightmarket.ts`.
 */
export interface MarketData {
  stall: Stall;
}

export class MarketScene extends Phaser.Scene {
  private state!: GameState;
  private stall: Stall = "lantern";
  private menu?: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("market");
  }

  init(data?: MarketData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.stall = data?.stall ?? "lantern";
  }

  create(): void {
    const { money, message } = frame(this, stallName(this.stall), () =>
      this.close(),
    );
    this.money = money;
    this.message = message;
    const closed = marketClosedLine(
      this.state.day.clock.day,
      this.state.day.clock.minutes,
    );
    this.refresh();
    if (closed) {
      this.message.setText(closed);
      this.input.keyboard?.on("keydown-ENTER", () => this.close());
      return;
    }
    this.add.text(24, 500, "Arrows: move   Enter: buy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 700,
      title: "For sale",
      buttonsOnly: true,
      rowH: TOUCH_ROW_H,
      visible: 7,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu?.move(-1));
    kb?.on("keydown-DOWN", () => this.menu?.move(1));
    kb?.on("keydown-ENTER", () => this.menu?.press(0));
    this.refresh();
  }

  private buy(e: CounterEntry): void {
    const why = marketProblem(this.state, this.stall, e);
    if (why === undefined && buyAtStall(this.state, this.stall, e))
      this.message.setText(`You buy the ${counterName(e)}.`);
    else this.message.setText(why ?? "");
    this.refresh();
  }

  /** The road trader's free hot drink, once an evening (note 14, attraction 1). */
  private drink(): void {
    this.message.setText(claimHotDrink(this.state).line);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    if (!this.menu) return;
    const drink =
      this.stall === "trader"
        ? [
            {
              label: "Hot drink",
              detail: "free, once an evening",
              dim: drinkProblem(g) !== undefined,
              buttons: [{ text: "Take", run: () => this.drink() }],
            },
          ]
        : [];
    this.menu.setRows([
      ...drink,
      ...marketStock(this.stall, g.day.clock.day).map((e) => ({
        label: counterName(e),
        detail: `${e.price}g`,
        dim: marketProblem(g, this.stall, e) !== undefined,
        buttons: [{ text: "Buy", run: () => this.buy(e) }],
      })),
    ]);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
