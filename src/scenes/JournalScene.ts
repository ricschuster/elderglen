import Phaser from "phaser";
import {
  JOURNAL_SECTIONS,
  defaultExpanded,
  cancelQuest,
  journalLines,
  questEntries,
  questView,
  toggleExpanded,
  type JournalLine,
  type JournalSection,
  type QuestEntry,
} from "../core/journal";
import { isDrag } from "../core/dragscroll";
import { weddingMark } from "../core/courtship";
import type { GameState } from "../core/save";
import { closeWindow, frame } from "./panel";
import { STATE_KEY } from "./state";

const VISIBLE = 13;
const BODY_TOP = 76;
const BODY_BOTTOM = 470;
const LINE_GAP = 6;
/** Pixels of drag that move the list by one line. */
const ROW_GUESS = 28;

/**
 * The journal (note 49): its own window, not a menu tab, on J or the HUD
 * button. Three sections, switched with Left and Right or a tap: Quests,
 * Projects and Mail. A quest collapses to its title and expands on a tap or
 * click on it, or Enter on the marked one (Up and Down move the mark). X, or a tap on Cancel under an open request, gives it up. Otherwise it only reads. The farm and the clock stay paused.
 */
export class JournalScene extends Phaser.Scene {
  private section: JournalSection = "quests";
  private top = 0;
  private lines: JournalLine[] = [];
  private entries: QuestEntry[] = [];
  private expanded = new Set<string>();
  private selected = 0;
  private tabs: {
    box: Phaser.GameObjects.Rectangle;
    key: JournalSection;
  }[] = [];
  private rows: { obj: Phaser.GameObjects.Text; line: JournalLine }[] = [];
  /** A request waiting on the yes or no after Cancel. */
  private confirming: string | undefined;
  private drag = { y: 0, top: 0, moved: false };
  private more!: Phaser.GameObjects.Text;

  constructor() {
    super("journal");
  }

  init(data?: { section?: JournalSection }): void {
    this.section = JOURNAL_SECTIONS.some((s) => s.key === data?.section)
      ? data!.section!
      : "quests";
    this.top = 0;
    this.tabs = [];
    this.entries = [];
    this.expanded = new Set();
    this.selected = 0;
    this.rows = [];
    this.confirming = undefined;
    this.drag = { y: 0, top: 0, moved: false };
  }

