import { fertilizerById } from "../core/fertilizer";
import Phaser from "phaser";
import type { GameState } from "../core/save";
import {
  finishBuild,
  giveItem,
  giveMoney,
  giveXp,
  refillEnergy,
  setWeather,
  stepHouseTier,
} from "../core/debug";
import { allItems } from "../core/items";
import { QUALITIES, withQuality, type Quality } from "../core/quality";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The dev-only debug menu (`42_debug_menu.md`), drawn over the paused farm.
 * It is registered only in dev builds. A top list of tools, and an item picker
 * behind one of the rows.
 */
export class DebugScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private picker = false;
  private quality: Quality = "normal";

  constructor() {
    super("debug");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.picker = false;
    this.quality = "normal";
  }

  create(): void {
    const { money, message } = frame(this, "Debug menu", () => this.back());
    this.money = money;
    this.message = message;
    this.add.text(
      24,
      500,
      "Arrows: move   1-4: press button   Esc: back or close   (dev builds only)",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.menu = new Menu(this, { x: 24, y: 64, w: 912, title: "Tools" });
    this.menu.setFocus(true);
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    ["ONE", "TWO", "THREE", "FOUR"].forEach((key, n) =>
      kb?.on(`keydown-${key}`, () => this.menu.press(n)),
    );
    this.refresh();
  }

  /** Esc: leave the item picker, or close the menu from the top list. */
  private back(): void {
    if (this.picker) {
      this.picker = false;
      this.message.setText("");
      this.refresh();
      return;
    }
    this.scene.stop();
    this.scene.resume("farm");
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    this.menu.setRows(this.picker ? this.pickerRows() : this.toolRows());
  }

  private toolRows(): Row[] {
    const g = this.state;
    const money = (n: number) => ({
      text: `${n > 0 ? "+" : ""}${n.toLocaleString("en")}`,
      run: () => {
        giveMoney(g, n);
        this.say("");
      },
    });
    const xp = (skill: "farming" | "foraging" | "mining") => ({
      text: `+100 ${skill}`,
      run: () => {
        const level = giveXp(g, skill, 100);
        this.say(level ? `${skill} is now level ${level}.` : "");
      },
    });
    const build = g.houseBuild;
    return [
      {
        label: "Money",
        buttons: [
          money(100),
          money(1000),
          money(10000),
          {
            text: "Set 0",
            run: () => {
              giveMoney(g, -g.money);
              this.say("");
            },
          },
        ],
      },
      {
        label: "Items",
        detail: "wood, seeds, crops, forage",
        buttons: [
          {
            text: "Open",
            run: () => {
              this.picker = true;
              this.menu.cursor = 0;
              this.message.setText("");
              this.refresh();
            },
          },
        ],
      },
      {
        label: "Skill XP",
        buttons: [xp("farming"), xp("foraging"), xp("mining")],
      },
      {
        label: "Day",
        detail: "runs the normal sleep",
        buttons: [
          {
            text: "Next morning",
            run: () => {
              this.scene.stop();
              this.scene.resume("farm", { sleep: true });
            },
          },
        ],
      },
      {
        label: "Weather today",
        detail: g.weather,
        buttons: [
          {
            text: "Sunny",
            run: () => {
              setWeather(g, "sunny");
              this.say("");
            },
          },
          {
            text: "Rainy",
            run: () => {
              setWeather(g, "rainy");
              this.say("");
            },
          },
          {
            text: "Storm",
            run: () => {
              setWeather(g, "stormy");
              this.say("");
            },
          },
        ],
      },
      {
        label: "House",
        detail: build
          ? `tier ${g.houseTier}, building tier ${build.tier} (${build.daysLeft} days left)`
          : `tier ${g.houseTier}`,
        buttons: [
          {
            text: "Tier -",
            run: () => {
              stepHouseTier(g, -1);
              this.say("");
            },
          },
          {
            text: "Tier +",
            run: () => {
              stepHouseTier(g, 1);
              this.say("");
            },
          },
          {
            text: "Finish build",
            enabled: build !== undefined,
            run: () => {
              finishBuild(g);
              this.say("The new rooms are open.");
            },
          },
        ],
      },
      {
        label: "Energy",
        detail: `${Math.ceil(g.day.energy.current)}`,
        buttons: [
          {
            text: "Refill",
            run: () => {
              refillEnergy(g);
              this.say("");
            },
          },
        ],
      },
    ];
  }

  private pickerRows(): Row[] {
    const g = this.state;
    const next = QUALITIES[(QUALITIES.indexOf(this.quality) + 1) % 3]!;
    const rows: Row[] = [
      {
        label: `Quality: ${this.quality}`,
        detail: "applies to the rows below",
        buttons: [
          {
            text: `Switch to ${next}`,
            run: () => {
              this.quality = next;
              this.say("");
            },
          },
        ],
      },
    ];
    const give = (id: string, n: number) => ({
      text: `+${n}`,
      run: () => {
        const result = giveItem(g, id, n);
        this.say(
          result === "ok"
            ? ""
            : result === "full"
              ? "No room in the backpack."
              : "Unknown item.",
        );
      },
    });
    for (const item of allItems()) {
      // Only goods have a quality; seeds, wood and sap do not.
      const id = this.hasQuality(item.id)
        ? withQuality(item.id, this.quality)
        : item.id;
      rows.push({
        label: item.name,
        detail: `held ${g.inventory.count(id)}`,
        buttons: [give(id, 1), give(id, 10), give(id, 100)],
      });
    }
    return rows;
  }

  /** Crops and forage carry a quality; seeds, wood and sap do not. */
  private hasQuality(id: string): boolean {
    return (
      !id.endsWith("-seed") &&
      id !== "wood" &&
      id !== "sap" &&
      id !== "fiber" &&
      !fertilizerById(id)
    );
  }
}
