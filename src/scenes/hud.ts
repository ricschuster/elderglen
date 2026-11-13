import Phaser from "phaser";
import { heldAt, rowOf, TOOLS, TOOLBAR_SIZE, type Held } from "../core/toolbar";
import { SLOT_COUNT } from "../core/inventory";
import { iconKey as itemIcon, TOOL_ICONS } from "./art";
import { dateText } from "../core/calendar";
import { festivalToday } from "../core/festivals";
import { splitQuality } from "../core/quality";
import { itemById } from "../core/items";
import type { GameState } from "../core/save";
import { weaponById } from "../core/combat";
import type { Settings } from "../core/bindings";
import { desktopHint } from "./controls";
import { TIER_NAMES, toolAway, type Upgradable } from "../core/upgrades";

const SLOT = 44;
const GAP = 4;
const BAR_W = TOOLBAR_SIZE * (SLOT + GAP) - GAP;
// Layout is drawn for a 960 by 540 window, then each object is shifted by its
// anchor when the real window size is known (`layout`).
const BASE_W = 960;
const BASE_H = 540;
const BAR_Y = BASE_H - SLOT - 8;
/** Touch: the toolbar is a column down the left edge, with the map drawn beside it. */
const STEP = SLOT + GAP;
const COL_X = 8;
const COL_TOP = 8;
const COL_W = SLOT + 2 * COL_X;
/** A drag moves the column when the finger travels this far, in HUD units. */
const DRAG_MIN = 6;
/** The widest HUD row, toolbar and a margin, in HUD units: it must fit the window. */
export const HUD_FIT_W = BAR_W + 16;
const USE_R = 52;
const EAT_R = 36;
const HEALTH_W = 160;

const QUALITY_TINT = { normal: 0xffffff, silver: 0xc8d8ff, gold: 0xffd860 };

const TOOL_LABEL = {
  hoe: "Hoe",
  can: "Can",
  axe: "Axe",
  pickaxe: "Pickaxe",
} as const;

/** Short text for a slot, until the art pass gives items icons. */
function caption(held: Held, g: GameState): string {
  if (held.kind === "tool") {
    if (toolAway(g, held.tool)) return `${TOOL_LABEL[held.tool]} (smithy)`;
    const tier = g.toolTiers[held.tool as Upgradable];
    return tier > 0
      ? `${TIER_NAMES[tier]} ${TOOL_LABEL[held.tool].toLowerCase()}`
      : TOOL_LABEL[held.tool];
  }
  if (held.kind === "empty") return "";
  const weapon = weaponById(held.id);
  if (weapon) return weapon.short;
  return String(held.count);
}

/**
 * The on-screen interface: a status readout, the toolbar and a use button. It
 * draws from the game state and reports taps through two callbacks. Every
 * object here belongs to the UI camera.
 */
export class Hud {
  readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly status: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly healthBack: Phaser.GameObjects.Rectangle;
  private readonly healthFill: Phaser.GameObjects.Rectangle;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly hintBox: Phaser.GameObjects.Rectangle;
  private readonly slots: Phaser.GameObjects.Rectangle[] = [];
  private readonly captions: Phaser.GameObjects.Text[] = [];
  private readonly icons: Phaser.GameObjects.Image[] = [];
  private readonly heldName: Phaser.GameObjects.Text;
  private readonly rowButton: Phaser.GameObjects.Rectangle;
  private readonly rowText: Phaser.GameObjects.Text;
  private usePressed = false;
  /** Objects shifted with a window edge, and where they sit in the base layout. */
  private readonly pinned: {
    o: Phaser.GameObjects.Components.Transform;
    x: number;
    y: number;
    h: "l" | "c" | "r";
    v: "t" | "b";
  }[] = [];
  /** The HUD's size in its own units, and its scale on screen. */
  private uw = BASE_W;
  private uh = BASE_H;
  private scale = 1;
  /** The touch profile shows the on-screen buttons; desktop does not. */
  private readonly touch: boolean;
  /** Which row of backpack slots the bar is showing. */
  private row = 0;
  private hintsOn = true;
  /** Touch column: the first slot position shown, and how many fit. */
  private scrollTop = 0;
  private visibleCount = 1;
  private lastAt = -1;
  private drag: { y: number; top: number; moved: boolean } | undefined;

