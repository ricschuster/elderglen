import Phaser from "phaser";
import {
  animalRows,
  giftLogRows,
  birthdayText,
  CHILD_MAX_HEARTS,
  childRows,
  socialRows,
  socialTip,
  specialItems,
  type ChildRow,
  type Relationship,
  type SocialRow,
} from "../core/menupages";
import type { Taste } from "../core/friendship";
import type { GameState } from "../core/save";
import { takeEsc } from "./escape";
import { frame } from "./panel";
import { addPortrait } from "./portrait";
import { STATE_KEY } from "./state";
import { Tooltip } from "./tooltip";

const TITLE = { fontSize: "30px", color: "#ffe9a0" };
const BODY = { fontSize: "20px", color: "#ffffff", lineSpacing: 8 };

const RELATION_WORD: Record<Relationship, string> = {
  friend: "Friend",
  dating: "Dating",
  engaged: "Engaged",
  spouse: "Spouse",
};

const hearts = (n: number, max: number): string =>
  "♥".repeat(n) + "♡".repeat(Math.max(0, max - n));

const TASTE_WORD: Record<Taste, string> = {
  love: "loves",
  like: "likes",
  neutral: "is fine with",
  dislike: "dislikes",
  hate: "hates",
};

const LIST_TOP = 92;
const LIST_H = 420;
const ROW_H = 56;
const LIST_X = 24;
const LIST_W = 890;
const BAR_X = 928;

/**
 * The Social tab (note 49, 102): everyone in the roster in fixed order, with
 * portrait, relationship line, hearts, two gift boxes and a talk box. Unmet
 * people show as "???". Children follow the roster, hearts only. Scrolls by
 * wheel, drag and arrow keys with a thin bar; tap a met row for the detail page.
 */
export class SocialScene extends Phaser.Scene {
  private top = 0;
  private items: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private bar!: Phaser.GameObjects.Rectangle;
  private rows: SocialRow[] = [];
  private kids: ChildRow[] = [];
  private dragY = 0;
  private dragTop = 0;
  private moved = false;
  private tooltip!: Tooltip;
  private tipShown = false;
  private pressTimer: Phaser.Time.TimerEvent | undefined;
  /** True when the current press began on the list (not on the detail page). */
  private pressed = false;

  constructor() {
    super("social");
  }

  init(): void {
    this.top = 0;
    this.items = [];
    this.detail = [];
    this.tipShown = false;
    this.pressTimer = undefined;
    this.pressed = false;
  }

  /** The menu asks before Esc or a tab switch: an open detail page owns Esc. */
  menuBusy(): boolean {
    return this.detail.length > 0;
  }

  private get total(): number {
    return (
      this.rows.length * ROW_H +
      (this.kids.length > 0 ? 40 + this.kids.length * 36 : 0)
    );
  }

