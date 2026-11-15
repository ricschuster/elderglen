import Phaser from "phaser";
import {
  JOURNAL_SECTIONS,
  journalLines,
  type JournalSection,
} from "../core/journal";
import type { GameState } from "../core/save";
import { closeWindow, frame } from "./panel";
import { STATE_KEY } from "./state";

const VISIBLE = 13;

/**
 * The journal (note 49): its own window, not a menu tab, on J or the HUD
 * button. Three sections, switched with Left and Right or a tap: Quests,
 * Projects and Mail. It only reads. The farm and the clock stay paused.
 */
export class JournalScene extends Phaser.Scene {
  private section: JournalSection = "quests";
  private top = 0;
  private lines: string[] = [];
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
    kb?.on("keydown-UP", () => this.scroll(-1));
    kb?.on("keydown-DOWN", () => this.scroll(1));
    this.input.on("wheel", (_p: unknown, _o: unknown, _x: number, dy: number) =>
      this.scroll(dy > 0 ? 1 : -1),
    );
    this.show(this.section);
  }

  private show(section: JournalSection): void {
    this.section = section;
    this.top = 0;
    this.lines = journalLines(
      this.registry.get(STATE_KEY) as GameState,
      section,
    );
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

  private scroll(by: number): void {
    const max = Math.max(0, this.lines.length - VISIBLE);
    this.top = Math.max(0, Math.min(max, this.top + by));
    this.draw();
  }

  private draw(): void {
    this.body.setText(
      this.lines.slice(this.top, this.top + VISIBLE).join("\n"),
    );
    this.more.setText(
      this.lines.length > VISIBLE
        ? `Up and Down, or the wheel: scroll (${this.top + 1} of ${this.lines.length})   Left and Right: section   J or Esc: close`
        : "Left and Right: section   J or Esc: close",
    );
  }

  private close(): void {
    closeWindow(this);
  }
}
