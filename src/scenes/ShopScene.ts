import Phaser from "phaser";
import { dateOf } from "../core/calendar";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { potPrice, sellMultiplier } from "../core/professions";
import { POT_ITEM } from "../core/pots";
import {
  buy,
  byName,
  sell,
  sellAll,
  seedStock,
  fertilizerStock,
  saplingStock,
  fisherStock,
  isOneOnly,
  pinStock,
} from "../core/shop";
import { buyFromTrader, traderPrice, traderStock } from "../core/trader";
import { nextBackpack, upgradeBackpack } from "../core/upgrades";
import { frame, Menu, TOUCH_ROW_H, type Row } from "./panel";
import { STATE_KEY } from "./state";

/** The price of one: the listed price, less the Trapper's pot discount. */
function unitPrice(g: GameState, id: string): number {
  const base = itemById(id)?.buyPrice ?? 0;
  return id === POT_ITEM ? potPrice(g.skills, base) : base;
}

/** Why a purchase was refused, in words for the player. */
function buyRefusal(g: GameState, id: string, n: number): string {
  const price = unitPrice(g, id);
  if (isOneOnly(id) && (n > 1 || g.inventory.count(id) > 0))
    return "She only has the one, and you carry it already.";
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
  /** The fisher's counter sells rods, bait and lures; the general store the rest (note 75). */
  private fisher = false;
  /** Thalwen's pin stall sells the Homeward pin only (note 09). */
  private pin = false;
  private trader = false;

  constructor() {
    super("shop");
  }

  init(data?: { stock?: "fisher" | "pin" | "trader" }): void {
    this.trader = data?.stock === "trader";
    this.fisher = data?.stock === "fisher";
    this.pin = data?.stock === "pin";
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.column = 0;
  }

  create(): void {
    const { money, message } = frame(
      this,
      this.fisher
        ? "Fisher"
        : this.pin
          ? "Thalwen"
          : this.trader
            ? "Road trader"
            : "Shop",
      () => this.close(),
    );
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
      rowH: TOUCH_ROW_H,
      visible: 7,
    });
    this.sellMenu = new Menu(this, {
      x: 490,
      y: 64,
      w: 446,
      title: "Sell",
      buttonsOnly: true,
      rowH: TOUCH_ROW_H,
      visible: 7,
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
    const stock = this.trader
      ? traderStock(g.day.clock.day)
      : this.pin
        ? pinStock()
        : this.fisher
          ? fisherStock()
          : [
              ...seedStock(season),
              ...saplingStock(),
              ...fertilizerStock(g.day.clock.day),
            ];
    const buyRows: Row[] = stock.map((id) => {
      const def = itemById(id)!;
      const price = this.trader ? traderPrice(id) : unitPrice(g, id);
      const tryBuy = (n: number) => () => {
        if (
          this.trader
            ? buyFromTrader(g, id, n)
            : buy(g.inventory, g, id, n, price)
        )
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
    this.buyMenu.setRows(
      this.fisher || this.pin || this.trader ? buyRows : [...buyRows, packRow],
    );

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