  create(): void {
    frame(this, "Journal", () => this.close());
    JOURNAL_SECTIONS.forEach((s, i) => {
      const x = 240 + i * 130;
      const box = this.add
        .rectangle(x, 14, 122, 38, 0x2f4a35, 1)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.6)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => this.show(s.key));
      this.add
        .text(x + 61, 33, s.label, { fontSize: "18px", color: "#ffffff" })
        .setOrigin(0.5);
      this.tabs.push({ box, key: s.key });
    });
    this.more = this.add.text(40, 478, "", {
      fontSize: "14px",
      color: "#ffffffaa",
    });
    const kb = this.input.keyboard;
    kb?.on("keydown-J", () => this.close());
    kb?.on("keydown-LEFT", () => this.step(-1));
    kb?.on("keydown-RIGHT", () => this.step(1));
    kb?.on("keydown-UP", () => this.move(-1));
    kb?.on("keydown-DOWN", () => this.move(1));
    kb?.on("keydown-ENTER", () => this.toggleSelected());
    kb?.on("keydown-X", () => this.askCancel());
    kb?.on("keydown-Y", () => this.answer(true));
    kb?.on("keydown-N", () => this.answer(false));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.drag = { y: p.y, top: this.top, moved: false };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = (this.drag.y - p.y) / (this.cameras.main.zoom || 1);
      if (isDrag(0, dy)) this.drag.moved = true;
      if (!this.drag.moved) return;
      const next = this.clampTop(Math.round(this.drag.top + dy / ROW_GUESS));
      if (next !== this.top) {
        this.top = next;
        this.draw();
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.drag.moved) this.tap(p);
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _x: number, dy: number) =>
      this.scroll(dy > 0 ? 1 : -1),
    );
    this.show(this.section);
  }

  private show(section: JournalSection): void {
    this.section = section;
    this.top = 0;
    this.selected = 0;
    if (section === "quests") {
      this.entries = questEntries(this.registry.get(STATE_KEY) as GameState);
      this.expanded = defaultExpanded(this.entries);
      this.selected = Math.max(0, this.entries.length - 1);
      this.build();
      this.followSelected();
    } else {
      this.lines = journalLines(
        this.registry.get(STATE_KEY) as GameState,
        section,
      ).map((text) => ({ text }));
    }
    this.tabs.forEach((t) =>
      t.box.setFillStyle(t.key === section ? 0xa0482e : 0x2f4a35, 1),
    );
    this.draw();
  }

  private step(by: number): void {
    const i = JOURNAL_SECTIONS.findIndex((s) => s.key === this.section);
    const n = JOURNAL_SECTIONS.length;
    this.show(JOURNAL_SECTIONS[(i + by + n) % n]!.key);
  }

  /** Rebuild the quest lines from the entries and what is expanded. */
  private build(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    const wedding = weddingMark(g);
    const head: JournalLine[] = wedding ? [{ text: wedding }] : [];
    if (this.entries.length === 0) {
      this.lines = [
        ...head,
        { text: "No open requests." },
        { text: "Take one from the request board and it will be listed here." },
      ];
      return;
    }
    const view: JournalLine[] = [];
    for (const l of questView(
      this.entries,
      this.expanded,
      this.entries[this.selected]?.id,
    )) {
      if (l.cancel && l.cancel === this.confirming) {
        view.push({ text: "       Cancel this request?" });
        view.push({ text: "       [ Yes, cancel it ]", yes: l.cancel });
        view.push({ text: "       [ No, keep it ]", no: l.cancel });
      } else view.push(l);
    }
    this.lines = [...head, ...view];
  }

  private followSelected(): void {
    const i = this.lines.findIndex(
      (l) => l.quest === this.entries[this.selected]?.id,
    );
    if (i < 0) return;
    if (i < this.top) this.top = i;
    else if (i >= this.top + VISIBLE) this.top = i - VISIBLE + 1;
  }

  private move(by: number): void {
    if (this.section !== "quests" || this.entries.length === 0) {
      this.scroll(by);
      return;
    }
    const n = this.entries.length;
    this.selected = Math.max(0, Math.min(n - 1, this.selected + by));
    this.build();
    this.followSelected();
    this.draw();
  }

  private toggleSelected(): void {
    const e = this.entries[this.selected];
    if (this.section !== "quests" || !e) return;
    this.expanded = toggleExpanded(this.expanded, e.id);
    this.build();
    this.followSelected();
    this.draw();
  }

  /** Ask before giving up a request. */
  private askCancel(id = this.entries[this.selected]?.id): void {
    if (this.section !== "quests" || !id) return;
    this.confirming = id;
    this.build();
    this.draw();
  }

  private answer(yes: boolean): void {
    const id = this.confirming;
    if (!id) return;
    this.confirming = undefined;
    if (yes) this.cancelSelected(id);
    else {
      this.build();
      this.draw();
    }
  }

  /** Give up a request (costs nothing), then rebuild the list. */
  private cancelSelected(id = this.entries[this.selected]?.id): void {
    if (this.section !== "quests" || !id) return;
    if (!cancelQuest(this.registry.get(STATE_KEY) as GameState, id)) return;
    this.entries = questEntries(this.registry.get(STATE_KEY) as GameState);
    this.selected = Math.max(
      0,
      Math.min(this.selected, this.entries.length - 1),
    );
    this.build();
    this.followSelected();
    this.draw();
  }

  /** A tap hits the line that is drawn under it (lines differ in height when they wrap). */
  private tap(p: Phaser.Input.Pointer): void {
    if (this.section !== "quests") return;
    const y = this.cameras.main.getWorldPoint(p.x, p.y).y;
    const hit = this.rows.find(
      (r) => y >= r.obj.y && y < r.obj.y + r.obj.height + LINE_GAP,
    );
    const line = hit?.line;
    if (!line) return;
    if (line.yes) {
      this.answer(true);
      return;
    }
    if (line.no) {
      this.answer(false);
      return;
    }
    if (line.cancel) {
      this.askCancel(line.cancel);
      return;
    }
    const at = this.entries.findIndex((e) => e.id === line.quest);
    if (at < 0) return;
    this.confirming = undefined;
    this.selected = at;
    this.toggleSelected();
  }

  /** Keep the top line in range; stop once the last line is on screen. */
  private clampTop(v: number): number {
    const max = Math.max(0, this.lines.length - VISIBLE);
    const atEnd = this.top + this.rows.length >= this.lines.length;
    return Math.max(0, Math.min(atEnd && v > this.top ? this.top : max, v));
  }

  private scroll(by: number): void {
    this.top = this.clampTop(this.top + by);
    this.draw();
  }

  private draw(): void {
    const hint =
      this.section === "quests" && this.entries.length
        ? "   Tap or Enter: open   X: cancel (Y or N to confirm)"
        : "";
    for (const r of this.rows) r.obj.destroy();
    this.rows = [];
    let y = BODY_TOP;
    for (let i = this.top; i < this.lines.length; i++) {
      const line = this.lines[i]!;
      const obj = this.add.text(40, y, line.text, {
        fontSize: "19px",
        color: "#ffffff",
        wordWrap: { width: 880 },
      });
      if (y + obj.height > BODY_BOTTOM && this.rows.length > 0) {
        obj.destroy();
        break;
      }
      this.rows.push({ obj, line });
      y += obj.height + LINE_GAP;
    }
    this.more.setText(
      this.lines.length > this.rows.length
        ? `Drag, Up and Down, or the wheel: scroll (${this.top + 1} of ${this.lines.length})   Left and Right: section   J or Esc: close${hint}`
        : `Left and Right: section   J or Esc: close${hint}`,
    );
  }

  private close(): void {
    closeWindow(this);
  }
}
