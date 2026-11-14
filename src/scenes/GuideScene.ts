import Phaser from "phaser";
import { guideCategories } from "../core/guide";
import type { GuideCategory, GuideEntry } from "../core/guide";
import type { GameState } from "../core/save";
import { closeWindow, frame, Menu, TOUCH_ROW_H, type Row } from "./panel";
import { STATE_KEY } from "./state";

/**
 * The Guide tab (note 101): a reference of what the player has found. The list
 * shows the categories, then the entries of one, and a card for the entry under
 * the cursor. Cards are built by `core/guide.ts`; nothing here holds a fact.
 */
export class GuideScene extends Phaser.Scene {
  private state!: GameState;
  private menu!: Menu;
  private card!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private cats: GuideCategory[] = [];
  /** The category whose entries are open, or undefined for the category list. */
  private open: GuideCategory | undefined;

  constructor() {
    super("guide");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.open = undefined;
  }

  create(): void {
    frame(this, "Guide", () => closeWindow(this));
    this.card = this.add.text(520, 96, "", {
      fontSize: "17px",
      color: "#ffffff",
      wordWrap: { width: 400 },
      lineSpacing: 6,
    });
    this.hint = this.add.text(24, 500, "", {
      fontSize: "13px",
      color: "#ffffffaa",
    });
    this.menu = new Menu(this, {
      x: 24,
      y: 90,
      w: 470,
      title: "Guide",
      rowH: TOUCH_ROW_H,
      visible: 7,
      onCursor: () => this.showCard(),
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.menu.move(-1));
    kb?.on("keydown-DOWN", () => this.menu.move(1));
    kb?.on("keydown-ENTER", () => this.menu.press(0));
    kb?.on("keydown-BACKSPACE", () => this.back());
    this.menu.setFocus(true);
    this.refresh();
  }

  private refresh(): void {
    this.cats = guideCategories(this.state);
    const c = this.open && this.cats.find((x) => x.id === this.open!.id);
    this.open = c;
    if (!c) {
      this.hint.setText(
        "Arrows: move   Enter: open   Backspace: back   You see only what you have found.",
      );
      this.menu.setRows(
        this.cats.map((cat) => ({
          label: cat.name,
          detail: `${cat.entries.length} found`,
          buttons: [{ text: "Open", run: () => this.show(cat) }],
        })),
      );
    } else {
      this.hint.setText("Arrows: move   Backspace: back to the categories");
      const rows: Row[] = [
        { label: "Back", buttons: [{ text: "Back", run: () => this.back() }] },
        ...c.entries.map((e) => ({
          label: e.name,
          detail: e.state === "seen" ? "Seen" : undefined,
          buttons: [],
        })),
      ];
      if (c.entries.length === 0)
        rows.push({ label: "Nothing found yet.", dim: true, buttons: [] });
      this.menu.setRows(rows);
    }
    this.showCard();
  }

  private entry(): GuideEntry | undefined {
    if (!this.open) return undefined;
    return this.open.entries[this.menu.cursor - 1];
  }

  private showCard(): void {
    const e = this.entry();
    if (!e) {
      this.card.setText(
        this.open
          ? ""
          : "Pick a category to read what you have found: crops, fish, forage, recipes, hall bundles, places, the people you have met and the things you have held.",
      );
      return;
    }
    const parts = [e.name, ""];
    if (e.blurb) parts.push(e.blurb, "");
    parts.push(...e.lines);
    if (e.state === "seen")
      parts.push("", "There is more to learn once you grow one.");
    this.card.setText(parts.join("\n"));
  }

  private show(c: GuideCategory): void {
    this.open = c;
    this.menu.cursor = 0;
    this.refresh();
  }

  private back(): void {
    if (!this.open) return;
    this.open = undefined;
    this.menu.cursor = 0;
    this.refresh();
  }
}
