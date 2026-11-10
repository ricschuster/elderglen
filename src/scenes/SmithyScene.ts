import Phaser from "phaser";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { crackGeode, CRACK_FEE, GEODE_KINDS } from "../core/geodes";
import { sell, sellAll } from "../core/shop";
import {
  collectUpgrade,
  orderProblem,
  orderReady,
  orderUpgrade,
  TIER_NAMES,
  UPGRADABLE,
  UPGRADE_BARS,
  upgradeBar,
  upgradeCost,
} from "../core/upgrades";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The Hearthwell smithy counter (notes 44, 69 and 77): tool upgrades and
 * geode cracking. Ore, coal and weapons are the dwarf's (`SmithScene`). The
 * farm is paused behind this screen.
 */
export class SmithyScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("smithy");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { money, message } = frame(this, "The smithy", () => this.close());
    this.money = money;
    this.message = message;
    this.add.text(24, 500, "Arrows: move   Enter: choose   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 600,
      title: "Tools and geodes",
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
    const rows: Row[] = [];
    for (const kind of GEODE_KINDS) {
      const have = g.inventory.count(kind);
      if (have < 1) continue;
      const def = itemById(kind)!;
      rows.push({
        label: `Crack a ${def.name.toLowerCase()}`,
        detail: `${CRACK_FEE}g  have ${have}`,
        buttons: [
          {
            text: "Crack",
            run: () => {
              const r = crackGeode(g, Math.random, kind);
              this.say(
                r.ok
                  ? `It splits open: ${r.count} ${itemById(r.item ?? "")?.name.toLowerCase()}.`
                  : r.reason === "backpack full"
                    ? "Your backpack is full."
                    : "Not enough money.",
              );
            },
          },
        ],
      });
      rows.push({
        label: `Sell a ${def.name.toLowerCase()}`,
        detail: `${def.sellPrice}g  have ${have}`,
        buttons: [
          {
            text: "Sell 1",
            run: () => this.say(`Sold for ${sell(g.inventory, g, kind, 1)}g.`),
          },
          {
            text: "Sell all",
            run: () => this.say(`Sold for ${sellAll(g.inventory, g, kind)}g.`),
          },
        ],
      });
    }
    if (GEODE_KINDS.every((k) => g.inventory.count(k) < 1))
      rows.push({
        label: "Crack or sell a geode",
        detail: "You have none",
        dim: true,
        buttons: [],
      });
    rows.push(...this.toolRows());
    this.menu.setRows(rows);
  }

  /** The tool upgrade rows: hand a tool over, or collect it (note 44). */
  private toolRows(): Row[] {
    const g = this.state;
    const names = {
      hoe: "Hoe",
      can: "Watering can",
      pickaxe: "Pickaxe",
      axe: "Axe",
    };
    const order = g.toolOrder;
    const rows: Row[] = [];
    if (order && orderReady(g))
      rows.push({
        label: `Your ${names[order.tool].toLowerCase()} is ready`,
        detail: TIER_NAMES[order.tier] ?? "",
        buttons: [
          {
            text: "Collect",
            run: () => {
              const tool = collectUpgrade(g);
              this.say(
                tool
                  ? `Your ${names[tool].toLowerCase()} is now ${TIER_NAMES[g.toolTiers[tool]]?.toLowerCase()}.`
                  : "Nothing to collect.",
              );
            },
          },
        ],
      });
    else if (order)
      rows.push({
        label: `${names[order.tool]} at the forge`,
        detail: `Ready on day ${order.readyDay}`,
        dim: true,
        buttons: [],
      });
    for (const tool of UPGRADABLE) {
      const tier = g.toolTiers[tool];
      const cost = upgradeCost(tier);
      const bar = upgradeBar(tier);
      const label = `${names[tool]} (${TIER_NAMES[tier]})`;
      if (cost === undefined || bar === undefined) {
        rows.push({ label, detail: "Best", dim: true, buttons: [] });
        continue;
      }
      rows.push({
        label,
        detail: `${TIER_NAMES[tier + 1]}: ${cost > 0 ? `${cost}g and ` : ""}${UPGRADE_BARS} ${itemById(bar)?.name.toLowerCase()}s`,
        dim: orderProblem(g, tool) !== undefined,
        buttons: [
          {
            text: "Hand over",
            run: () =>
              this.say(
                orderUpgrade(g, tool) ??
                  `She will have it back in two days (day ${g.toolOrder?.readyDay}).`,
              ),
          },
        ],
      });
    }
    return rows;
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
