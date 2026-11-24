import Phaser from "phaser";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { CRACK_FEE, GEODE_KINDS } from "../core/geodes";
import {
  orderProblem,
  orderOf,
  orderReady,
  TIER_NAMES,
  UPGRADABLE,
  UPGRADE_BARS,
  upgradeBar,
  upgradeCost,
} from "../core/upgrades";
import { oreRows } from "./ore-rows";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";
import type { Intent } from "../core/protocol";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";

/**
 * The Hearthwell smithy counter (notes 44, 69 and 77): tool upgrades, geode
 * cracking, and ore and coal at the dwarf's prices (owner, 2026-11-10, as
 * Stardew's blacksmith). Nobody here buys a geode uncracked (owner answer 7).
 * Weapons and the furnace gift are the dwarf's (`SmithScene`). The farm is
 * paused behind this screen.
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
    this.add.text(
      24,
      500,
      "Arrows: move   Enter: first button   Space: second   Esc: close",
      {
        fontSize: "13px",
        color: "#ffffffaa",
      },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 600,
      title: "Tools, geodes and ore",
      buttonsOnly: true,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-SPACE", () => this.menu.press(1));
    this.menu.setFocus(true);
    followGuest(
      this,
      () => this.refresh(),
      (text) => this.message.setText(text),
    );
    closeWhenDone(this);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  /** Send an action through the dispatcher (note 108 group 5). `done` is the line when it worked; a guest's answer comes later. */
  private act(intent: Intent, done: string): void {
    const why = dispatch(this.state, intent);
    if (why === "sent") return;
    this.say(why ?? done);
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
            run: () =>
              this.act(
                { kind: "smithy-crack", geode: kind },
                `It splits open: ${def.name.toLowerCase()} cracked.`,
              ),
          },
        ],
      });
    }
    if (GEODE_KINDS.every((k) => g.inventory.count(k) < 1))
      rows.push({
        label: "Crack a geode",
        detail: "You have none",
        dim: true,
        buttons: [],
      });
    rows.push(...this.toolRows());
    rows.push(...oreRows(g, (i, done) => this.act(i, done)));
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
    const order = orderOf(g);
    const rows: Row[] = [];
    if (order && orderReady(g))
      rows.push({
        label: `Your ${names[order.tool].toLowerCase()} is ready`,
        detail: TIER_NAMES[order.tier] ?? "",
        buttons: [
          {
            text: "Collect",
            run: () =>
              this.act(
                { kind: "smithy-collect" },
                `Your ${names[order.tool].toLowerCase()} is now ${TIER_NAMES[order.tier]?.toLowerCase()}.`,
              ),
          },
        ],
      });
    else if (order)
      rows.push({
        label: `${names[order.tool]} at the smithy`,
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
              this.act(
                { kind: "smithy-tool", tool },
                "It will be ready in two days.",
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