  private get maxTop(): number {
    return Math.max(0, this.total - LIST_H);
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Social", () => undefined);
    this.add.text(24, 56, "Social", TITLE);
    this.rows = socialRows(g);
    this.kids = childRows(g);
    this.bar = this.add
      .rectangle(BAR_X, LIST_TOP, 6, 40, 0xffe9a0, 0.6)
      .setOrigin(0);
    const zone = this.add
      .zone(LIST_X, LIST_TOP, LIST_W, LIST_H)
      .setOrigin(0)
      .setInteractive();
    this.tooltip = new Tooltip(this);
    zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.pressed = this.detail.length === 0;
      this.dragY = p.y;
      this.dragTop = this.top;
      this.moved = false;
      this.tipShown = false;
      if (p.wasTouch) {
        this.pressTimer?.remove();
        this.pressTimer = this.time.delayedCall(450, () => {
          if (this.moved) return;
          this.tipShown = this.showTip(g, p);
        });
      }
    });
    zone.on("pointerout", () => this.hideTip());
    zone.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.detail.length > 0) return;
      if (!p.isDown) {
        if (!p.wasTouch) this.showTip(g, p);
        return;
      }
      const dy = (this.dragY - p.y) / (this.cameras.main.zoom || 1);
      if (Math.abs(dy) > 6) {
        this.moved = true;
        this.hideTip();
      }
      if (this.moved) this.scrollTo(this.dragTop + dy);
    });
    zone.on("pointerup", (p: Phaser.Input.Pointer) => {
      const held = this.tipShown;
      this.hideTip();
      const pressed = this.pressed;
      this.pressed = false;
      if (!pressed || this.moved || held || this.detail.length > 0) return;
      const row = this.rowAt(p);
      if (row && row.met) this.openDetail(g, row);
    });
    this.input.on("wheel", (_p: unknown, _o: unknown, _x: number, dy: number) =>
      this.scrollTo(this.top + (dy > 0 ? ROW_H : -ROW_H)),
    );
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.scrollTo(this.top - ROW_H));
    kb?.on("keydown-DOWN", () => this.scrollTo(this.top + ROW_H));
    kb?.on("keydown-ESC", () => {
      if (this.detail.length === 0) return;
      takeEsc(this);
      this.closeDetail();
    });
    this.draw();
  }

  /** Show the hover or long-press tip for the person under the pointer; true if one showed. */
  private showTip(g: GameState, p: Phaser.Input.Pointer): boolean {
    const row = this.rowAt(p);
    const i = row ? this.rows.indexOf(row) : -1;
    if (!row || i < 0) {
      this.tooltip.hide();
      return false;
    }
    const y = LIST_TOP + i * ROW_H - this.top;
    this.tooltip.show(
      socialTip(g, row),
      { x: LIST_X, y, w: LIST_W - 10, h: ROW_H - 6 },
      { w: 960, h: 540 },
    );
    return true;
  }

  private hideTip(): void {
    this.pressTimer?.remove();
    this.pressTimer = undefined;
    this.tooltip.hide();
  }

  private rowAt(p: Phaser.Input.Pointer): SocialRow | undefined {
    const local = this.cameras.main.getWorldPoint(p.x, p.y);
    const i = Math.floor((local.y - LIST_TOP + this.top) / ROW_H);
    return this.rows[i];
  }

  private scrollTo(v: number): void {
    const next = Math.max(0, Math.min(this.maxTop, Math.round(v)));
    if (next === this.top) return;
    this.top = next;
    this.hideTip();
    this.draw();
  }

  private draw(): void {
    for (const o of this.items) o.destroy();
    this.items = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.items.push(o);
      return o;
    };
    // Only rows that fit entirely inside the list window are made, so a row
    // that starts inside but is taller than the room left never spills over
    // the frame. At the end of the scroll the last row fits (see maxTop).
    const first = Math.floor(this.top / ROW_H);
    for (let i = first; i < this.rows.length; i++) {
      const y = LIST_TOP + i * ROW_H - this.top;
      if (y + (ROW_H - 6) > LIST_TOP + LIST_H) break;
      if (y < LIST_TOP) continue;
      this.drawRow(this.rows[i]!, y, add);
    }
    let y = LIST_TOP + this.rows.length * ROW_H - this.top;
    if (this.kids.length > 0) {
      if (y >= LIST_TOP && y + 20 <= LIST_TOP + LIST_H)
        add(
          this.add.text(LIST_X, y + 8, "Children", {
            ...BODY,
            fontSize: "20px",
            color: "#ffe9a0",
          }),
        );
      y += 40;
      for (const k of this.kids) {
        if (y >= LIST_TOP && y + 30 <= LIST_TOP + LIST_H) {
          add(
            this.add.text(LIST_X + 8, y + 4, k.name, {
              fontSize: "18px",
              color: "#ffffff",
            }),
          );
          this.drawHearts(k.hearts, CHILD_MAX_HEARTS, 260, y + 4, add);
        }
        y += 36;
      }
    }
    const frac = this.total <= LIST_H ? 1 : LIST_H / this.total;
    const h = Math.max(24, LIST_H * frac);
    this.bar.setVisible(this.maxTop > 0);
    this.bar.setSize(6, h);
    this.bar.y =
      LIST_TOP +
      (this.maxTop > 0 ? (this.top / this.maxTop) * (LIST_H - h) : 0);
  }

  private drawHearts(
    n: number,
    cap: number,
    x: number,
    y: number,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
    size = 18,
  ): void {
    for (let h = 0; h < 10; h++) {
      const color = h < n ? 0xe05a6a : h < cap ? 0x5a3a40 : 0x333333;
      add(
        this.add
          .rectangle(x + h * (size + 3), y, size, size, color)
          .setOrigin(0),
      );
    }
  }

  private box(
    x: number,
    y: number,
    filled: boolean,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    add(
      this.add
        .rectangle(x, y, 20, 20, filled ? 0x8fd18a : 0x000000, filled ? 1 : 0.4)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.6),
    );
  }

  private drawRow(
    r: SocialRow,
    y: number,
    add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
  ): void {
    add(
      this.add
        .rectangle(
          LIST_X,
          y + 2,
          LIST_W - 10,
          ROW_H - 6,
          0x000000,
          r.met ? 0.45 : 0.25,
        )
        .setOrigin(0),
    );
    for (const o of addPortrait(this, r.id, LIST_X + 6, y + 6, 40, r.met))
      add(o);
    const dim = r.met ? "#ffffff" : "#ffffff77";
    add(
      this.add.text(LIST_X + 56, y + 6, r.name, {
        fontSize: "20px",
        color: dim,
      }),
    );
    if (!r.met) return;
    add(
      this.add.text(LIST_X + 56, y + 30, RELATION_WORD[r.relationship], {
        fontSize: "14px",
        color: "#ffe9a0",
      }),
    );
    this.drawHearts(r.hearts, r.maxHearts, 250, y + 8, add, 20);
    // Two gift boxes (none for a spouse) and one talk box.
    if (!r.spouse)
      for (let n = 0; n < r.weekGiftLimit; n++)
        this.box(560 + n * 28, y + 14, n < r.weekGifts, add);
    add(
      this.add.text(560, y + 36, r.spouse ? "" : "gifts", {
        fontSize: "11px",
        color: "#ffffffaa",
      }),
    );
    this.box(700, y + 14, r.talkedToday, add);
    add(
      this.add.text(700, y + 36, "talk", {
        fontSize: "11px",
        color: "#ffffffaa",
      }),
    );
  }

  private openDetail(g: GameState, r: SocialRow): void {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    this.hideTip();
    this.setListVisible(false);
    add(
      this.add
        .rectangle(LIST_X - 8, LIST_TOP - 8, 912, LIST_H + 16, 0x10201a, 1)
        .setOrigin(0)
        .setInteractive(),
    );
    for (const o of addPortrait(
      this,
      r.id,
      LIST_X + 16,
      LIST_TOP + 40,
      120,
      true,
    ))
      add(o);
    add(this.add.text(LIST_X + 160, LIST_TOP + 36, r.name, TITLE));
    add(
      this.add.text(
        LIST_X + 160,
        LIST_TOP + 76,
        `${RELATION_WORD[r.relationship]}   Birthday: ${birthdayText(r.id)}`,
        BODY,
      ),
    );
    this.drawHearts(
      r.hearts,
      r.maxHearts,
      LIST_X + 160,
      LIST_TOP + 116,
      add,
      24,
    );
    const entries = giftLogRows(g, r.id);
    add(
      this.add.text(
        LIST_X + 16,
        LIST_TOP + 184,
        entries.length === 0
          ? "No gift tastes learned yet."
          : "Gift log\n" +
              entries.map((e) => `${TASTE_WORD[e.taste]} ${e.item}`).join("\n"),
        { ...BODY, fontSize: "18px", wordWrap: { width: 840 } },
      ),
    );
    const back = add(
      this.add
        .text(LIST_X + 16, LIST_TOP + 4, "< Back", {
          fontSize: "20px",
          color: "#ffe9a0",
          backgroundColor: "#a0482e",
          padding: { x: 12, y: 8 },
        })
        .setInteractive({ useHandCursor: true }),
    );
    back.on("pointerdown", () => this.closeDetail());
  }

  /** The roster rows and bar stay out of sight while a detail page is open. */
  private setListVisible(on: boolean): void {
    for (const o of this.items)
      (
        o as Phaser.GameObjects.Components.Visible &
          Phaser.GameObjects.GameObject
      ).setVisible(on);
    this.bar.setVisible(on && this.maxTop > 0);
  }

  private closeDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    this.setListVisible(true);
  }
}

