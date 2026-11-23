import Phaser from "phaser";
import { isDrag } from "../core/dragscroll";
import { dateText } from "../core/calendar";
import { farmTypeById } from "../core/farmtypes";
import { itemById } from "../core/items";
import { bootsById, ringById } from "../core/equipment";
import {
  dropOnTrash,
  dropStack,
  moveStack,
  sortPack,
  splitStack,
  takeOff,
  wearFromPack,
} from "../core/packmenu";
import { QUALITY_TINT, splitQuality } from "../core/quality";
import { itemTip } from "../core/itemtip";
import { canFraction, canWaterLine } from "../core/canwater";
import { Tooltip } from "./tooltip";
import { toolOfId } from "../core/toolitems";
import type { GameState } from "../core/save";
import { iconKey, toolTierKey } from "./art";
import { frame } from "./panel";
import { STATE_KEY } from "./state";

const COLS = 12;
const CELL = 64;
const GAP = 8;
const LEFT = (960 - (COLS * (CELL + GAP) - GAP)) / 2;
const TOP = 90;
const TOOL_NAMES: Record<string, string> = {
  hoe: "Hoe",
  can: "Watering can",
  axe: "Axe",
  pickaxe: "Pickaxe",
  scythe: "Scythe",
};

/**
 * The Pack tab (note 49): the whole backpack. The tools are stacks in it (note 102).
 * Tap a stack, then tap a slot to move or swap it. Split puts half of the
 * selected stack where you tap next. Sort merges and orders; Trash destroys
 * the selected stack, asking first for anything of value.
 */
export class PackScene extends Phaser.Scene {
  private state!: GameState;
  private selected: number | undefined;
  private cursor = 0;
  private splitting = false;
  private trashAsked = false;
  private cells: {
    box: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image;
    count: Phaser.GameObjects.Text;
    back: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle;
  }[] = [];
  private tooltip!: Tooltip;
  private info!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  /** A message for the status line, shown once by the next refresh (then the line follows the stack again). */
  private flash: string | undefined;
  private splitLabel!: Phaser.GameObjects.Text;
  private trashLabel!: Phaser.GameObjects.Text;
  private trashBox!: Phaser.GameObjects.Rectangle;
  private dragIcon!: Phaser.GameObjects.Image;
  /** A mouse press on a stack, not yet a drag until the pointer moves a few pixels. */
  private press: { slot: number; x: number; y: number } | undefined;
  private dragging: number | undefined;
  private worn: {
    slot: number | "boots";
    box: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
  }[] = [];

  constructor() {
    super("pack");
  }

  init(): void {
    this.state = this.registry.get(STATE_KEY) as GameState;
    this.selected = undefined;
    this.cursor = 0;
    this.splitting = false;
    this.trashAsked = false;
    this.flash = undefined;
    this.press = undefined;
    this.dragging = undefined;
    this.cells = [];
    this.worn = [];
  }