  constructor(
    scene: Phaser.Scene,
    onSelect: (index: number) => void,
    onUse: () => void,
    onAction: () => void,
    onSkills: () => void,
    onCraft: () => void,
    onHats: () => void,
    onRow: () => void,
    onDebug: (() => void) | undefined,
    settings: Settings,
  ) {
    this.touch = settings.profile === "touch";
    const ox = this.touch ? COL_W : 0;
    this.status = scene.add.text(16 + ox, 16, "", {
      fontSize: "24px",
      color: "#ffffff",
    });
    // The hint sits in a dark box so it reads over any ground.
    this.hint = scene.add.text(24 + ox, 122, "", {
      fontSize: "14px",
      color: "#ffffff",
    });
    this.hintBox = scene.add
      .rectangle(16 + ox, 116, 0, 0, 0x000000, 0.65)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.3);
    this.hintBox.setDepth(0);
    this.hint.setDepth(1);
    // The hint is for a keyboard; touch has the stick and the buttons, and
    // desktop has no on-screen buttons (note 45).
    this.hint.setText(this.touch ? "" : desktopHint(settings.bindings));
    this.hintsOn = settings.showHints && !this.touch;
    this.showHint();
    this.message = scene.add.text(16 + ox, 84, "", {
      fontSize: "18px",
      color: "#ffe9a0",
    });
    // One health bar, drawn only where health can be lost (note 22, decision 17).
    this.healthBack = scene.add
      .rectangle(16 + ox, 74, HEALTH_W, 8, 0x000000, 0.6)
      .setOrigin(0)
      .setStrokeStyle(1, 0xffffff, 0.5)
      .setVisible(false);
    this.healthFill = scene.add
      .rectangle(16 + ox, 74, HEALTH_W, 8, 0xd04a4a, 1)
      .setOrigin(0)
      .setVisible(false);
    this.healthText = scene.add
      .text(16 + ox + HEALTH_W + 8, 69, "", {
        fontSize: "13px",
        color: "#ffffff",
      })
      .setVisible(false);
    this.objects.push(
      this.status,
      this.healthBack,
      this.healthFill,
      this.healthText,
      this.hintBox,
      this.hint,
      this.message,
    );

    const left = (BASE_W - BAR_W) / 2;
    this.heldName = scene.add
      .text(BASE_W / 2, BAR_Y - 14, "", { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5, 1);
    this.objects.push(this.heldName);
    for (let i = 0; i < TOOLBAR_SIZE; i++) {
      const x = left + i * (SLOT + GAP);
      const box = scene.add
        .rectangle(x, BAR_Y, SLOT, SLOT, 0x000000, 0.5)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.3)
        .setInteractive({ useHandCursor: true });
      if (this.touch) {
        // A tap selects; a drag along the column scrolls it.
        box.on("pointerdown", (p: Phaser.Input.Pointer) => {
          this.drag = { y: p.y, top: this.scrollTop, moved: false };
        });
        box.on("pointerup", () => {
          const d = this.drag;
          this.drag = undefined;
          if (d && !d.moved) onSelect(this.indexOf(i));
        });
        box.on("pointerupoutside", () => (this.drag = undefined));
      } else box.on("pointerdown", () => onSelect(this.indexOf(i)));
      const text = scene.add
        .text(x + SLOT / 2, BAR_Y + SLOT - 2, "", {
          fontSize: "10px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: SLOT - 4 },
        })
        .setOrigin(0.5, 1);
      const icon = scene.add
        .image(x + SLOT / 2, BAR_Y + 15, TOOL_ICONS.hoe)
        .setVisible(false);
      this.slots.push(box);
      this.captions.push(text);
      this.icons.push(icon);
      this.objects.push(box, icon, text);
    }

