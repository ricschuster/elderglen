import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { sellMultiplier } from "../core/professions";
import {
  buy,
  byName,
  sell,
  sellAll,
  seedStock,
  fertilizerStock,
  saplingStock,
} from "../core/shop";
import { nextBackpack, upgradeBackpack } from "../core/upgrades";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/** Why a purchase was refused, in words for the player. */
function buyRefusal(g: GameState, id: string, n: number): string {
  const price = itemById(id)?.buyPrice ?? 0;
  if (g.money < price * n) return "Not enough money.";
  return "Your backpack is full.";
}

/**
 * The shop screen, drawn over the farm. Buy seeds on the left, sell what the
 * backpack holds on the right. The farm is paused while it is open, so the
 * day clock stands still.
 */
export class ShopScene extends Phaser.Scene {
  private state!: GameState;
  private buyMenu!: Menu;
  private sellMenu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private column: 0 | 1 = 0;

  constructor() {
    super("shop");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.column = 0;
  }

  create(): void {
    const { money, message } = frame(this, "Shop", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: buy 1 / sell 1   Space: buy 5 / sell all   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.buyMenu = new Menu(this, {
      x: 24,
      y: 64,
      w: 450,
      title: "Buy",
      buttonsOnly: true,
    });
    this.sellMenu = new Menu(this, {
      x: 490,
      y: 64,
      w: 446,
      title: "Sell",
      buttonsOnly: true,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.active.move(-1));
    kb?.on("keydown-DOWN", () => this.active.move(1));
    kb?.on("keydown-LEFT", () => this.focus(0));
    kb?.on("keydown-RIGHT", () => this.focus(1));
    kb?.on("keydown-ENTER", () => this.active.press(0));
    kb?.on("keydown-SPACE", () => this.active.press(1));
    this.focus(0);
  }

  private get active(): Menu {
    return this.column === 0 ? this.buyMenu : this.sellMenu;
  }

  private focus(column: 0 | 1): void {
    this.column = column;
    this.buyMenu.setFocus(column === 0);
    this.sellMenu.setFocus(column === 1);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const season = dateOf(g.day.clock.day).season;
    const stock = [
      ...seedStock(season),
      ...saplingStock(),
      ...fertilizerStock(g.day.clock.day),
    ];
    const buyRows: Row[] = stock.map((id) => {
      const def = itemById(id)!;
      const price = def.buyPrice ?? 0;
      const tryBuy = (n: number) => () => {
        if (buy(g.inventory, g, id, n))
          this.say(`Bought ${n} ${def.name} for ${price * n}g.`);
        else this.say(buyRefusal(g, id, n));
      };
      return {
        label: def.name,
        detail: `${price}g  have ${g.inventory.count(id)}`,
        buttons: [
          { text: "Buy 1", run: tryBuy(1) },
          { text: "Buy 5", run: tryBuy(5) },
        ],
      };
    });
    const pack = nextBackpack(g.inventory);
    const packRow: Row = pack
      ? {
          label: `Backpack (${g.inventory.size} slots)`,
          detail: `${pack.size} slots: ${pack.cost}g`,
          buttons: [
            {
              text: "Upgrade",
              run: () =>
                this.say(
                  upgradeBackpack(g.inventory, g)
                    ? `Your backpack now holds ${pack.size} things.`
                    : "Not enough money.",
                ),
            },
          ],
        }
      : {
          label: `Backpack (${g.inventory.size} slots)`,
          detail: "Biggest",
          dim: true,
          buttons: [],
        };
    this.buyMenu.setRows([...buyRows, packRow]);

    const ids: string[] = [];
    for (let i = 0; i < g.inventory.size; i++) {
      const slot = g.inventory.slot(i);
      if (slot && !ids.includes(slot.id)) ids.push(slot.id);
    }
    const sellRows: Row[] = byName(ids).map((id) => {
      const def = itemById(id);
      const count = g.inventory.count(id);
      const mult = sellMultiplier(g.skills, id);
      return {
        label: `${def?.name ?? id}  x${count}`,
        detail: `${Math.floor((def?.sellPrice ?? 0) * mult)}g`,
        dim: !def,
        buttons: [
          {
            text: "Sell 1",
            run: () => {
              const earned = sell(g.inventory, g, id, 1, mult);
              g.cave.addEarnings(earned, g.day.clock.day + 1);
              this.say(`Sold 1 ${def?.name} for ${earned}g.`);
            },
          },
          {
            text: "Sell all",
            run: () => {
              const earned = sellAll(g.inventory, g, id, mult);
              g.cave.addEarnings(earned, g.day.clock.day + 1);
              this.say(`Sold ${count} ${def?.name} for ${earned}g.`);
            },
          },
        ],
      };
    });
    this.sellMenu.setRows(sellRows);
    if (sellRows.length === 0)
      this.sellMenu.setRows([
        { label: "Nothing to sell.", dim: true, buttons: [] },
      ]);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
