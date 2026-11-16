import Phaser from "phaser";
import {
  JOURNAL_SECTIONS,
  defaultExpanded,
  journalLines,
  questEntries,
  questView,
  toggleExpanded,
  type JournalLine,
  type JournalSection,
  type QuestEntry,
} from "../core/journal";
import { weddingMark } from "../core/courtship";
import type { GameState } from "../core/save";
import { closeWindow, frame } from "./panel";
import { STATE_KEY } from "./state";

const VISIBLE = 13;

/**
 * The journal (note 49): its own window, not a menu tab, on J or the HUD
 * button. Three sections, switched with Left and Right or a tap: Quests,
 * Projects and Mail. A quest collapses to its title and expands on a tap or
 * click on it, or Enter on the marked one (Up and Down move the mark). It only reads. The farm and the clock stay paused.
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
  private body!: Phaser.GameObjects.Text;
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
    this.body = this.add.text(40, 76, "", {
      fontSize: "19px",
      color: "#ffffff",
      lineSpacing: 6,
      wordWrap: { width: 880 },
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
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.tap(p.y));
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
    this.lines = [
      ...head,
      ...questView(
        this.entries,
        this.expanded,
        this.entries[this.selected]?.id,
      ),
    ];
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

  /** A tap on a quest title selects it and flips it open or shut. */
  private tap(y: number): void {
    if (this.section !== "quests") return;
    const shown = this.lines.slice(this.top, this.top + VISIBLE).length;
    if (shown === 0 || y < this.body.y) return;
    const row = Math.floor((y - this.body.y) / (this.body.height / shown));
    const line = this.lines[this.top + row];
    const at = this.entries.findIndex((e) => e.id === line?.quest);
    if (at < 0) return;
    this.selected = at;
    this.toggleSelected();
  }

  private scroll(by: number): void {
    const max = Math.max(0, this.lines.length - VISIBLE);
    this.top = Math.max(0, Math.min(max, this.top + by));
    this.draw();
  }

  private draw(): void {
    const hint =
      this.section === "quests" && this.entries.length
        ? "   Enter or tap: open a request"
        : "";
    this.body.setText(
      this.lines
        .slice(this.top, this.top + VISIBLE)
        .map((l) => l.text)
        .join("\n"),
    );
    this.more.setText(
      this.lines.length > VISIBLE
        ? `Up and Down, or the wheel: scroll (${this.top + 1} of ${this.lines.length})   Left and Right: section   J or Esc: close${hint}`
        : `Left and Right: section   J or Esc: close${hint}`,
    );
  }

  private close(): void {
    closeWindow(this);
  }
}
