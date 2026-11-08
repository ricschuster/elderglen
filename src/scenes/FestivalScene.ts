import Phaser from "phaser";
import {
  buyAtCounter,
  counterName,
  counterProblem,
  type CounterEntry,
  enterFestival,
  type Festival,
  enterProblem,
  FESTIVAL_RETURN,
  festivalToday,
  leaveFestival,
} from "../core/festivals";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import {
  TABLE_SIZE,
  groupOf,
  judge,
  judgeProblem,
  judgedThisYear,
  scoreTable,
  showTokens,
} from "../core/showing";
import { clockText } from "../core/clock";
import { frame, Menu } from "./panel";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/**
 * Today's festival, drawn over the farm. As in Stardew, time stands still
 * while the player is here, and leaving puts them back outside at 10 pm. It first asks, since
 * leaving cannot be undone. The prize counter and the festival game are hooks:
 * a festival lists them in its data and they show here once it has any.
 */
/**
 * How the scene is used. "ask" is the invitation on the farm (a festival with a
 * map sends the player there, one without shows its screen). "leave" asks
 * before going home from a festival map. "panel" is one counter or the display
 * table, opened from a service on the festival map, and closing it stays there.
 */
export interface FestivalData {
  mode?: "ask" | "leave" | "panel";
  panel?: "showing" | "counter";
}