  create(): void {
    const { message } = frame(this, "Pack", () => undefined);
    this.note = message;
    this.add.text(
      LEFT,
      56,
      "The backpack. The tools are in it too: move them, but they cannot be trashed.",
      { fontSize: "16px", color: "#ffffffcc" },
    );
    this.tooltip = new Tooltip(this);
    for (let i = 0; i < this.state.inventory.size; i++) {
      const x = LEFT + (i % COLS) * (CELL + GAP);
      const y = TOP + Math.floor(i / COLS) * (CELL + GAP);
      const box = this.add
        .rectangle(x, y, CELL, CELL, 0x000000, 0.5)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.3)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", (p: Phaser.Input.Pointer) => this.down(i, p));
      this.tooltip.attach(
        box,
        () => {
          const id = this.state.inventory.slot(i)?.id;
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
      );
      const icon = this.add
        .image(x + CELL / 2, y + CELL / 2 - 3, "__DEFAULT")
        .setDisplaySize(54, 54)
        .setVisible(false);
      const count = this.add
        .text(x + CELL - 4, y + CELL - 3, "", {
          fontSize: "14px",
          color: "#ffffff",
        })
        .setOrigin(1, 1);
      const back = this.add
        .rectangle(x + 4, y + CELL - 8, CELL - 8, 4, 0x000000, 0.7)
        .setOrigin(0)
        .setVisible(false);
      const fill = this.add
        .rectangle(x + 4, y + CELL - 8, CELL - 8, 4, 0x4aa8ff)
        .setOrigin(0)
        .setVisible(false);
      this.cells.push({ box, icon, count, back, fill });
    }

    const rows = Math.ceil(this.state.inventory.size / COLS);
    const panelY = TOP + rows * (CELL + GAP) + 12;
    this.info = this.add.text(LEFT, panelY, "", {
      fontSize: "20px",
      color: "#ffe9a0",
      lineSpacing: 6,
    });
    this.button(500, panelY, "Sort", () => this.sort());
    this.splitLabel = this.button(604, panelY, "Split", () =>
      this.toggleSplit(),
    );
    this.trashLabel = this.button(708, panelY, "Trash", () => this.trash());
    this.trashBox = this.trashLabel.getData(
      "box",
    ) as Phaser.GameObjects.Rectangle;
    this.dragIcon = this.add
      .image(0, 0, "__DEFAULT")
      .setDisplaySize(54, 54)
      .setAlpha(0.8)
      .setDepth(100)
      .setVisible(false);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.up(p));
    this.splitLabel.setText("Split");
    this.button(812, panelY, "Wear", () => this.wear());
    this.equipmentStrip(panelY + 88);
    this.button(
      812,
      panelY + 52,
      "Projects",
      () => {
        this.scene.stop("menu");
        this.scene.launch("journal", { section: "projects" });
      },
      15,
    );
    // Wrapped inside the frame; a single line ran to the right edge.
    this.add.text(
      LEFT,
      498,
      "Tap a stack, then a slot to move or swap, or drag it to a slot or Trash. Wear, Split and Sort are the buttons.   Esc or E: close   Page Up, Page Down: tabs",
      {
        fontSize: "13px",
        color: "#ffffffaa",
        wordWrap: { width: 960 - 2 * LEFT },
      },
    );

