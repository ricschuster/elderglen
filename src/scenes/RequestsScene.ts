import Phaser from "phaser";
import { daysLeft, ready, turnIn, wantText, type Quest } from "../core/quests";
import type { GameState } from "../core/save";
import { frame, Menu, TOUCH_ROW_H, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The request board at the general store (note 50), and the list of open
 * requests. At the board: the day's offers with Accept, then each open request
 * with Hand in (or Done, for a gathering) and Cancel. From the hat box only
 * the open list shows, with the counter, days left and Cancel. Every action is
 * a button; nothing needs a drag. The farm is paused behind it.
 */
export class RequestsScene extends Phaser.Scene {
  private state!: GameState;
  private listOnly = false;
  private menu!: Menu;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("requests");
  }

  init(data?: { list?: boolean }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.listOnly = data?.list === true;
  }

  create(): void {
    this.message = frame(
      this,
      this.listOnly ? "Open Requests" : "Request Board",
      () => this.close(),
    ).message;
    this.add.text(
      24,
      500,
      this.listOnly
        ? "Arrows: move   Enter: cancel   Esc: close"
        : "Arrows: move   Enter: accept or hand in   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.menu = new Menu(this, {
      x: 24,
      y: 64,
      w: 900,
      title: this.listOnly ? "Your requests" : "Posted today",
      rowH: TOUCH_ROW_H + 6,
      visible: 6,
      buttonsOnly: true,
    });
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
    const day = g.day.clock.day;
    const rows: Row[] = [];
    if (!this.listOnly)
      for (const q of g.quests.posted(day))
        rows.push({
          label: wantText(q),
          detail: `${q.reward.gold}g. ${daysLeft(q, day)} day${daysLeft(q, day) === 1 ? "" : "s"} left.`,
          buttons: [
            {
              text: "Accept",
              run: () => {
                g.quests.accept(q.id, day);
                this.say("You took the request.");
              },
            },
          ],
        });
    for (const q of g.quests.open()) rows.push(this.openRow(q, day));
    if (rows.length === 0)
      rows.push({
        label: this.listOnly
          ? "You have no open requests."
          : "Nothing is posted.",
        dim: true,
        buttons: [],
      });
    this.menu.setRows(rows);
  }

  private openRow(q: Quest, day: number): Row {
    const g = this.state;
    const counter =
      q.type === "gathering" ? ` (${q.progress} of ${q.want.count})` : "";
    const left = daysLeft(q, day);
    const row: Row = {
      label: `${wantText(q)}${counter}`,
      detail: `${q.reward.gold}g. ${left} day${left === 1 ? "" : "s"} left.${ready(g, q) ? " Ready." : ""}`,
      buttons: [],
    };
    if (!this.listOnly)
      row.buttons.push({
        text: q.type === "gathering" ? "Done" : "Hand in",
        run: () => {
          const r = turnIn(g, q.id, day);
          this.say(r.ok ? `The request is done. ${r.gold}g paid.` : r.reason);
        },
      });
    row.buttons.push({
      text: "Cancel",
      run: () => {
        g.quests.cancel(q.id);
        this.say("You gave the request up. It costs nothing.");
      },
    });
    return row;
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
  }
}
