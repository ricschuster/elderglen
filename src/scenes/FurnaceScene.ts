import Phaser from "phaser";
import { clockText } from "../core/clock";
import { collect, minutesLeft, ready, smelt } from "../core/furnace";
import { itemById } from "../core/items";
import { BARS, coalFor, ORE_PER_BAR } from "../core/ore";
import { reasonText } from "../core/tools";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";

/** Words for a span of game minutes, such as "2 h 30 min". */
function span(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`;
}

/**
 * The furnace the smith gave (note 22): put in 5 ore and 1 coal, wait in game
 * time, take the bar. One batch at a time. The farm is paused behind it.
 */
export class FurnaceScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super("furnace");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
  }

  create(): void {
    const { message } = frame(this, "Furnace", () => this.close());
    this.message = message;
    this.status = this.add.text(24, 430, "", {
      fontSize: "16px",
      color: "#ffffff",
    });
    this.add.text(24, 500, "Arrows: move   Enter: choose   Esc: close", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, { x: 24, y: 64, w: 600, title: "Smelt" });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    this.menu.setFocus(true);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private refresh(): void {
    const g = this.state;
    const left = minutesLeft(g);
    const job = g.furnace.job;
    this.status.setText(
      job === undefined
        ? "The furnace is empty."
        : ready(g)
          ? `A ${itemById(job.bar)?.name.toLowerCase()} is ready.`
          : `Smelting a ${itemById(job.bar)?.name.toLowerCase()}: ${span(left ?? 0)} left (it is ${clockText(g.day.clock.minutes)}).`,
    );
    const rows: Row[] = [];
    if (job)
      rows.push({
        label: ready(g) ? "Take the bar" : "Still smelting",
        dim: !ready(g),
        buttons: [
          {
            text: "Take",
            run: () => {
              const r = collect(g);
              this.say(
                r.ok
                  ? `You take a ${itemById(r.bar)?.name.toLowerCase()}.`
                  : reasonText(r.reason),
              );
            },
          },
        ],
      });
    for (const bar of BARS)
      rows.push({
        label: bar.name,
        detail: `${ORE_PER_BAR} ore, ${coalFor(bar)} coal, ${span(bar.minutes)}   have ${g.inventory.count(bar.ore)} ore`,
        dim: job !== undefined,
        buttons: [
          {
            text: "Smelt",
            run: () => {
              const why = smelt(g, bar.id);
              this.say(
                why
                  ? reasonText(why)
                  : `The furnace is lit. ${bar.name} in ${span(bar.minutes)}.`,
              );
            },
          },
        ],
      });
    this.menu.setRows(rows);
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
