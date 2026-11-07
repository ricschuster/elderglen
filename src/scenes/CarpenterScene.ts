import Phaser from "phaser";
import type { GameState } from "../core/save";
import {
  buyFurniture,
  dailyStock,
  furnitureProblem,
  stationStock,
} from "../core/furniture";
import { nextUpgrade, orderProblem, orderUpgrade, WOOD } from "../core/house";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The carpenter's counter, drawn over the sawmill. Orders the next house
 * upgrade and sells today's furniture. While the work is under way the counter is closed: the carpenter
 * is out at the farm. The sawmill is paused behind it.
 */
export class CarpenterScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("carpenter");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "Carpenter", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: order or buy   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 912,
      title: "House and furniture",
      buttonsOnly: true,
    });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-ESC", () => this.close());
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const cost = nextUpgrade(g.houseTier);
    const rows: Row[] = [];
    if (g.houseBuild) {
      this.message.setText("The carpenter is out at your farm, working.");
      rows.push({
        label: "Work on your house is under way",
        detail: `${g.houseBuild.daysLeft} days left`,
        dim: true,
        buttons: [],
      });
    } else if (!cost) {
      rows.push({
        label: "No more house upgrades yet",
        dim: true,
        buttons: [],
      });
    } else {
      rows.push({
        label: "Kitchen and bedroom",
        detail: `${cost.coin}g and ${cost.wood} wood (have ${g.inventory.count(WOOD)})`,
        buttons: [{ text: "Order", run: () => this.order() }],
      });
    }
    if (!g.houseBuild) {
      // Today's furniture: a random pick that changes each day.
      for (const f of [...stationStock(), ...dailyStock(g.day.clock.day)]) {
        rows.push({
          label: f.name,
          detail: `${f.price}g${f.rug ? "  (rug)" : ""}`,
          dim: furnitureProblem(g, f.id) !== undefined,
          buttons: [{ text: "Buy", run: () => this.buy(f.id) }],
        });
      }
    }
    this.menu.setRows(rows);
  }

  private buy(id: string): void {
    const problem = furnitureProblem(this.state, id);
    if (problem !== undefined) this.message.setText(problem);
    else if (buyFurniture(this.state, id))
      this.message.setText(
        "Bought. Hold it in the house and press Use to place it.",
      );
    this.refresh();
  }

  private order(): void {
    const problem = orderProblem(this.state);
    if (problem !== undefined) {
      this.message.setText(problem);
    } else {
      orderUpgrade(this.state);
      this.message.setText(
        "Ordered. The carpenter starts tomorrow and takes three days.",
      );
    }
    this.refresh();
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
