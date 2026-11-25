import Phaser from "phaser";
import {
  SWIPE_START_PX,
  TOUCH_CELL,
  clampRowOffset,
  inWindow,
  swipeRowOffset,
  visibleRows,
} from "../core/chestmenu";
import {
  GALLERY_TOTAL,
  canDonate,
  claimable,
  donateLine,
  donatedCount,
  galleryEntry,
  shelf,
} from "../core/gallery";
import { SOURCE_FLAGS } from "../core/elderfruit";
import { hasFlag } from "../core/worldflags";
import { splitQuality } from "../core/quality";
import { itemTip, type ItemTip } from "../core/itemtip";
import type { GameState } from "../core/save";
import { iconKey } from "./art";
import { takeEsc } from "./escape";
import { closeWindow, frame } from "./panel";
import { STATE_KEY } from "./state";
import type { Intent } from "../core/protocol";
import { closeWhenDone, dispatch, followGuest } from "./guestlive";
import { Tooltip } from "./tooltip";

const CELL = TOUCH_CELL;
const PITCH = CELL + 4;
const SHELF_COLS = 12;
const SHELF_X = 24;
const SHELF_TOP = 84;
const PACK_COLS = 6;
/** The shelf's lowest pixel row, above the message line. */
const SHELF_BOTTOM = 464;
const PACK_X = SHELF_X + SHELF_COLS * PITCH + 20;

interface Cell {
  box: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
}

/**
 * The library gallery (note 104): the shelf of all the donated items on one
 * side, the backpack on the other, as the chest screen shows two grids. Tap a
 * pack item the librarian takes to donate one copy. A donated item can be
 * moved to any shelf slot (tap it, then the slot). Opened read only from the
 * collections page it shows the shelf alone. The farm is paused behind it.
 */
export class GalleryScene extends Phaser.Scene {
  private state!: GameState;
  private readOnly = false;
  private back: string | undefined;
  private note!: Phaser.GameObjects.Text;
  private head!: Phaser.GameObjects.Text;
  private tooltip!: Tooltip;
  private shelfCells: Cell[] = [];
  private packCells: Cell[] = [];
  private picked: number | undefined;
  /** First shelf row shown, and how many rows fit. */
  private offset = 0;
  private shown = 1;
  /** A press on a shelf cell that may become a swipe (then no tap) on release. */
  private touch:
    { slot: number; y: number; offset: number; active: boolean } | undefined;

  constructor() {
    super("gallery");
  }

  init(data?: { readOnly?: boolean; back?: string }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.readOnly = data?.readOnly === true;
    this.back = data?.back;
    this.shelfCells = [];
    this.packCells = [];
    this.picked = undefined;
    this.offset = 0;
    this.touch = undefined;
  }

  create(): void {
    const { message } = frame(this, "Gallery", () => this.close());
    this.note = message;
    this.tooltip = new Tooltip(this);
    this.head = this.add.text(SHELF_X, 52, "", {
      fontSize: "16px",
      color: "#ffe9a0",
    });
    this.shown = visibleRows(
      this.shelfRows(),
      0,
      SHELF_BOTTOM - SHELF_TOP,
      PITCH,
    );
    for (let i = 0; i < GALLERY_TOTAL; i++) this.shelfCell(i);
    this.setupScroll();
    if (!this.readOnly) {
      this.add.text(PACK_X, 52, "Backpack", {
        fontSize: "16px",
        color: "#ffffffcc",
      });
      for (let i = 0; i < this.state.inventory.size; i++) this.packCell(i);
      this.button(PACK_X, 400, "Collect rewards", () => this.collect());
    }
    this.add.text(
      24,
      506,
      this.readOnly
        ? "Hover a piece to read it.   Wheel or swipe: scroll.   Esc: close"
        : "Tap a pack item to donate one.   Tap a shelf piece, then a slot, to move it.   Esc: close",
      { fontSize: "13px", color: "#ffffffaa" },
    );
    this.input.on("pointerup", () => this.up());
    this.input.on("pointerupoutside", () => this.up());
    // A guest's donations go to the host; the shelf redraws when its answer arrives (note 108 group 5). The
    // read only shelf from the collections page has no counter to open.
    if (!this.readOnly) {
      followGuest(
        this,
        () => this.refresh(),
        (text) => this.note.setText(text),
      );
      closeWhenDone(this);
    }
    this.refresh();
  }

  /** Send an action through the dispatcher. `done` is the line when it worked; a guest's answer comes later. */
  private act(intent: Intent, done: string | (() => string)): void {
    const why = dispatch(this.state, intent);
    if (why !== "sent")
      this.note.setText(why ?? (typeof done === "function" ? done() : done));
    this.refresh();
  }

