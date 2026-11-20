import Phaser from "phaser";
import { CHEST_COLOURS } from "../core/chestdefs";
import { chestById, colourChest, type PlacedChest } from "../core/chests";
import { campChestContents, campChestMove } from "../core/camp";
import { Inventory } from "../core/inventory";
import { itemById } from "../core/items";
import { reasonText } from "../core/tools";
import type { FarmScene } from "./FarmScene";
import {
  TOUCH_CELL,
  clampRowOffset,
  SWIPE_START_PX,
  swipeRowOffset,
  fillStacks,
  inWindow,
  pressActions,
  quickMove,
  transfer,
  visibleRows,
} from "../core/chestmenu";
import { chestTip, itemTip } from "../core/itemtip";
import { sortPack } from "../core/packmenu";
import { orderById } from "../core/orders";
import { splitQuality } from "../core/quality";
import { toolOfId } from "../core/toolitems";
import type { GameState } from "../core/save";
import { canWaterLine } from "../core/canwater";
import { iconKey, toolTierKey } from "./art";
import { frame } from "./panel";
import { STATE_KEY } from "./state";
import { Tooltip } from "./tooltip";

type Side = "chest" | "pack";

const COLS = 12;
const LEFT = 24;
const TOP = 70;
const BOTTOM = 478;
const GAP = 4;
const PITCH = TOUCH_CELL + GAP;
const LONG_PRESS_MS = 450;
const LABEL = 22;
const TINT = { normal: 0xffffff, silver: 0xc8d8ff, gold: 0xffd860 };

interface Cell {
  box: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  count: Phaser.GameObjects.Text;
}

/**
 * A chest's contents (note 34, as Stardew shows it): the chest's slots above,
 * the backpack's below. Tap a stack then a slot, or drag it, to move it across
 * (a different item swaps); Split moves half. Add to existing stacks tops up what the
 * chest already holds, Organize tidies the chest. Space sends the stack under the
 * cursor to the other side. The farm is paused behind this screen.
 */
export class ChestScene extends Phaser.Scene {
  private state!: GameState;
  private chest!: PlacedChest;
  private note!: Phaser.GameObjects.Text;
  private tooltip!: Tooltip;
  private cells: Record<Side, Cell[]> = { chest: [], pack: [] };
  private selected: { side: Side; slot: number } | undefined;
  private cursor: { side: Side; slot: number } = { side: "chest", slot: 0 };
  private splitting = false;
  private splitLabel!: Phaser.GameObjects.Text;
  private press: { side: Side; slot: number; x: number; y: number } | undefined;
  private dragging: { side: Side; slot: number } | undefined;
  private dragIcon!: Phaser.GameObjects.Image;
  /** Chest rows on screen, the first one shown, and where each grid starts. */
  private shown = 1;
  private offset = 0;
  private chestTop = 0;
  private menu: Phaser.GameObjects.GameObject[] = [];
  /** A touch on the chest grid that may become a vertical swipe. */
  private swipe: { y: number; offset: number; active: boolean } | undefined;
  private pressTimer: Phaser.Time.TimerEvent | undefined;
  private chestName = "Chest";
  /** Set for the mine camp chest: a take-only screen over a stand-in chest (note 22). */
  private camp: number | undefined;
  private found: string | undefined;

  constructor() {
    super("chest");
  }