    if (this.touch)
      scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        const d = this.drag;
        if (!d || !p.isDown) return;
        const dy = (p.y - d.y) / this.scale;
        if (Math.abs(dy) < DRAG_MIN && !d.moved) return;
        d.moved = true;
        this.scrollTop = d.top - Math.round(dy / STEP);
      });
    // On touch the Row button sits at the foot of the column, beside it.
    const rowX = this.touch ? COL_W + 8 : left;
    const rowY = this.touch ? BASE_H - 48 : BAR_Y - 46;
    this.rowButton = scene.add
      .rectangle(rowX, rowY, 90, 40, 0x000000, 0.5)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onRow);
    this.rowText = scene.add
      .text(rowX + 45, rowY + 20, "Row", {
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.objects.push(this.rowButton, this.rowText);

    const use = scene.add
      .circle(BASE_W - USE_R - 24, BAR_Y - USE_R - 16, USE_R, 0xf2d16b, 0.45)
      .setStrokeStyle(3, 0xffffff, 0.7)
      .setInteractive({ useHandCursor: true });
    use.on("pointerdown", () => {
      this.usePressed = true;
      onUse();
    });
    // Holding the button repeats the swing (`43_wood_source.md`).
    for (const up of ["pointerup", "pointerout", "pointerupoutside"])
      use.on(up, () => (this.usePressed = false));
    const useText = scene.add
      .text(use.x, use.y, "Use", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);
    const eat = scene.add
      .circle(use.x, use.y - USE_R - 44, EAT_R, 0x8fd18a, 0.45)
      .setStrokeStyle(3, 0xffffff, 0.7)
      .setInteractive({ useHandCursor: true });
    eat.on("pointerdown", onAction);
    const eatText = scene.add
      .text(eat.x, eat.y, "Action", { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5);
    const skills = scene.add
      .rectangle(BASE_W - 16 - 90, 16, 90, 40, 0x000000, 0.5)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true });
    skills.on("pointerdown", onSkills);
    const skillsText = scene.add
      .text(skills.x + 45, 36, "Skills", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5);
    const craft = scene.add
      .rectangle(skills.x - 96, 16, 90, 40, 0x000000, 0.5)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true });
    craft.on("pointerdown", onCraft);
    const craftText = scene.add
      .text(craft.x + 45, 36, "Craft", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5);
    const hats = scene.add
      .rectangle(craft.x - 96, 16, 90, 40, 0x000000, 0.5)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true });
    hats.on("pointerdown", onHats);
    const hatsText = scene.add
      .text(hats.x + 45, 36, "Hats", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5);
    this.objects.push(
      use,
      useText,
      eat,
      eatText,
      skills,
      skillsText,
      craft,
      craftText,
      hats,
      hatsText,
    );
    if (this.touch) {
      // The column is placed from the top in `update`; only these ride the foot.
      this.heldName.setOrigin(0, 1).setPosition(COL_W + 8, BASE_H - 56);
      this.pin("l", "b", [this.heldName, this.rowButton, this.rowText]);
    } else
      this.pin("c", "b", [
        this.heldName,
        ...this.slots,
        ...this.captions,
        ...this.icons,
        this.rowButton,
        this.rowText,
      ]);
    this.pin("r", "b", [use, useText, eat, eatText]);
    this.pin("r", "t", [skills, skillsText, craft, craftText, hats, hatsText]);
    // Tap-to-move has no Use button: a tap on the tile beside the farmer uses
    // the held tool (note 27).
    if (this.touch && settings.touchScheme === "tap") {
      use.setVisible(false).disableInteractive();
      useText.setVisible(false);
      // Every Action job has a tap target too (note 27).
      eat.setVisible(false).disableInteractive();
      eatText.setVisible(false);
    }
    if (!this.touch)
      for (const o of [
        use,
        useText,
        eat,
        eatText,
        skills,
        skillsText,
        craft,
        craftText,
        hats,
        hatsText,
      ])
        o.setVisible(false).disableInteractive();
    // Dev builds only: the debug menu's touch button (`42_debug_menu.md`).
    if (onDebug && this.touch && import.meta.env.DEV) {
      const dbg = scene.add
        .rectangle(skills.x, 64, 90, 40, 0x000000, 0.5)
        .setOrigin(0)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setInteractive({ useHandCursor: true });
      dbg.on("pointerdown", onDebug);
      const dbgText = scene.add
        .text(dbg.x + 45, 84, "DBG", { fontSize: "18px", color: "#ffffff" })
        .setOrigin(0.5);
      this.objects.push(dbg, dbgText);
      this.pin("r", "t", [dbg, dbgText]);
    }
  }

  /** Anchor objects to the horizontal centre or right, and top or bottom. */
  private pin(
    h: "l" | "c" | "r",
    v: "t" | "b",
    list: Phaser.GameObjects.Components.Transform[],
  ): void {
    for (const o of list) this.pinned.push({ o, x: o.x, y: o.y, h, v });
  }

  /**
   * Lay the HUD out in a window of `uw` by `uh` HUD units, shown at `scale`.
   * The status readout stays top left; the toolbar sits bottom centre, the
   * buttons bottom right and top right.
   */
  layout(uw: number, uh: number, scale: number): void {
    this.uw = uw;
    this.uh = uh;
    this.scale = scale;
    const dx = uw - BASE_W;
    const dy = uh - BASE_H;
    this.visibleCount = Math.max(
      1,
      Math.floor((uh - 2 * COL_TOP + GAP) / STEP),
    );
    for (const p of this.pinned) {
      p.o.x = p.x + (p.h === "l" ? 0 : p.h === "c" ? dx / 2 : dx);
      p.o.y = p.y + (p.v === "b" ? dy : 0);
    }
  }

  /** Show or hide the control hint box. Touch has no keyboard hint. */
  setHintsShown(on: boolean): void {
    this.hintsOn = on && !this.touch;
    this.showHint();
  }

  private showHint(): void {
    const on = this.hintsOn;
    this.hint.setVisible(on);
    this.hintBox.setVisible(on);
    this.hintBox.setSize(this.hint.width + 16, this.hint.height + 12);
  }

  /** Screen pixels the toolbar column takes from the left edge: touch only. */
  insetLeft(scale: number): number {
    return this.touch ? COL_W * scale : 0;
  }

  /** True while a finger or the mouse holds the Use button. */
  get useHeld(): boolean {
    return this.usePressed;
  }

  /** The toolbar index that bar slot i stands for, given the row shown. */
  private indexOf(i: number): number {
    return i < TOOLS.length ? i : i + this.row * SLOT_COUNT;
  }

  /** True if a screen point falls on the toolbar, which owns its touches. */
  covers(x: number, y: number): boolean {
    const ux = x / this.scale;
    const uy = y / this.scale;
    // On touch the whole left strip is the toolbar's; the map starts beside it.
    if (this.touch) return ux <= COL_W;
    const left = (this.uw - BAR_W) / 2;
    return uy >= BAR_Y + (this.uh - BASE_H) && ux >= left && ux <= left + BAR_W;
  }

  update(
    g: GameState,
    selected: number,
    message: string,
    showHealth = false,
  ): void {
    const { health } = g.combat;
    this.healthBack.setVisible(showHealth);
    this.healthFill.setVisible(showHealth);
    this.healthText.setVisible(showHealth);
    if (showHealth) {
      this.healthFill.width = Math.max(
        0,
        (HEALTH_W * health.current) / health.max,
      );
      this.healthText.setText(
        `${Math.ceil(health.current)}/${health.max} ${g.combat.effects.describe()}`.trim(),
      );
    }
    const { clock, energy } = g.day;
    this.status.setText(
      `${dateText(clock.day)}  ${clock.format()}${festivalToday(clock.day) ? "  Festival" : ""}\nEnergy ${Math.ceil(energy.current)}  ${g.money}g`,
    );
    this.message.setText(message);
    const now = heldAt(g, selected);
    this.heldName.setText(
      now.kind === "item" ? (itemById(now.id)?.name ?? now.id) : "",
    );
    if (selected >= TOOLS.length) this.row = rowOf(selected);
    const multiRow = g.inventory.size > SLOT_COUNT;
    this.rowButton.setVisible(multiRow && this.touch);
    this.rowText.setVisible(multiRow && this.touch);
    // The tools sit on the first row only; later rows show backpack slots.
    const order: number[] = [];
    for (let i = 0; i < this.slots.length; i++)
      if (this.row === 0 || i >= TOOLS.length) order.push(i);
    if (this.touch) {
      // Keep the held slot in view, then clamp the scroll to the column.
      const at = order.indexOf(
        this.slots.findIndex((_, i) => this.indexOf(i) === selected),
      );
      if (at >= 0 && at !== this.lastAt) {
        if (at < this.scrollTop) this.scrollTop = at;
        if (at >= this.scrollTop + this.visibleCount)
          this.scrollTop = at - this.visibleCount + 1;
      }
      this.lastAt = at;
      const most = Math.max(0, order.length - this.visibleCount);
      this.scrollTop = Math.min(most, Math.max(0, this.scrollTop));
    }
    this.slots.forEach((box, i) => {
      const index = this.indexOf(i);
      let shown = this.row === 0 || i >= TOOLS.length;
      if (this.touch) {
        const k = order.indexOf(i) - this.scrollTop;
        shown = shown && k >= 0 && k < this.visibleCount;
        const y = COL_TOP + k * STEP;
        box.setPosition(COL_X, y);
        this.icons[i]!.setPosition(COL_X + SLOT / 2, y + 15);
        this.captions[i]!.setPosition(COL_X + SLOT / 2, y + SLOT - 2);
      }
      box.setVisible(shown);
      this.icons[i]!.setVisible(shown);
      this.captions[i]!.setVisible(shown);
      const on = index === selected;
      box.setStrokeStyle(on ? 3 : 2, 0xffffff, on ? 1 : 0.3);
      box.setFillStyle(on ? 0xf2d16b : 0x000000, on ? 0.45 : 0.5);
      const held = heldAt(g, index);
      const iconKey =
        held.kind === "tool"
          ? TOOL_ICONS[held.tool]
          : held.kind === "item"
            ? itemIcon(held.id)
            : undefined;
      const icon = this.icons[i]!;
      icon.setVisible(shown && iconKey !== undefined);
      if (iconKey) icon.setTexture(iconKey);
      const quality =
        held.kind === "item" ? splitQuality(held.id).quality : "normal";
      icon.setTint(QUALITY_TINT[quality]);
      this.captions[i]!.setText(caption(held, g));
    });
  }
}
