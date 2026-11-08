import Phaser from "phaser";
import { itemById } from "../core/items";
import { isOre } from "../core/ore";
import { sellMultiplier } from "../core/professions";
import type { GameState } from "../core/save";
import { frame, Menu, type Row } from "./panel";
import { STATE_KEY } from "./state";
import { WINDOW_FILL } from "./panel";

/** The quantity prompt: which item, how many, and the most the backpack holds. */
interface Prompt {
  id: string;
  have: number;
  n: number;
}

/**
 * The shipping bin screen, drawn over the paused farm. The backpack is on the
 * left and what is in the bin on the right. Tapping a stack moves all of it;
 * the prompt moves part. Anything shipped can come back until the player
 * sleeps (`docs/design/28_shipping_bin.md`).
 */
export class BinScene extends Phaser.Scene {
  private state!: GameState;
  private packMenu!: Menu;
  private binMenu!: Menu;
  private money!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private pays!: Phaser.GameObjects.Text;
  /** True at the mine hall, where only raw ore can be shipped (note 22). */
  private oreOnly = false;
  private column: 0 | 1 = 0;
  private prompt: Prompt | undefined;
  private promptObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("bin");
  }

  init(data?: { oreOnly?: boolean }): void {
    this.oreOnly = data?.oreOnly === true;
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.column = 0;
    this.prompt = undefined;
    this.promptObjects = [];
  }

  create(): void {
    const { money, message } = frame(
      this,
      this.oreOnly ? "Ore bin" : "Shipping bin",
      () => this.back(),
    );
    this.money = money;
    this.message = message;
    this.pays = this.add.text(24, 440, "", {
      fontSize: "18px",
      color: "#d8e8c8",
    });
    this.add.text(
      24,
      516,
      "Arrows: move   Enter: ship all / take all   Space: ship some / take 1   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.packMenu = new Menu(this, {
      x: 24,
      y: 64,
      w: 450,
      title: "Backpack",
      visible: 8,
    });
    this.binMenu = new Menu(this, {
      x: 490,
      y: 64,
      w: 446,
      title: "Shipped today",
      visible: 8,
    });
    const kb = this.input.keyboard;
    const free = (f: () => void) => () => {
      if (!this.prompt) f();
    };
    kb?.on("keydown-UP", () =>
      this.prompt ? this.adjust(1) : this.active.move(-1),
    );
    kb?.on("keydown-DOWN", () =>
      this.prompt ? this.adjust(-1) : this.active.move(1),
    );
    kb?.on(
      "keydown-LEFT",
      free(() => this.focus(0)),
    );
    kb?.on(
      "keydown-RIGHT",
      free(() => this.focus(1)),
    );
    kb?.on("keydown-ENTER", () =>
      this.prompt ? this.confirm() : this.active.press(0),
    );
    kb?.on(
      "keydown-SPACE",
      free(() => this.active.press(1)),
    );
    this.focus(0);
  }

  private get active(): Menu {
    return this.column === 0 ? this.packMenu : this.binMenu;
  }

  private focus(column: 0 | 1): void {
    this.column = column;
    this.packMenu.setFocus(column === 0);
    this.binMenu.setFocus(column === 1);
    this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
    this.refresh();
  }

  private name(id: string): string {
    return itemById(id)?.name ?? id;
  }

  private ship(id: string, n: number): void {
    const g = this.state;
    const mult = sellMultiplier(g.skills, id);
    const sent = this.oreOnly
      ? g.bin.shipOre(g.inventory, id, n, mult)
      : g.bin.ship(g.inventory, id, n, mult);
    this.say(
      sent > 0
        ? `Shipped ${sent} ${this.name(id)}.`
        : `${this.name(id)} cannot be shipped.`,
    );
  }

  private refresh(): void {
    const g = this.state;
    this.money.setText(`Money ${g.money}g`);
    this.pays.setText(`The bin pays ${g.bin.total()}g tonight.`);

    const ids: string[] = [];
    for (let i = 0; i < g.inventory.size; i++) {
      const slot = g.inventory.slot(i);
      if (slot && !ids.includes(slot.id) && (!this.oreOnly || isOre(slot.id)))
        ids.push(slot.id);
    }
    const packRows: Row[] = ids.map((id) => {
      const def = itemById(id);
      const count = g.inventory.count(id);
      const unit = Math.floor(
        (def?.sellPrice ?? 0) * sellMultiplier(g.skills, id),
      );
      return {
        label: `${def?.name ?? id}  x${count}`,
        detail: `${unit}g`,
        dim: !def,
        buttons: [
          { text: "Ship all", run: () => this.ship(id, count) },
          {
            text: "Ship some",
            run: () => this.ask({ id, have: count, n: Math.min(count, 1) }),
          },
        ],
      };
    });
    this.packMenu.setRows(
      packRows.length > 0
        ? packRows
        : [
            {
              label: this.oreOnly ? "No ore to ship." : "Nothing to ship.",
              dim: true,
              buttons: [],
            },
          ],
    );

    const binRows: Row[] = g.bin.each().map((line, index) => ({
      label: `${this.name(line.id)}  x${line.count}`,
      detail: `${line.unit}g each`,
      buttons: [
        {
          text: "Take all",
          run: () => this.take(index, line.count),
        },
        { text: "Take 1", run: () => this.take(index, 1) },
      ],
    }));
    this.binMenu.setRows(
      binRows.length > 0
        ? binRows
        : [{ label: "The bin is empty.", dim: true, buttons: [] }],
    );
  }

  private take(index: number, n: number): void {
    const g = this.state;
    const line = g.bin.each()[index];
    if (!line) return;
    const id = line.id;
    const back = g.bin.takeBack(g.inventory, index, n);
    this.say(
      back > 0
        ? `Took back ${back} ${this.name(id)}.`
        : "Your backpack is full.",
    );
  }

  // ---- the quantity prompt -----------------------------------------------

  private ask(p: Prompt): void {
    this.prompt = p;
    this.drawPrompt();
  }

  private adjust(step: number): void {
    const p = this.prompt;
    if (!p) return;
    p.n = Phaser.Math.Clamp(p.n + step, 1, p.have);
    this.drawPrompt();
  }

  private confirm(): void {
    const p = this.prompt;
    if (!p) return;
    this.closePrompt();
    this.ship(p.id, p.n);
  }

  private closePrompt(): void {
    this.prompt = undefined;
    for (const o of this.promptObjects) o.destroy();
    this.promptObjects = [];
  }

  /** ESC and Close: drop the prompt first, then leave. */
  private back(): void {
    if (this.prompt) return this.closePrompt();
    this.scene.stop();
    this.scene.resume("farm");
  }

  private drawPrompt(): void {
    const p = this.prompt;
    for (const o of this.promptObjects) o.destroy();
    this.promptObjects = [];
    if (!p) return;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.promptObjects.push(o);
      return o;
    };
    // The backdrop blocks taps on the menus behind the prompt.
    add(
      this.add
        .rectangle(480, 270, WINDOW_FILL, WINDOW_FILL, 0x000000, 0.6)
        .setInteractive(),
    );
    add(
      this.add
        .rectangle(480, 270, 460, 250, 0x1c3a2a, 1)
        .setStrokeStyle(2, 0xffffff, 0.8),
    );
    add(
      this.add
        .text(480, 200, `Ship ${this.name(p.id)}`, {
          fontSize: "24px",
          color: "#ffe9a0",
        })
        .setOrigin(0.5),
    );
    add(
      this.add
        .text(480, 262, `${p.n} of ${p.have}`, {
          fontSize: "34px",
          color: "#ffffff",
        })
        .setOrigin(0.5),
    );
    const button = (
      x: number,
      y: number,
      w: number,
      text: string,
      run: () => void,
    ) => {
      add(
        this.add
          .rectangle(x, y, w, 44, 0x3f7d3a, 1)
          .setStrokeStyle(1, 0xffffff, 0.8)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", run),
      );
      add(
        this.add
          .text(x, y, text, { fontSize: "18px", color: "#ffffff" })
          .setOrigin(0.5),
      );
    };
    button(370, 262, 52, "-", () => this.adjust(-1));
    button(590, 262, 52, "+", () => this.adjust(1));
    button(400, 330, 80, "All", () => {
      p.n = p.have;
      this.drawPrompt();
    });
    button(490, 330, 90, "Ship", () => this.confirm());
    button(590, 330, 90, "Cancel", () => this.closePrompt());
    add(
      this.add
        .text(480, 380, "Up and down: change   Enter: ship   Esc: cancel", {
          fontSize: "13px",
          color: "#ffffffaa",
        })
        .setOrigin(0.5),
    );
  }
}
