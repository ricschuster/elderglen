import Phaser from "phaser";
import type { GameState } from "../core/save";
import { COPPER_ORE } from "../core/ore";
import { handOverCopper } from "../core/smith";
import { buyBoots, buyWeapon, FORGED, weaponPrice } from "../core/combat";
import {
  LIFE_ELIXIR,
  MINERS_TREAT,
  MINERS_TREAT_ENERGY,
  OIL_OF_GARLIC,
  itemById,
} from "../core/items";
import { BOMBS } from "../core/bombs";
import { buy } from "../core/shop";
import { BOOTS } from "../core/equipment";
import { oreRows } from "./ore-rows";
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
    // She sells ore and coal and buys raw ore for coin (note 74).
    const rows: Row[] = oreRows(g, (text) => this.say(text));
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
    rows.push(...this.weaponRows(), ...this.bootsRows(), ...this.bombRows());
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

  /** Boots for coin (placeholder source, note 37). */
  private bootsRows(): Row[] {
    const g = this.state;
    return BOOTS.map((b) => ({
      label: b.name,
      detail: `${b.price}g, defense ${b.defense}, immunity ${b.immunity}`,
      dim:
        g.money < b.price ||
        g.inventory.count(b.id) > 0 ||
        g.equipment.wornBoots() === b.id,
      buttons: [
        {
          text: "Buy",
          run: () =>
            this.say(
              buyBoots(g, b.id) ?? `She hands you ${b.name.toLowerCase()}.`,
            ),
        },
      ],
    }));
  }

  /** The three bombs, for coin (note 89, Stardew's Forge prices as placeholders). */
  private bombRows(): Row[] {
    const g = this.state;
    return BOMBS.map((b) => ({
      label: b.name,
      detail: `${b.price}g, blast ${b.radius} tile${b.radius === 1 ? "" : "s"}, you carry ${g.inventory.count(b.id)}`,
      dim: g.money < b.price,
      buttons: [
        {
          text: "Buy",
          run: () =>
            this.say(
              buy(g.inventory, g, b.id)
                ? `She hands you a ${b.name.toLowerCase()}.`
                : "You cannot afford it, or your pack is full.",
            ),
        },
      ],
    }));
  }

  /** Life Elixir, Miner's Treat and Oil of Garlic (note 89), for coin. */
  private goodsRows(): Row[] {
    const g = this.state;
    const what: Record<string, string> = {
      [LIFE_ELIXIR]: "health to full",
      [MINERS_TREAT]: `${MINERS_TREAT_ENERGY} energy`,
      [OIL_OF_GARLIC]: "weaker monsters ignore you for the day",
    };
    return [LIFE_ELIXIR, MINERS_TREAT, OIL_OF_GARLIC].map((id) => {
      const def = itemById(id)!;
      return {
        label: def.name,
        detail: `${def.buyPrice}g, ${what[id]}, you carry ${g.inventory.count(id)}`,
        dim: g.money < (def.buyPrice ?? 0),
        buttons: [
          {
            text: "Buy",
            run: () =>
              this.say(
                buy(g.inventory, g, id)
                  ? `She hands you ${def.name.toLowerCase()}.`
                  : "You cannot afford it, or your pack is full.",
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