  private cell(
    x: number,
    y: number,
    tip: () => ItemTip | undefined,
    press: () => void,
  ): Cell {
    const box = this.add
      .rectangle(x, y, CELL, CELL, 0x000000, 0.5)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });
    box.on("pointerdown", press);
    this.tooltip.attach(box, tip, () => ({ w: 960, h: 540 }));
    const icon = this.add
      .image(x + CELL / 2, y + CELL / 2, "__DEFAULT")
      .setDisplaySize(CELL - 8, CELL - 8)
      .setVisible(false);
    return { box, icon };
  }

  private shelfCell(i: number): void {
    const x = SHELF_X + (i % SHELF_COLS) * PITCH;
    const y = SHELF_TOP + Math.floor(i / SHELF_COLS) * PITCH;
    this.shelfCells.push(
      this.cell(
        x,
        y,
        () => this.shelfTip(i),
        () => this.down(i),
      ),
    );
  }

  private shelfRows(): number {
    return Math.ceil(GALLERY_TOTAL / SHELF_COLS);
  }

  private scrollTo(offset: number): void {
    const off = clampRowOffset(offset, this.shelfRows(), this.shown);
    if (off === this.offset) return;
    this.offset = off;
    this.refresh();
  }

  /** Wheel, drag and swipe scroll the shelf when it has more rows than fit. */
  private setupScroll(): void {
    if (this.shelfRows() <= this.shown) return;
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) =>
        this.scrollTo(this.offset + (dy > 0 ? 1 : -1)),
    );
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      const t = this.touch;
      if (!t) return;
      if (!t.active && Math.abs(p.worldY - t.y) >= SWIPE_START_PX)
        t.active = true;
      if (t.active)
        this.scrollTo(
          swipeRowOffset(
            t.offset,
            p.worldY - t.y,
            PITCH,
            this.shelfRows(),
            this.shown,
          ),
        );
    });
  }

  /** A press waits for the release, so a swipe on the shelf scrolls and does not pick. */
  private down(slot: number): void {
    this.touch = {
      slot,
      y: this.input.activePointer.worldY,
      offset: this.offset,
      active: false,
    };
  }

  private up(): void {
    const t = this.touch;
    this.touch = undefined;
    if (t && !t.active) this.pressShelf(t.slot);
  }

  private packCell(i: number): void {
    const x = PACK_X + (i % PACK_COLS) * PITCH;
    const y = SHELF_TOP + Math.floor(i / PACK_COLS) * PITCH;
    this.packCells.push(
      this.cell(
        x,
        y,
        () => {
          const id = this.state.inventory.slot(i)?.id;
          if (!id) return undefined;
          const tip = itemTip(id);
          return canDonate(this.state, id)
            ? { ...tip, text: `${tip.text}\nDunmar will take this.` }
            : tip;
        },
        () => this.pressPack(i),
      ),
    );
  }

  private button(x: number, y: number, label: string, run: () => void): void {
    this.add
      .rectangle(x, y, 160, 44, 0xa0482e, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    this.add
      .text(x + 80, y + 22, label, { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5);
  }

  private shelfTip(i: number): ItemTip | undefined {
    const slot = shelf(this.state)[i]!;
    if (slot.id) {
      const tip = itemTip(slot.id);
      const group = galleryEntry(slot.id)?.group ?? "mineral";
      return {
        ...tip,
        text: `${tip.text}\nDonated to the gallery (${group}).`,
      };
    }
    if (slot.ghost)
      return {
        name: "?",
        kind: "Not yet donated",
        text: "Dunmar can tell more if it is donated.",
      };
    return undefined;
  }

  private pressShelf(i: number): void {
    if (this.readOnly) return;
    const slot = shelf(this.state)[i]!;
    if (this.picked === undefined) {
      if (slot.id) this.picked = i;
    } else {
      const from = shelf(this.state)[this.picked]!;
      const picked = this.picked;
      this.picked = undefined;
      if (from.id && i !== picked) {
        this.act({ kind: "gallery-place", item: from.id, slot: i }, "");
        return;
      }
    }
    this.refresh();
  }

  private pressPack(i: number): void {
    const id = this.state.inventory.slot(i)?.id;
    if (!id) return;
    // The extras read the state after the host's own donation lands (a guest's lands later).
    const fruitBefore = hasFlag(this.state, SOURCE_FLAGS.gallery);
    this.act({ kind: "gallery-donate", item: id }, () => {
      const fruit = hasFlag(this.state, SOURCE_FLAGS.gallery) && !fruitBefore;
      return (
        donateLine(splitQuality(id).base) +
        (fruit ? " You feel a warm gift settle in you." : "") +
        (claimable(this.state).length > 0 ? " Rewards wait." : "")
      );
    });
  }

  private collect(): void {
    this.act(
      { kind: "gallery-claim" },
      "Dunmar hands over what you have earned.",
    );
  }

  private refresh(): void {
    const waiting = claimable(this.state).length;
    this.head.setText(
      `${donatedCount(this.state)} of ${GALLERY_TOTAL} donated` +
        (!this.readOnly && waiting > 0 ? `   ${waiting} reward(s) wait` : ""),
    );
    shelf(this.state).forEach((s, i) => {
      const c = this.shelfCells[i]!;
      const id = s.id ?? s.ghost;
      const key = id ? iconKey(id) : undefined;
      const on = inWindow(i, SHELF_COLS, this.offset, this.shown);
      const x = SHELF_X + (i % SHELF_COLS) * PITCH;
      const y = SHELF_TOP + (Math.floor(i / SHELF_COLS) - this.offset) * PITCH;
      c.box.setPosition(x, y).setVisible(on);
      c.icon.setPosition(x + CELL / 2, y + CELL / 2);
      c.icon.setVisible(key !== undefined && on);
      if (key) {
        c.icon.setTexture(key);
        if (s.id) c.icon.clearTint();
        else c.icon.setTint(0x000000);
        c.icon.setAlpha(s.id ? 1 : 0.7);
      }
      const picked = this.picked === i;
      c.box.setFillStyle(picked ? 0xf2d16b : 0x000000, picked ? 0.45 : 0.5);
    });
    this.packCells.forEach((c, i) => {
      const stack = this.state.inventory.slot(i);
      const key = stack ? iconKey(stack.id) : undefined;
      c.icon.setVisible(key !== undefined);
      if (key && stack) {
        c.icon.setTexture(key);
        // Items the librarian does not take are dimmed.
        c.icon.setAlpha(canDonate(this.state, stack.id) ? 1 : 0.35);
      }
    });
  }

  private close(): void {
    takeEsc(this);
    if (this.back) {
      this.scene.stop();
      this.scene.resume(this.back);
      return;
    }
    closeWindow(this);
  }
}