export class FestivalScene extends Phaser.Scene {
  private state!: GameState;
  private inside = false;
  private mode: NonNullable<FestivalData["mode"]> = "ask";
  private only: FestivalData["panel"];
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super("festival");
  }

  init(data?: FestivalData): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.inside = false;
    this.mode = data?.mode ?? "ask";
    this.only = data?.panel;
  }

  create(): void {
    const f = festivalToday(this.state.day.clock.day);
    if (!f || (this.mode === "ask" && enterProblem(this.state)))
      return this.close(false);
    frame(this, f.name, () => this.close(this.inside && this.mode === "ask"));
    if (this.mode === "panel") return this.enter();
    const leaving = this.mode === "leave";
    this.add
      .text(
        480,
        200,
        leaving
          ? `Leave the ${f.name}?\nIt will be ${clockText(f.ends)} when you are home, and you cannot come back.`
          : `Go to the ${f.name}?\nTime stops while you are there, and it is ${clockText(f.ends)} when you leave.`,
        { fontSize: "22px", color: "#ffffff", align: "center" },
      )
      .setOrigin(0.5);
    const go = () => (leaving ? this.goHome() : this.enter());
    const yes = this.button(340, 330, leaving ? "Leave" : "Go", 0x3f7d3a, go);
    const no = this.button(
      620,
      330,
      leaving ? "Stay" : "Not now",
      0xa0482e,
      () => this.close(false),
    );
    this.input.keyboard?.on("keydown-ENTER", () => {
      if (!this.inside) go();
    });
    this.add
      .text(480, 500, "Enter: yes   Esc: no", {
        fontSize: "13px",
        color: "#ffffffaa",
      })
      .setOrigin(0.5);
    this.asking = [yes, no].flat();
  }

  private asking: Phaser.GameObjects.GameObject[] = [];

  /** Leave a festival map: the clock moves on and the player is back at the farm. */
  private goHome(): void {
    this.close(true, { map: "farm", entry: FESTIVAL_RETURN });
  }

  private enter(): void {
    if (this.inside) return;
    const f =
      this.mode === "panel"
        ? festivalToday(this.state.day.clock.day)
        : enterFestival(this.state);
    if (!f) return this.close(false);
    // A festival with a map is played there, not on this screen.
    if (f.map && this.mode === "ask")
      return this.close(false, { map: f.map, entry: "door" });
    this.inside = true;
    this.asking.forEach((o) => o.destroy());
    this.add
      .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x10201a, 1)
      .setInteractive();
    this.add.text(24, 16, f.name, { fontSize: "30px", color: "#ffffff" });
    this.add.text(24, 64, f.blurb, {
      fontSize: "18px",
      color: "#ffffff",
      wordWrap: { width: 900 },
    });
    this.message = this.add.text(24, 424, "", {
      fontSize: "18px",
      color: "#ffe9a0",
      wordWrap: { width: 700 },
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.arrow(0, -1));
    kb?.on("keydown-DOWN", () => this.arrow(0, 1));
    kb?.on("keydown-LEFT", () => this.arrow(-1, 0));
    kb?.on("keydown-RIGHT", () => this.arrow(1, 0));
    kb?.on("keydown-SPACE", () => this.menu?.press(0));

    const tabs: { text: string; show: () => void }[] = [];
    const want = (p: FestivalData["panel"]) =>
      this.mode !== "panel" || this.only === p;
    if (f.activity === "showing" && want("showing"))
      tabs.push({ text: "The table", show: () => this.showingPanel() });
    if (f.activity === "sights")
      tabs.push({ text: "Look around", show: () => this.sightsPanel(f) });
    if (f.counter.length > 0 && want("counter"))
      tabs.push({ text: "Counter", show: () => this.counterPanel(f) });
    tabs.forEach((t, i) =>
      this.button(
        120 + i * 190,
        150,
        t.text,
        0x3f7d3a,
        () => this.switchTo(t.show),
        170,
        36,
      ),
    );
    const panel = this.mode === "panel";
    this.button(
      840,
      490,
      panel ? "Done" : "Leave",
      0xa0482e,
      () => this.close(!panel),
      200,
      50,
    );
    const first = tabs[0];
    if (first) this.switchTo(first.show);
  }

  private panel: Phaser.GameObjects.GameObject[] = [];
  private menu?: Menu;
  private onArrow?: (dx: number, dy: number) => void;

  private arrow(dx: number, dy: number): void {
    if (this.onArrow) this.onArrow(dx, dy);
    else if (dy !== 0) this.menu?.move(dy);
  }

  /** Clear the current panel and build another. */
  private switchTo(show: () => void): void {
    this.menu?.destroy();
    this.menu = undefined;
    this.onArrow = undefined;
    this.panel.forEach((o) => o.destroy());
    this.panel = [];
    this.message.setText("");
    show();
  }

  private counterPanel(f: Festival): void {
    const unit = (e: CounterEntry) => (e.tokens ? " tokens" : "g");
    const menu = new Menu(this, {
      x: 24,
      y: 196,
      w: 700,
      title: "Counter",
      buttonsOnly: true,
    });
    this.menu = menu;
    menu.setFocus(true);
    const rows = () =>
      f.counter.map((e) => ({
        label: counterName(e),
        detail: `${e.price}${unit(e)}`,
        dim: counterProblem(this.state, f, e) !== undefined,
        buttons: [
          {
            text: "Buy",
            run: () => {
              const why = counterProblem(this.state, f, e);
              if (why === undefined && buyAtCounter(this.state, f, e))
                this.message.setText(`You buy the ${counterName(e)}.`);
              else this.message.setText(why ?? "");
              menu.setRows(rows());
              this.tokensText?.setText(this.tokensLine());
            },
          },
        ],
      }));
    menu.setRows(rows());
    if (f.activity === "showing") {
      this.tokensText = this.add.text(740, 200, this.tokensLine(), {
        fontSize: "16px",
        color: "#ffe9a0",
      });
      this.panel.push(this.tokensText);
    }
  }

  private tokensText?: Phaser.GameObjects.Text;
  private tokensLine = () => `Show tokens: ${showTokens(this.state)}`;

  private showingPanel(): void {
    const table: string[] = [];
    const summary = this.add.text(24, 196, "", {
      fontSize: "16px",
      color: "#ffe9a0",
    });
    this.panel.push(summary);
    const menu = new Menu(this, {
      x: 24,
      y: 220,
      w: 700,
      title: "Your goods",
      visible: 3,
    });
    this.menu = menu;
    menu.setFocus(true);
    const rows = () => {
      const counts = new Map<string, number>();
      const inv = this.state.inventory;
      for (let i = 0; i < inv.size; i++) {
        const slot = inv.slot(i);
        if (slot && groupOf(slot.id))
          counts.set(slot.id, (counts.get(slot.id) ?? 0) + slot.count);
      }
      const on = (id: string) => table.filter((t) => t === id).length;
      summary.setText(
        judgedThisYear(this.state)
          ? "The judge has scored your table this year."
          : `Table ${table.length}/${TABLE_SIZE}   Points so far: ${scoreTable(table).total}`,
      );
      return [...counts].map(([id, have]) => ({
        label: itemById(id)?.name ?? id,
        detail: `${on(id)} on the table, ${have} in pack`,
        buttons: [
          {
            text: "Add",
            enabled: table.length < TABLE_SIZE && on(id) < have,
            run: () => {
              table.push(id);
              menu.setRows(rows());
            },
          },
          {
            text: "Take back",
            enabled: on(id) > 0,
            run: () => {
              table.splice(table.indexOf(id), 1);
              menu.setRows(rows());
            },
          },
        ],
      }));
    };
    menu.setRows(rows());
    this.panel.push(
      ...this.button(
        840,
        300,
        "Judge",
        0x3f7d3a,
        () => {
          const why = judgeProblem(this.state, table);
          if (why !== undefined) return this.message.setText(why);
          const r = judge(this.state, table)!;
          this.message.setText(
            `${r.score.total} points: place ${r.place.place}. You win ${r.place.tokens} show tokens.${r.place.place === 1 ? " The judge pins a rosette hat on you." : ""}`,
          );
          menu.setRows(rows());
        },
        200,
        50,
      ),
    );
  }

  private sightsPanel(f: Festival): void {
    const menu = new Menu(this, {
      x: 24,
      y: 196,
      w: 700,
      title: "Look around",
    });
    this.menu = menu;
    menu.setFocus(true);
    menu.setRows(
      (f.sights ?? []).map((s) => ({
        label: s.name,
        buttons: [{ text: "Look", run: () => this.message.setText(s.line) }],
      })),
    );
  }

  private button(
    x: number,
    y: number,
    text: string,
    color: number,
    run: () => void,
    w = 300,
    h = 60,
  ): Phaser.GameObjects.GameObject[] {
    const box = this.add
      .rectangle(x, y, w, h, color, 1)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    const label = this.add
      .text(x, y, text, {
        fontSize: h < 50 ? "16px" : "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    return [box, label];
  }

  /** Close the screen. Leaving a festival you went to moves the clock on. */
  private close(left: boolean, goto?: { map: string; entry: string }): void {
    if (left) leaveFestival(this.state);
    this.scene.stop();
    this.scene.resume("farm", goto ? { goto } : undefined);
  }
}