  init(data: { mapId?: string; x?: number; y?: number; camp?: number }): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.camp = data.camp;
    this.found = undefined;
    if (data.camp !== undefined) {
      const items = new Inventory(1, 1);
      const gift = campChestContents(this.state, data.camp);
      if (gift) items.add(gift, 1);
      this.chest = { map: "", x: 0, y: 0, id: "big-chest", items };
    } else {
      const c = this.state.chests.get(
        data.mapId ?? "",
        data.x ?? 0,
        data.y ?? 0,
      );
      if (!c) throw new Error("no chest there");
      this.chest = c;
    }
    this.cells = { chest: [], pack: [] };
    this.selected = undefined;
    this.cursor = { side: "chest", slot: 0 };
    this.splitting = false;
    this.press = undefined;
    this.dragging = undefined;
    this.offset = 0;
    this.menu = [];
    this.pressTimer = undefined;
  }

  private inv(side: Side): Inventory {
    return side === "chest" ? this.chest.items : this.state.inventory;
  }

  create(): void {
    const bound = this.chest.order ? orderById(this.chest.order) : undefined;
    const name =
      this.camp !== undefined
        ? "Camp Chest"
        : bound
          ? `${bound.title} chest${this.chest.closed ? " (ended)" : ""}`
          : (chestById(this.chest.id)?.name ?? "Chest");
    const { message } = frame(this, name, () => this.close());
    this.note = message;
    this.tooltip = new Tooltip(this);

    this.chestName = name;
    const pitch = PITCH;
    const cell = TOUCH_CELL;
    const chestRows = Math.ceil(this.chest.items.size / COLS);
    const packRows = Math.ceil(this.state.inventory.size / COLS);
    // Cells never shrink below a finger; a big chest scrolls instead.
    this.shown = visibleRows(
      chestRows,
      packRows,
      BOTTOM - TOP - 2 * LABEL - 16,
      pitch,
    );
    let y = TOP;
    for (const side of ["chest", "pack"] as const) {
      const title = this.add.text(
        LEFT,
        y,
        side === "chest" ? name : "Backpack",
        { fontSize: "15px", color: "#ffffffcc" },
      );
      if (side === "chest") this.chestTitleTip(title);
      y += LABEL;
      if (side === "chest") this.chestTop = y;
      this.grid(side, y, pitch, cell);
      const rowsHere = side === "chest" ? this.shown : packRows;
      y += rowsHere * pitch + 8;
    }

    if (this.camp === undefined) this.colourBar(TOP);
    this.input.mouse?.disableContextMenu();

    const bx = LEFT + COLS * pitch + 16;
    if (chestRows > this.shown) {
      this.button(bx, TOP + LABEL + 156, "Scroll up", () => this.scroll(-1));
      this.button(bx, TOP + LABEL + 208, "Scroll down", () => this.scroll(1));
      this.input.on(
        "wheel",
        (_p: unknown, _o: unknown, _dx: number, dy: number) =>
          this.scroll(dy > 0 ? 1 : -1),
      );
    }
    if (this.camp === undefined) {
      this.button(bx, TOP + LABEL, "Add to existing stacks", () => this.fill());
      this.button(bx, TOP + LABEL + 52, "Organize", () => this.sort());
    }
    this.splitLabel = this.button(bx, TOP + LABEL + 104, "Split", () => {
      if (this.camp !== undefined) return;
      this.splitting = !this.splitting;
      this.say("");
      this.refresh();
    });
    if (this.camp !== undefined) {
      this.splitLabel.setVisible(false);
      this.say(
        this.chest.items.slot(0)
          ? "Tap the gift to take it."
          : "The chest is empty.",
      );
    }

    this.dragIcon = this.add
      .image(0, 0, "__DEFAULT")
      .setDisplaySize(cell - 6, cell - 6)
      .setAlpha(0.8)
      .setDepth(100)
      .setVisible(false);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.move(p));
    this.layoutChest();
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.up(p));

    // Wrapped to stop short of the Close button at the right edge.
    this.add.text(
      LEFT,
      492,
      "Tap a stack, then a slot (or drag it).  Press and hold, or right-click: send one (Shift: half).  Split: half moves.  Space: send all.  Tab: other grid.  Esc: close",
      { fontSize: "13px", color: "#ffffffaa", wordWrap: { width: 790 } },
    );
    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => this.step(-1, 0));
    kb?.on("keydown-RIGHT", () => this.step(1, 0));
    kb?.on("keydown-UP", () => this.step(0, -1));
    kb?.on("keydown-DOWN", () => this.step(0, 1));
    kb?.on("keydown-TAB", (e: KeyboardEvent) => {
      e.preventDefault();
      this.cursor = {
        side: this.cursor.side === "chest" ? "pack" : "chest",
        slot: 0,
      };
      this.refresh();
    });
    kb?.on("keydown-ENTER", () => this.tap(this.cursor.side, this.cursor.slot));
    kb?.on("keydown-SPACE", () =>
      this.send(this.cursor.side, this.cursor.slot),
    );
    this.refresh();
  }

  /** The colour bar: the original, then 20 colours, on the chest's title line. Free to change. */
  private colourBar(y: number): void {
    const size = 16;
    const x0 = LEFT + 300;
    const swatches: Phaser.GameObjects.Rectangle[] = [];
    const mark = () =>
      swatches.forEach((r, n) =>
        r.setStrokeStyle(
          (this.chest.colour ?? 0) === n ? 3 : 1,
          0xffffff,
          (this.chest.colour ?? 0) === n ? 1 : 0.5,
        ),
      );
    for (let n = 0; n <= CHEST_COLOURS.length; n++) {
      const r = this.add
        .rectangle(
          x0 + n * (size + 4),
          y + 1,
          size,
          size,
          n === 0 ? 0x8a5a2a : CHEST_COLOURS[n - 1]!,
        )
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          colourChest(this.chest, n);
          mark();
        });
      swatches.push(r);
    }
    mark();
  }

  private grid(side: Side, top: number, pitch: number, cell: number): void {
    const inv = this.inv(side);
    for (let i = 0; i < inv.size; i++) {
      const x = LEFT + (i % COLS) * pitch;
      const y = top + Math.floor(i / COLS) * pitch;
      const box = this.add
        .rectangle(x, y, cell, cell, 0x000000, 0.5)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.3)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", (p: Phaser.Input.Pointer) => this.down(side, i, p));
      this.tooltip.attach(
        box,
        () => {
          const id = inv.slot(i)?.id;
          if (!id) return undefined;
          const base = splitQuality(id).base;
          const tiers = this.state.toolTiers as Record<string, number>;
          return itemTip(
            id,
            base.startsWith("tool:") ? (tiers[base.slice(5)] ?? 0) : 0,
            base === "tool:can" ? canWaterLine(this.state) : undefined,
          );
        },
        () => ({ w: 960, h: 540 }),
        false,
      );
      const icon = this.add
        .image(x + cell / 2, y + cell / 2 - 2, "__DEFAULT")
        .setDisplaySize(cell - 8, cell - 8)
        .setVisible(false);
      const count = this.add
        .text(x + cell - 3, y + cell - 2, "", {
          fontSize: "13px",
          color: "#ffffff",
        })
        .setOrigin(1, 1);
      this.cells[side].push({ box, icon, count });
    }
  }

  private button(
    x: number,
    y: number,
    label: string,
    run: () => void,
  ): Phaser.GameObjects.Text {
    this.add
      .rectangle(x, y, 132, 44, 0xa0482e, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    return this.add
      .text(x + 66, y + 22, label, {
        fontSize: label.length > 12 ? "13px" : "18px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 120 },
      })
      .setOrigin(0.5);
  }

  private say(text: string): void {
    this.note.setText(text);
  }

  private step(dx: number, dy: number): void {
    const { side, slot } = this.cursor;
    const size = this.inv(side).size;
    if (dy !== 0) {
      const next = slot + dy * COLS;
      if (next >= 0 && next < size) this.cursor = { side, slot: next };
      else {
        // Off the end of one grid onto the other, in the same column.
        const col = slot % COLS;
        if (side === "chest" && dy > 0)
          this.cursor = { side: "pack", slot: col };
        else if (side === "pack" && dy < 0) {
          const last = this.chest.items.size - 1;
          this.cursor = {
            side: "chest",
            slot: Math.min(last, Math.floor(last / COLS) * COLS + col),
          };
        }
      }
    } else {
      const next = slot + dx;
      if (next >= 0 && next < size) this.cursor = { side, slot: next };
    }
    if (this.cursor.side === "chest") this.showSlot(this.cursor.slot);
    this.refresh();
  }

  /** Scroll the chest grid so a slot's row is on screen. */
  private showSlot(slot: number): void {
    const row = Math.floor(slot / COLS);
    if (row < this.offset) this.offset = row;
    else if (row >= this.offset + this.shown)
      this.offset = row - this.shown + 1;
    this.layoutChest();
  }

  private scroll(dir: number): void {
    this.offset = clampRowOffset(
      this.offset + dir,
      Math.ceil(this.chest.items.size / COLS),
      this.shown,
    );
    this.layoutChest();
    this.refresh();
  }

  /** Place the chest's cells for the current scroll; rows outside the window hide. */
  private layoutChest(): void {
    this.cells.chest.forEach((c, i) => {
      const on = inWindow(i, COLS, this.offset, this.shown);
      const x = LEFT + (i % COLS) * PITCH;
      const y = this.chestTop + (Math.floor(i / COLS) - this.offset) * PITCH;
      c.box.setPosition(x, y).setVisible(on);
      c.icon.setPosition(x + TOUCH_CELL / 2, y + TOUCH_CELL / 2 - 2);
      c.count.setPosition(x + TOUCH_CELL - 3, y + TOUCH_CELL - 2);
      if (!on) {
        c.icon.setVisible(false);
        c.count.setVisible(false);
      }
    });
  }

  /** Hover or long-press on the chest's title: what it holds and is worth. */
  private chestTitleTip(title: Phaser.GameObjects.Text): void {
    title.setInteractive();
    const tip = new Tooltip(this);
    const open = () => {
      const b = title.getBounds();
      tip.show(
        chestTip(this.chestName, this.chest.items.save()),
        { x: b.x, y: b.y, w: b.width, h: b.height },
        { w: 960, h: 540 },
      );
    };
    let timer: Phaser.Time.TimerEvent | undefined;
    const close = () => {
      timer?.remove();
      timer = undefined;
      tip.hide();
    };
    title.on("pointerover", (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) open();
    });
    title.on("pointerout", close);
    title.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) timer = this.time.delayedCall(LONG_PRESS_MS, open);
    });
    title.on("pointerup", close);
    title.on("pointerupoutside", close);
  }

  /** The touch long-press menu: send one, half or all, as right-click does. */
  private openMenu(side: Side, slot: number, px: number, py: number): void {
    this.closeMenu();
    const stack = this.inv(side).slot(slot);
    if (!stack) return;
    const acts = pressActions(stack.count);
    const w = 180;
    const h = acts.length * (TOUCH_CELL + 4) + 8;
    const x = Math.max(4, Math.min(960 - w - 4, px - w / 2));
    const y = Math.max(4, Math.min(540 - h - 4, py - h - 10));
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.menu.push(o);
      return o;
    };
    add(
      this.add
        .rectangle(0, 0, 960, 540, 0x000000, 0.01)
        .setOrigin(0)
        .setDepth(300)
        .setInteractive()
        .on("pointerdown", () => this.closeMenu()),
    );
    add(
      this.add
        .rectangle(x, y, w, h, 0x201810, 0.95)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.7)
        .setDepth(301),
    );
    acts.forEach((a, n) => {
      const by = y + 6 + n * (TOUCH_CELL + 4);
      add(
        this.add
          .rectangle(x + 6, by, w - 12, TOUCH_CELL, 0xa0482e, 1)
          .setOrigin(0)
          .setDepth(302)
          .setInteractive()
          .on("pointerdown", () => {
            this.closeMenu();
            this.sendSome(side, slot, a.most);
          }),
      );
      add(
        this.add
          .text(x + w / 2, by + TOUCH_CELL / 2, a.label, {
            fontSize: "16px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
          .setDepth(303),
      );
    });
  }

  private closeMenu(): void {
    for (const o of this.menu) o.destroy();
    this.menu = [];
  }

  /** A mouse press on a stack may become a drag; a touch or an empty slot taps at once. */
  private down(side: Side, slot: number, p: Phaser.Input.Pointer): void {
    if (p.rightButtonDown()) {
      // Right-click sends one, Shift with it half (Stardew, SC-192).
      const a = this.inv(side).slot(slot);
      if (a)
        this.sendSome(
          side,
          slot,
          p.event.shiftKey ? Math.ceil(a.count / 2) : 1,
        );
      return;
    }
    const scrollable = Math.ceil(this.chest.items.size / COLS) > this.shown;
    const swipeable = p.wasTouch && side === "chest" && scrollable;
    if (swipeable)
      this.swipe = { y: p.worldY, offset: this.offset, active: false };
    if (!this.inv(side).slot(slot) && !swipeable) {
      this.tap(side, slot);
      return;
    }
    this.press = { side, slot, x: p.worldX, y: p.worldY };
    if (p.wasTouch && this.inv(side).slot(slot)) {
      // A long press opens the send menu; a short one still taps.
      this.pressTimer?.remove();
      this.pressTimer = this.time.delayedCall(LONG_PRESS_MS, () => {
        const pr = this.press;
        if (!pr || this.dragging) return;
        this.press = undefined;
        this.openMenu(pr.side, pr.slot, p.worldX, p.worldY);
      });
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    const sw = this.swipe;
    if (sw && !sw.active && this.press && !this.dragging) {
      if (Math.abs(p.worldY - sw.y) >= SWIPE_START_PX) {
        // A vertical drag scrolls: it ends the press, so no long press or tap.
        sw.active = true;
        this.pressTimer?.remove();
        this.press = undefined;
      }
    }
    if (sw?.active) {
      const off = swipeRowOffset(
        sw.offset,
        p.worldY - sw.y,
        PITCH,
        Math.ceil(this.chest.items.size / COLS),
        this.shown,
      );
      if (off !== this.offset) {
        this.offset = off;
        this.layoutChest();
        this.refresh();
      }
      return;
    }
    if (!this.press) return;
    if (!this.dragging) {
      if (Math.hypot(p.worldX - this.press.x, p.worldY - this.press.y) < 6)
        return;
      this.dragging = { side: this.press.side, slot: this.press.slot };
      const id = this.inv(this.dragging.side).slot(this.dragging.slot)!.id;
      const key = iconKey(id);
      if (key) this.dragIcon.setTexture(key);
      this.dragIcon.setVisible(key !== undefined);
    }
    this.dragIcon.setPosition(p.worldX, p.worldY);
  }

  private up(p: Phaser.Input.Pointer): void {
    this.pressTimer?.remove();
    this.swipe = undefined;
    const press = this.press;
    this.press = undefined;
    if (!press) return;
    const from = this.dragging;
    this.dragging = undefined;
    this.dragIcon.setVisible(false);
    if (!from) {
      this.tap(press.side, press.slot);
      return;
    }
    this.selected = undefined;
    this.splitting = false;
    for (const side of ["chest", "pack"] as const) {
      const to = this.cells[side].findIndex(
        (c) => c.box.visible && c.box.getBounds().contains(p.worldX, p.worldY),
      );
      if (to >= 0) {
        this.put(from, { side, slot: to }, false);
        return;
      }
    }
    this.refresh();
  }

  private put(
    from: { side: Side; slot: number },
    to: { side: Side; slot: number },
    half: boolean,
  ): boolean {
    if (this.camp !== undefined) {
      this.campTake(from.side);
      return false;
    }
    const ok = transfer(
      this.inv(from.side),
      from.slot,
      this.inv(to.side),
      to.slot,
      { half, chestSide: this.chest.items },
    );
    this.say(ok ? "" : "That will not go there.");
    this.refresh();
    return ok;
  }

  private tap(side: Side, slot: number): void {
    this.cursor = { side, slot };
    if (this.camp !== undefined) {
      if (side === "chest" && this.inv(side).slot(slot)) this.campTake("chest");
      return;
    }
    const sel = this.selected;
    if (!sel) {
      if (this.inv(side).slot(slot)) this.selected = { side, slot };
    } else if (sel.side === side && sel.slot === slot) {
      this.selected = undefined;
      this.splitting = false;
    } else {
      const ok = this.put(sel, { side, slot }, this.splitting);
      const left = this.inv(sel.side).slot(sel.slot);
      // After a split the stack stays selected to split again; a move lets go.
      if (!(ok && this.splitting && left)) {
        this.selected = undefined;
        this.splitting = false;
      }
    }
    this.refresh();
  }

  /** Send the stack in a slot to the other grid. */
  private send(side: Side, slot: number): void {
    this.sendSome(side, slot, Infinity);
  }

  /** A take-only move: the gift comes out through the camp rules, nothing goes in. */
  private campTake(from: Side): void {
    const floor = this.camp!;
    const r = campChestMove(this.state, floor, from);
    this.selected = undefined;
    if (r.ok && r.item) {
      this.chest.items.remove(r.item, 1);
      const name = itemById(r.item)?.name ?? r.item;
      this.found = `You found ${name}.`;
      this.say(this.found);
    } else if (!r.ok) this.say(reasonText(r.reason));
    this.refresh();
  }

  private sendSome(side: Side, slot: number, most: number): void {
    if (this.camp !== undefined) {
      this.campTake(side);
      return;
    }
    const other: Side = side === "chest" ? "pack" : "chest";
    const n = quickMove(
      this.inv(side),
      slot,
      this.inv(other),
      this.chest.items,
      most,
    );
    this.selected = undefined;
    this.splitting = false;
    this.say(n > 0 ? "" : "Nothing moved: no room, or a tool.");
    this.refresh();
  }

  private fill(): void {
    const n = fillStacks(this.state.inventory, this.chest.items);
    this.say(n > 0 ? `Filled ${n} into the chest.` : "Nothing to fill.");
    this.refresh();
  }

  private sort(): void {
    this.selected = undefined;
    sortPack(this.chest.items);
    this.refresh();
  }

  private refresh(): void {
    for (const side of ["chest", "pack"] as const) {
      const inv = this.inv(side);
      this.cells[side].forEach((c, i) => {
        const stack = inv.slot(i);
        const picked = this.selected?.side === side && this.selected.slot === i;
        const here = this.cursor.side === side && this.cursor.slot === i;
        if (side === "chest" && !c.box.visible) return;
        c.box.setFillStyle(picked ? 0xf2d16b : 0x000000, picked ? 0.45 : 0.5);
        c.box.setStrokeStyle(here ? 3 : 2, 0xffffff, here ? 1 : 0.3);
        const toolId = stack
          ? toolOfId(splitQuality(stack.id).base)
          : undefined;
        const tier = toolId
          ? ((this.state.toolTiers as Record<string, number>)[toolId] ?? 0)
          : 0;
        const plain = stack ? iconKey(stack.id) : undefined;
        const key = plain && toolId ? toolTierKey(plain, tier) : plain;
        c.icon.setVisible(key !== undefined);
        if (key) {
          c.icon.setTexture(key);
          c.icon.setTint(TINT[splitQuality(stack!.id).quality]);
        }
        c.count.setText(stack && stack.count > 1 ? String(stack.count) : "");
      });
    }
    this.splitLabel.setText(this.splitting ? "Split: on" : "Split");
    if (this.splitting)
      this.say(
        this.selected
          ? "Split is on: tap where half of that stack should go."
          : "Split is on: tap a stack, then where half of it should go.",
      );
    else if (this.note.text.startsWith("Split is on")) this.say("");
  }

  private close(): void {
    this.scene.stop();
    this.scene.resume("farm");
    if (this.camp !== undefined)
      (this.scene.get("farm") as FarmScene).campClosed(this.found);
  }
}
