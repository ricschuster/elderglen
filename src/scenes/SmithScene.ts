import Phaser from "phaser";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { buy } from "../core/shop";
import { COPPER_ORE, ORES } from "../core/ore";
import { sell, sellAll } from "../core/shop";
import { handOverCopper, SMITH_STOCK } from "../core/smith";
import { buyWeapon, FORGED, weaponPrice } from "../core/combat";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The smith dwarf's counter in the forge hut (notes 22 and 74): she sells and
 * buys ore, sells coal (never bars) and sells the forged weapon tiers for coin.
 * The first copper ore handed to her makes her bring a furnace the next
 * morning. Tool upgrades and geodes are the Hearthwell smithy's. The farm is
 * paused behind this screen.
 */
export class SmithScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("smith");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "The smith", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: buy 1   Space: buy 5   Esc: close",
      {
        fontSize: "13px",
        color: "#ffffffaa",
      },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 600,
      title: "Ore, coal and weapons",
      buttonsOnly: true,
    });
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
    this.money.setText(`Money ${g.money}g`);
    const rows: Row[] = SMITH_STOCK.map((id) => {
      const def = itemById(id)!;
      const price = def.buyPrice ?? 0;
      const tryBuy = (n: number) => () =>
        this.say(
          buy(g.inventory, g, id, n)
            ? `Bought ${n} ${def.name.toLowerCase()} for ${price * n}g.`
            : g.money < price * n
              ? "Not enough money."
              : "Your backpack is full.",
        );
      return {
        label: def.name,
        detail: `${price}g  have ${g.inventory.count(id)}`,
        buttons: [
          { text: "Buy 1", run: tryBuy(1) },
          { text: "Buy 5", run: tryBuy(5) },
        ],
      };
    });
    // The dwarf also buys raw ore for coin (note 74).
    for (const o of ORES) {
      const have = g.inventory.count(o.id);
      if (have < 1) continue;
      rows.push({
        label: `Sell ${o.name.toLowerCase()}`,
        detail: `${o.sellPrice}g  have ${have}`,
        buttons: [
          {
            text: "Sell 1",
            run: () => this.say(`Sold for ${sell(g.inventory, g, o.id, 1)}g.`),
          },
          {
            text: "Sell all",
            run: () => this.say(`Sold for ${sellAll(g.inventory, g, o.id)}g.`),
          },
        ],
      });
    }
    if (!g.mines.copperHandedIn)
      rows.push({
        label: "Show her a copper ore",
        detail: "She will bring a furnace",
        dim: g.inventory.count(COPPER_ORE) < 1,
        buttons: [
          {
            text: "Hand over",
            run: () =>
              this.say(
                handOverCopper(g)
                  ? "She turns it over and grins. Look by your house tomorrow."
                  : "You have no copper ore.",
              ),
          },
        ],
      });
    rows.push(...this.weaponRows());
    this.menu.setRows(rows);
  }

  /** The forged tiers, sold for coin (owner, 2026-11-09). Forging is off for now. */
  private weaponRows(): Row[] {
    const g = this.state;
    return FORGED.map((w) => {
      const price = weaponPrice(w);
      return {
        label: w.name,
        detail: `${price}g, damage ${w.damage}`,
        dim: g.money < price || g.inventory.count(w.id) > 0,
        buttons: [
          {
            text: "Buy",
            run: () =>
              this.say(
                buyWeapon(g, w.id) ??
                  `She hands you a ${w.name.toLowerCase()}.`,
              ),
          },
        ],
      };
    });
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