/** The Animals tab (note 49): the horse and every farm animal, with hearts and petting. */
export class AnimalsScene extends Phaser.Scene {
  constructor() {
    super("animals");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Animals", () => undefined);
    this.add.text(24, 90, "Animals", TITLE);
    animalRows(g).forEach((r, i) => {
      const y = 134 + (i % 10) * 32;
      const x = 24 + Math.floor(i / 10) * 460;
      this.add.text(x, y, `${r.name} (${r.kind})`, {
        fontSize: "18px",
        color: "#ffffff",
      });
      if (r.hearts === undefined) return;
      this.add.text(
        x + 250,
        y,
        `${hearts(r.hearts, r.maxHearts ?? 5)}  ${r.petted ? "petted" : "not petted"}`,
        { fontSize: "16px", color: r.petted ? "#8fd18a" : "#ffe9a0" },
      );
    });
  }
}

/** The Special Items tab (note 49): keepsakes and keys held, and what each does. */
export class SpecialScene extends Phaser.Scene {
  constructor() {
    super("special");
  }

  create(): void {
    const g = this.registry.get(STATE_KEY) as GameState;
    frame(this, "Special Items", () => undefined);
    this.add.text(24, 90, "Special Items", TITLE);
    specialItems(g).forEach((s, i) => {
      const y = 140 + i * 70;
      this.add.text(24, y, s.name, { fontSize: "22px", color: "#ffe9a0" });
      this.add.text(24, y + 30, s.text, {
        fontSize: "17px",
        color: "#ffffff",
        wordWrap: { width: 880 },
      });
    });
  }
}
