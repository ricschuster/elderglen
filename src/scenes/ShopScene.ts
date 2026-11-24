import { audio } from "../audio/engine";
import Phaser from "phaser";
import type { Intent } from "../core/protocol";
import { currentSession, GuestSession } from "../net/session";
import { closeWhenDone, followGuest } from "./guestlive";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { sellMultiplier } from "../core/professions";
import { byName, sell, sellAll } from "../core/shop";
import { SELLER_NAME } from "../core/courtship";
import {
  offerIds,
  offerPrice,
  shopBuy,
  type ShopStock,
} from "../core/shopoffers";
import { nextBackpack, upgradeBackpack } from "../core/upgrades";
import { frame, Menu, TOUCH_ROW_H, type Row } from "./panel";
import { STATE_KEY } from "./state";

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
  /** The rain peddler sells the promise token only (note 12). */
  private rain = false;
  /** The hermit sells one elderfruit, at a very high price (note 39). */
  private hermit = false;
  private herb = false;

  constructor() {
    super("shop");
  }

  /** The special counter this screen shows, if any. */
  private stockName: ShopStock | undefined;

  init(data?: { stock?: ShopStock }): void {
    this.stockName = data?.stock;
    this.hermit = data?.stock === "hermit";
    this.trader = data?.stock === "trader";
    this.rain = data?.stock === "rain";
    this.herb = data?.stock === "herb";
    this.fisher = data?.stock === "fisher";
    this.pin = data?.stock === "pin";
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.column = 0;
  }

  create(): void {
    followGuest(
      this,
      () => this.refresh(),
      (t) => this.say(t),
    );
    closeWhenDone(this);
    const { money, message } = frame(
      this,
      this.fisher
        ? "Fisher"
        : this.pin
          ? "Thalwen"
          : this.rain
            ? SELLER_NAME
            : this.trader
              ? "Road trader"
              : this.hermit
                ? "Hermit"
                : this.herb
                  ? "Old Greencoat"
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

  /**
   * A guest's buy or sell becomes an intent for the host; the shop redraws when the `applied`
   * comes back. True when this was a guest's click (handled), so the caller stops. The backpack
   * stays with the host for now.
   */
  private guestAsks(intent: Intent | undefined): boolean {
    const net = currentSession();
    if (!(net instanceof GuestSession)) return false;
    if (!intent) this.say("Only the host can do that for now.");
    else net.sendIntent(intent);
    return true;
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const stock = offerIds(g, this.stockName);
    const buyRows: Row[] = stock.map((id) => {
      const def = itemById(id)!;
      const price = offerPrice(g, this.stockName, id);
      const tryBuy = (n: number) => () => {
        if (this.guestAsks({ kind: "buy", id, n, stock: this.stockName }))
          return;
        const refused = shopBuy(g, this.stockName, id, n);
        if (refused === undefined) {
          audio.sfx("money.buy");
          this.say(
            this.hermit
              ? `Bought an elderfruit for ${price}g and ate it.`
              : `Bought ${n} ${def.name} for ${price * n}g.`,
          );
        } else {
          audio.sfx("ui.error");
          this.say(refused);
        }
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
                this.guestAsks(undefined) ||
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
      this.fisher ||
        this.pin ||
        this.trader ||
        this.rain ||
        this.hermit ||
        this.herb
        ? buyRows
        : [...buyRows, packRow],
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
              if (this.guestAsks({ kind: "sell", id, n: 1 })) return;
              const earned = sell(g.inventory, g, id, 1, mult);
              g.cave.addEarnings(earned, g.day.clock.day + 1);
              audio.sfx("money.sell");
              this.say(`Sold 1 ${def?.name} for ${earned}g.`);
            },
          },
          {
            text: "Sell all",
            run: () => {
              if (this.guestAsks({ kind: "sell", id, n: count })) return;
              const earned = sellAll(g.inventory, g, id, mult);
              g.cave.addEarnings(earned, g.day.clock.day + 1);
              audio.sfx("money.sell");
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