    const kb = this.input.keyboard;
    kb?.on("keydown-LEFT", () => this.moveCursor(-1));
    kb?.on("keydown-RIGHT", () => this.moveCursor(1));
    kb?.on("keydown-UP", () => this.moveCursor(-COLS));
    kb?.on("keydown-DOWN", () => this.moveCursor(COLS));
    kb?.on("keydown-ENTER", () => this.tap(this.cursor));
    this.refresh();
  }

  /** Two ring slots and the boots under the backpack (note 37). Tap a worn one to take it off. */
  private equipmentStrip(y: number): void {
    this.add.text(LEFT, y, "Worn (tap to take off):", {
      fontSize: "16px",
      color: "#ffffffcc",
    });
    (["0", "1", "boots"] as const).forEach((k, n) => {
      const slot = k === "boots" ? "boots" : Number(k);
      const x = LEFT + 230 + n * 150;
      const box = this.add
        .rectangle(x, y - 6, 140, 40, 0x000000, 0.5)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.4)
        .setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => this.takeOffSlot(slot));
      const icon = this.add
        .image(x + 20, y + 14, "__DEFAULT")
        .setDisplaySize(28, 28)
        .setVisible(false);
      const label = this.add
        .text(x + 38, y + 14, "", { fontSize: "14px", color: "#ffffff" })
        .setOrigin(0, 0.5);
      this.worn.push({ slot, box, icon, label });
    });
  }

  private wear(): void {
    const stack =
      this.selected === undefined
        ? undefined
        : this.state.inventory.slot(this.selected);
    if (!stack) {
      this.flash = "Tap a ring or boots first, then Wear.";
      this.refresh();
      return;
    }
    const r = wearFromPack(
      this.state.equipment,
      this.state.inventory,
      stack.id,
    );
    if (r === "none") this.flash = "That cannot be worn.";
    else if (r === "full") this.flash = "The pack is full.";
    else this.selected = undefined;
    this.refresh();
  }

  private takeOffSlot(slot: number | "boots"): void {
    if (!takeOff(this.state.equipment, this.state.inventory, slot))
      this.flash = "Nothing to take off, or the pack is full.";
    this.refresh();
  }

  private button(
    x: number,
    y: number,
    label: string,
    run: () => void,
    fontSize = 18,
  ): Phaser.GameObjects.Text {
    const box = this.add
      .rectangle(x, y, 94, 44, 0xa0482e, 1)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", run);
    return this.add
      .text(x + 47, y + 22, label, {
        fontSize: `${fontSize}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setData("box", box);
  }

  private moveCursor(by: number): void {
    const next = this.cursor + by;
    if (next < 0 || next >= this.state.inventory.size) return;
    this.cursor = next;
    this.refresh();
  }

  /**
   * Press on a slot. A press on a stack (mouse or touch) becomes a drag once it
   * moves a few pixels, and a tap when it lifts without moving. An empty slot
   * taps at once.
   */
  private down(i: number, p: Phaser.Input.Pointer): void {
    if (!this.state.inventory.slot(i)) {
      this.tap(i);
      return;
    }
    this.press = { slot: i, x: p.worldX, y: p.worldY };
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.press) return;
    if (this.dragging === undefined) {
      if (!isDrag(p.worldX - this.press.x, p.worldY - this.press.y)) return;
      this.dragging = this.press.slot;
      const key = iconKey(this.state.inventory.slot(this.dragging)!.id);
      if (key) this.dragIcon.setTexture(key).setDisplaySize(54, 54);
      this.dragIcon.setVisible(key !== undefined);
    }
    this.dragIcon.setPosition(p.worldX, p.worldY);
  }

  private up(p: Phaser.Input.Pointer): void {
    const press = this.press;
    this.press = undefined;
    if (!press) return;
    const from = this.dragging;
    this.dragging = undefined;
    this.dragIcon.setVisible(false);
    if (from === undefined) {
      this.tap(press.slot);
      return;
    }
    // A confirm only carries over when the same stack is dropped on Trash again.
    this.trashAsked = this.trashAsked && this.selected === from;
    this.selected = undefined;
    this.splitting = false;
    if (this.trashBox.getBounds().contains(p.worldX, p.worldY)) {
      this.trashSlotAt(from);
      return;
    }
    const to = this.cells.findIndex((c) =>
      c.box.getBounds().contains(p.worldX, p.worldY),
    );
    if (dropStack(this.state.inventory, from, to < 0 ? undefined : to)) {
      this.cursor = to;
    }
    this.refresh();
  }

  private tap(i: number): void {
    this.cursor = i;
    this.trashAsked = false;
    const inv = this.state.inventory;
    if (this.selected === undefined) {
      if (inv.slot(i)) this.selected = i;
    } else if (this.selected === i) {
      this.selected = undefined;
      this.splitting = false;
    } else {
      const from = this.selected;
      const ok = this.splitting
        ? splitStack(inv, from, i)
        : moveStack(inv, from, i);
      if (ok) {
        // After a split the stack stays selected to split again; a move lets go.
        this.selected = this.splitting && inv.slot(from) ? from : undefined;
        if (!this.selected) this.splitting = false;
      }
    }
    this.refresh();
  }

  private toggleSplit(): void {
    this.splitting = !this.splitting && this.selected !== undefined;
    this.refresh();
  }

  private sort(): void {
    this.selected = undefined;
    this.splitting = false;
    sortPack(this.state.inventory);
    this.refresh();
  }

  private trash(): void {
    if (this.selected === undefined) {
      this.flash = "Tap a stack first, then Trash.";
      this.refresh();
      return;
    }
    this.trashSlotAt(this.selected);
  }

  private trashSlotAt(i: number): void {
    const r = dropOnTrash(this.state.inventory, i, this.trashAsked, true);
    if (r.kind === "refused") {
      this.flash = "Tools cannot be thrown away.";
      this.refresh();
      return;
    }
    if (r.kind === "confirm") {
      this.selected = i;
      this.trashAsked = true;
      const stack = this.state.inventory.slot(i);
      const name = stack
        ? (itemById(splitQuality(stack.id).base)?.name ?? stack.id)
        : "this";
      this.flash = `Destroy ${name}${stack && stack.count > 1 ? ` x${stack.count}` : ""}? Drop it on Trash again, or press Trash, to confirm. Tap another slot to keep it.`;
      this.refresh();
      return;
    }
    this.selected = undefined;
    this.splitting = false;
    this.trashAsked = false;
    this.refresh();
  }

  private refresh(): void {
    const inv = this.state.inventory;
    this.cells.forEach((c, i) => {
      const stack = inv.slot(i);
      const picked = i === this.selected;
      const here = i === this.cursor;
      c.box.setFillStyle(picked ? 0xf2d16b : 0x000000, picked ? 0.45 : 0.5);
      c.box.setStrokeStyle(here ? 3 : 2, 0xffffff, here ? 1 : 0.3);
      const toolId = stack ? toolOfId(splitQuality(stack.id).base) : undefined;
      const tier = toolId
        ? ((this.state.toolTiers as Record<string, number>)[toolId] ?? 0)
        : 0;
      const plain = stack ? iconKey(stack.id) : undefined;
      const key = plain && toolId ? toolTierKey(plain, tier) : plain;
      c.icon.setVisible(key !== undefined);
      if (key) {
        c.icon.setTexture(key).setDisplaySize(54, 54);
        c.icon.setTint(QUALITY_TINT[splitQuality(stack!.id).quality]);
      }
      c.count.setText(stack && stack.count > 1 ? String(stack.count) : "");
      const isCan = stack?.id === "tool:can";
      c.back.setVisible(isCan);
      c.fill
        .setVisible(isCan && canFraction(this.state) > 0)
        .setSize(
          Math.max(1, Math.round((CELL - 8) * canFraction(this.state))),
          4,
        );
    });
    this.info.setText(
      `Funds: ${this.state.money} gold\n${dateText(this.state.day.clock.day)}\nFarm: ${farmTypeById(this.state.farmType).name}`,
    );
    const eq = this.state.equipment;
    for (const w of this.worn) {
      const id = w.slot === "boots" ? eq.wornBoots() : eq.worn()[w.slot];
      const def = id ? (ringById(id) ?? bootsById(id)) : undefined;
      const key = id ? iconKey(id) : undefined;
      w.icon.setVisible(key !== undefined);
      if (key) w.icon.setTexture(key).setDisplaySize(28, 28);
      const empty = w.slot === "boots" ? "Boots" : `Ring ${w.slot + 1}`;
      w.label.setText(def?.name ?? empty).setAlpha(def ? 1 : 0.5);
    }
    this.splitLabel.setText(this.splitting ? "Split: on" : "Split");
    this.trashLabel.setText("Trash");
    const at = this.selected ?? this.cursor;
    const stack = inv.slot(at);
    if (this.flash !== undefined) {
      this.note.setText(this.flash);
      this.flash = undefined;
    } else if (stack) {
      const { base, quality } = splitQuality(stack.id);
      const tool = toolOfId(base);
      const name = tool
        ? (TOOL_NAMES[tool] ?? tool)
        : (itemById(base)?.name ?? base);
      this.note.setText(
        `${name}${quality === "normal" ? "" : ` (${quality})`} x${stack.count}`,
      );
    } else this.note.setText("");
  }
}
