import Phaser from "phaser";
import { itemById } from "../core/items";
import { buyReward, claimGoal, rewardShop, wallList } from "../core/slayerlist";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

const STATE_WORDS = {
  progress: "In progress",
  ready: "Ready to claim",
  claimed: "Claimed",
} as const;

/**
 * Maren's slayer wall list in the mine hall (note 22): twelve goals with the kills
 * so far, the reward and its state, and a second page that sells a met goal's
 * reward again. The farm is paused behind it.
 */
export class WallListScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;
  private page: "list" | "shop" = "list";

  constructor() {
    super("walllist");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.page = "list";
  }

  create(): void {
    const { message, money } = frame(this, "The wall list", () => this.close());
    this.message = message;
    this.money = money;
    this.menu = new Menu(this, {
      x: 24,
      y: 70,
      w: 880,
      title: "Slayer goals",
      buttonsOnly: true,
      visible: 8,
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    const switchRow: Row = {
      label:
        this.page === "list" ? "Maren's reward shop" : "Back to the wall list",
      detail:
        this.page === "list"
          ? "A reward you have earned can be bought again here."
          : "Goals, kills and rewards",
      buttons: [
        {
          text: this.page === "list" ? "Shop" : "List",
          run: () => {
            this.page = this.page === "list" ? "shop" : "list";
            this.refresh();
          },
        },
      ],
    };
    const rows = this.page === "list" ? this.listRows() : this.shopRows();
    this.menu.setRows([switchRow, ...rows]);
  }

  private listRows(): Row[] {
    const g = this.state;
    const none = g.combat.noCreatures
      ? "  (creatures are off, so none can be met)"
      : "";
    return wallList(g).map(({ goal, reward, state, kills }) => ({
      label: `${goal.name}  ${Math.min(kills, goal.goal)} of ${goal.goal}`,
      detail: `${reward ? `${reward.count > 1 ? `${reward.count} ` : ""}${reward.name}` : "?"}. ${STATE_WORDS[state]}${state === "progress" ? none : ""}`,
      dim: state !== "ready",
      buttons:
        state === "ready"
          ? [
              {
                text: "Claim",
                run: () => {
                  this.message.setText(
                    claimGoal(g, goal.id) ??
                      `Maren hands you ${reward?.name.toLowerCase() ?? "the reward"}.`,
                  );
                  this.refresh();
                },
              },
            ]
          : [],
    }));
  }

  private shopRows(): Row[] {
    const g = this.state;
    const sold = rewardShop(g);
    if (sold.length === 0)
      return [
        {
          label: "Nothing to sell yet",
          detail: "Meet a goal and its reward is sold here.",
          dim: true,
          buttons: [],
        },
      ];
    return sold.map((r) => ({
      label: r.name,
      detail: `${r.price}g`,
      dim: g.money < (r.price ?? 0),
      buttons: [
        {
          text: "Buy",
          run: () => {
            this.message.setText(
              buyReward(g, r.id) ??
                `Maren hands you the ${(itemById(r.id)?.name ?? r.name).toLowerCase()}.`,
            );
            this.refresh();
          },
        },
      ],
    }));
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
